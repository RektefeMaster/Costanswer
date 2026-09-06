/**
 * Choosing where one lead goes.
 *
 * The order of the checks is the design. Payout is consulted last and only
 * among campaigns that have already passed every other gate, because a router
 * that sorts by payout first and filters afterwards will, on the day a
 * high-paying campaign is out of coverage, quietly pick it anyway through
 * whatever the fallback path happens to be. Sorting last makes that impossible
 * rather than unlikely.
 *
 *     eligible  ->  compliant  ->  available  ->  quality fit  ->  economics
 *
 * The output is one selected campaign. Not a list to blast. A fallback exists,
 * but it is a second attempt after a hard failure, permitted only when the
 * first campaign's own terms allow it and the consumer was told more than one
 * partner might receive the request.
 */
import type { LeadCampaign } from './campaigns';
import { campaignCoversLocation } from './campaigns';
import type { LeadQualification, LeadRequest } from './types';

export type ProviderHealth = {
  readonly providerId: string;
  readonly state: 'unknown' | 'healthy' | 'degraded' | 'down';
  readonly consecutiveFailures: number;
};

export type CampaignUsage = {
  readonly campaignId: string;
  readonly acceptedToday: number;
  readonly acceptedThisHour: number;
  readonly recentRejectionRate: number;
};

export type RoutingInput = {
  readonly vertical: string;
  readonly location: { state?: string; zip?: string };
  readonly qualification: LeadQualification;
  readonly qualityScore: number;
  readonly campaigns: readonly LeadCampaign[];
  readonly health: ReadonlyMap<string, ProviderHealth>;
  readonly usage: ReadonlyMap<string, CampaignUsage>;
  readonly enabledProviderIds: ReadonlySet<string>;
  /** Partners the consent text actually named. A campaign not named cannot receive. */
  readonly disclosedPartnerNames: ReadonlySet<string>;
};

export type RejectionReason =
  | 'vertical_mismatch'
  | 'campaign_inactive'
  | 'provider_disabled'
  | 'out_of_coverage'
  | 'missing_required_field'
  | 'partner_not_disclosed'
  | 'daily_cap_reached'
  | 'hourly_cap_reached'
  | 'provider_down'
  | 'below_quality_floor';

export type CampaignEvaluation = {
  readonly campaign: LeadCampaign;
  readonly eligible: boolean;
  readonly rejections: readonly RejectionReason[];
  readonly score: number;
};

export type RoutingDecision =
  | {
      readonly outcome: 'routed';
      readonly primary: LeadCampaign;
      readonly fallback?: LeadCampaign;
      readonly reason: string;
      readonly evaluations: readonly CampaignEvaluation[];
    }
  | {
      readonly outcome: 'no_route';
      readonly reason: string;
      readonly evaluations: readonly CampaignEvaluation[];
    };

/** Fields a campaign may demand. Anything outside this list is a config error. */
export const ROUTABLE_REQUIRED_FIELDS = [
  'phone', 'email', 'first_name', 'last_name', 'zip', 'homeowner',
  'property_type', 'timeframe', 'work_type', 'address_line1', 'city',
] as const;
export type RoutableRequiredField = (typeof ROUTABLE_REQUIRED_FIELDS)[number];

export type AvailableFields = ReadonlySet<string>;

function evaluate(campaign: LeadCampaign, input: RoutingInput, available: AvailableFields): CampaignEvaluation {
  const rejections: RejectionReason[] = [];

  // --- eligible ---
  if (campaign.vertical !== input.vertical) rejections.push('vertical_mismatch');
  if (!campaign.active) rejections.push('campaign_inactive');
  if (!input.enabledProviderIds.has(campaign.providerId)) rejections.push('provider_disabled');

  // --- compliant ---
  if (!campaignCoversLocation(campaign, input.location)) rejections.push('out_of_coverage');
  for (const field of campaign.requiredFields) {
    if (!available.has(field)) {
      rejections.push('missing_required_field');
      break;
    }
  }
  // A campaign the consent text did not name cannot receive the lead, whatever
  // its payout. This is the check that makes the disclosure mean something.
  if (!input.disclosedPartnerNames.has(campaign.disclosedPartnerName)) {
    rejections.push('partner_not_disclosed');
  }

  // --- available ---
  const usage = input.usage.get(campaign.campaignId);
  if (campaign.dailyCap !== undefined && usage && usage.acceptedToday >= campaign.dailyCap) {
    rejections.push('daily_cap_reached');
  }
  if (campaign.hourlyCap !== undefined && usage && usage.acceptedThisHour >= campaign.hourlyCap) {
    rejections.push('hourly_cap_reached');
  }
  const health = input.health.get(campaign.providerId);
  if (health?.state === 'down') rejections.push('provider_down');

  // --- quality fit ---
  if (input.qualityScore < campaign.qualityFloor) rejections.push('below_quality_floor');

  return {
    campaign,
    eligible: rejections.length === 0,
    rejections,
    score: rejections.length === 0 ? commercialScore(campaign, input) : 0,
  };
}

