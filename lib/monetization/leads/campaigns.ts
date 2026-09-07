/**
 * Campaigns: what a buyer will take, where, and under what terms.
 *
 * A campaign is configuration a business operator edits, not code — section 66
 * is explicit that disabling a state or a vertical must not need a deploy. The
 * shape lives here so the routing engine and the admin screen agree on it, and
 * so a field that routing cannot actually use never appears on the form.
 */
import type { LeadVerticalId } from '../policy';
import { fromJson, toBoolean, type D1Value } from '../store/d1';

export type PayoutModel = 'per_lead' | 'per_call' | 'revenue_share' | 'unknown';

export type LeadCampaign = {
  readonly campaignId: string;
  readonly providerId: string;
  readonly vertical: LeadVerticalId;
  readonly displayName: string;
  readonly active: boolean;
  /**
   * Exclusive campaigns take a lead and nobody else may have it.
   *
   * This is the flag that stops the failure mode the brief names: one person's
   * phone number sold to four networks because four of them would have paid.
   */
  readonly exclusive: boolean;
  /** Whether a second provider may be tried when this one hard-fails. */
  readonly allowsFallback: boolean;
  readonly priority: number;
  readonly payoutModel: PayoutModel;
  readonly expectedPayoutMinor: number;
  readonly dailyCap?: number;
  readonly hourlyCap?: number;
  readonly stateCoverage: readonly string[];
  readonly zipCoverage: readonly string[];
  readonly excludedStates: readonly string[];
  readonly requiredFields: readonly string[];
  readonly consentScope: readonly string[];
  /** The name shown to the consumer in the consent text. Never blank. */
  readonly disclosedPartnerName: string;
  readonly qualityFloor: number;
};

export type CampaignRow = Record<string, unknown>;

export function campaignFromRow(row: CampaignRow): LeadCampaign {
  return {
    campaignId: String(row.campaign_id),
    providerId: String(row.provider_id),
    vertical: String(row.vertical) as LeadVerticalId,
    displayName: String(row.display_name),
    active: toBoolean(row.active),
    exclusive: toBoolean(row.exclusive),
    allowsFallback: toBoolean(row.allows_fallback),
    priority: Number(row.priority ?? 100),
    payoutModel: String(row.payout_model) as PayoutModel,
    expectedPayoutMinor: Number(row.expected_payout_minor ?? 0),
    dailyCap: row.daily_cap === null || row.daily_cap === undefined ? undefined : Number(row.daily_cap),
    hourlyCap: row.hourly_cap === null || row.hourly_cap === undefined ? undefined : Number(row.hourly_cap),
    stateCoverage: fromJson<string[]>(row.state_coverage, []),
    zipCoverage: fromJson<string[]>(row.zip_coverage, []),
    excludedStates: fromJson<string[]>(row.excluded_states, []),
    requiredFields: fromJson<string[]>(row.required_fields, []),
    consentScope: fromJson<string[]>(row.consent_scope, []),
    disclosedPartnerName: String(row.disclosed_partner_name),
    qualityFloor: Number(row.quality_floor ?? 0),
  };
}

export function campaignToBindings(campaign: LeadCampaign, timestamp: string): D1Value[] {
  return [
    campaign.campaignId,
    campaign.providerId,
    campaign.vertical,
    campaign.displayName,
    campaign.active ? 1 : 0,
    campaign.exclusive ? 1 : 0,
    campaign.allowsFallback ? 1 : 0,
    campaign.priority,
    campaign.payoutModel,
    campaign.expectedPayoutMinor,
    campaign.dailyCap ?? null,
    campaign.hourlyCap ?? null,
    JSON.stringify(campaign.stateCoverage),
    JSON.stringify(campaign.zipCoverage),
    JSON.stringify(campaign.excludedStates),
    JSON.stringify(campaign.requiredFields),
    JSON.stringify(campaign.consentScope),
    campaign.disclosedPartnerName,
    campaign.qualityFloor,
    timestamp,
    timestamp,
  ];
}

/**
 * Does this campaign cover this place?
 *
 * An empty coverage list means "no restriction stated", not "nowhere" — a
 * national campaign should not have to enumerate fifty states. An explicit
 * exclusion always wins over an inclusion, because exclusions are how a buyer
 * says "we lost our contractor in Nevada" and that has to be the stronger
 * signal.
 */
export function campaignCoversLocation(
  campaign: LeadCampaign,
  location: { state?: string; zip?: string },
): boolean {
  if (location.state && campaign.excludedStates.includes(location.state)) return false;
  if (campaign.zipCoverage.length > 0) {
    return location.zip !== undefined && campaign.zipCoverage.includes(location.zip);
  }
  if (campaign.stateCoverage.length > 0) {
    return location.state !== undefined && campaign.stateCoverage.includes(location.state);
  }
  return true;
}

export function campaignRequiresField(campaign: LeadCampaign, field: string): boolean {
  return campaign.requiredFields.includes(field);
}