/**
 * The only place payout is read, and it is read last.
 *
 * Priority dominates so an operator can pin a campaign without editing payouts.
 * Within a priority band, expected payout is discounted by the campaign's own
 * recent rejection rate and by a degraded provider: a $90 lead a buyer rejects
 * half the time is worth less than a $60 one they take, and routing that
 * pretends otherwise loses money while looking optimal.
 */
function commercialScore(campaign: LeadCampaign, input: RoutingInput): number {
  const usage = input.usage.get(campaign.campaignId);
  const acceptance = 1 - Math.min(Math.max(usage?.recentRejectionRate ?? 0, 0), 0.95);
  const health = input.health.get(campaign.providerId);
  const healthFactor = health?.state === 'degraded' ? 0.5 : 1;
  const expectedValue = campaign.expectedPayoutMinor * acceptance * healthFactor;
  return campaign.priority * 1_000_000 + expectedValue;
}

export function routeLead(input: RoutingInput, available: AvailableFields): RoutingDecision {
  const evaluations = input.campaigns.map((campaign) => evaluate(campaign, input, available));
  const eligible = evaluations
    .filter((entry) => entry.eligible)
    .sort((left, right) => right.score - left.score);

  if (eligible.length === 0) {
    return {
      outcome: 'no_route',
      reason: summarizeRejections(evaluations),
      evaluations,
    };
  }

  const primary = eligible[0].campaign;

  // A fallback is only prepared when the primary permits one and it belongs to
  // a different provider. Two campaigns at the same network is not redundancy,
  // it is the same outage twice.
  const fallback = primary.allowsFallback
    ? eligible.slice(1).find((entry) => entry.campaign.providerId !== primary.providerId)?.campaign
    : undefined;

  return {
    outcome: 'routed',
    primary,
    fallback,
    reason: fallback
      ? `Selected ${primary.campaignId}; ${fallback.campaignId} held as fallback.`
      : `Selected ${primary.campaignId}; no fallback permitted.`,
    evaluations,
  };
}

function summarizeRejections(evaluations: readonly CampaignEvaluation[]): string {
  if (evaluations.length === 0) return 'No campaigns are configured for this vertical.';
  const counts = new Map<RejectionReason, number>();
  for (const entry of evaluations) {
    for (const reason of entry.rejections) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([reason, count]) => `${reason}=${count}`)
    .join(', ');
}

/**
 * A coverage answer for the first step of the form.
 *
 * Deliberately returns nothing about *which* campaign matched. The browser is
 * told whether asking for contact details is worth the reader's time, and
 * nothing about the commercial arrangement behind that answer.
 */
export function hasCoverage(input: Omit<RoutingInput, 'qualification' | 'qualityScore'> & { qualityScore?: number }): boolean {
  const probe: RoutingInput = {
    ...input,
    qualification: {},
    qualityScore: input.qualityScore ?? 1,
  };
  // Required fields are not yet known at coverage time, so a campaign is judged
  // on everything except them. A campaign that will later reject for a missing
  // field is still coverage: the form can ask for that field.
  const permissive = new Set<string>(ROUTABLE_REQUIRED_FIELDS);
  return probe.campaigns.some((campaign) => evaluate(campaign, probe, permissive).eligible);
}

/**
 * Which fields the form has to ask for, given the campaigns that could take it.
 *
 * The union across eligible campaigns, minus what the calculator already knows.
 * This is what makes "do not ask for information CostAnswer already has" a
 * property of the system rather than a thing each form remembers.
 */
export function requiredFieldsFor(
  campaigns: readonly LeadCampaign[],
  known: AvailableFields,
): RoutableRequiredField[] {
  const needed = new Set<string>();
  for (const campaign of campaigns) {
    for (const field of campaign.requiredFields) if (!known.has(field)) needed.add(field);
  }
  return ROUTABLE_REQUIRED_FIELDS.filter((field) => needed.has(field));
}

/**
 * A crude, transparent quality score.
 *
 * Not a model. It is the handful of things a buyer actually rejects leads for,
 * scored so the number can be explained to them: a lead with no timeframe from
 * a renter is worth less than an owner replacing a roof this month, and both
 * sides know why.
 */
export function scoreLeadQuality(lead: Pick<LeadRequest, 'qualification' | 'project' | 'zip'>): number {
  let score = 0.5;
  if (lead.qualification.homeowner === true) score += 0.2;
  if (lead.qualification.homeowner === false) score -= 0.3;
  if (lead.qualification.timeframe === 'immediately') score += 0.15;
  if (lead.qualification.timeframe === 'within_1_month') score += 0.1;
  if (lead.qualification.timeframe === 'planning') score -= 0.1;
  if (lead.qualification.workType === 'replacement') score += 0.05;
  if (lead.qualification.currentCondition === 'emergency') score += 0.1;
  if (lead.zip) score += 0.05;
  if (lead.project.size !== undefined) score += 0.05;
  return Math.min(Math.max(score, 0), 1);
}
