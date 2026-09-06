/**
 * The lead pipeline, end to end.
 *
 * Order is the whole design here, and it is not the obvious one. Consent is
 * recorded *before* routing, not after, because the consent text names the
 * partner and a partner cannot be named after the person has already agreed.
 * That forces the form to know the partner at the point of consent, which is
 * why coverage is a separate first step: the coverage check picks the campaign,
 * the consent names it, and routing later verifies that the campaign it chose
 * is the one the person was told about.
 *
 *   coverage  ->  qualify  ->  contact  ->  consent (partner named)
 *             ->  validate ->  suppress? ->  duplicate? ->  route
 *             ->  consent re-check  ->  deliver
 *
 * The re-check before delivery is not redundant. Routing and delivery are
 * separated by a durable row and possibly by a Worker restart, and the thing
 * that must be true at the moment of sending is that this person agreed to this
 * partner receiving their details.
 */
import { generateId } from '../ids';
import { pepperedHash } from '../hash';
import type { Locale } from '@/lib/i18n/locales';
import { activeConsentVersion, renderConsent } from '../consent/versions';
import { plusDays, type D1DatabaseLike } from '../store/d1';
import { assertDeliveryConsent, recordConsent } from '../store/repositories/consents';
import {
  activeCampaignsForVertical, campaignUsageMap, getCampaign,
  providerHealthMap, recordProviderAttempt,
} from '../store/repositories/campaigns';
import { createDelivery, markDeliveryProcessing, openDeliveryFor, settleDelivery } from '../store/repositories/deliveries';
import { addSuppression, isSuppressed } from '../store/repositories/governance';
import {
  findDuplicateLead, loadLeadContactForDelivery, saveLeadContact,
  saveLeadRequest, updateLeadStatus,
} from '../store/repositories/leads';
import { incrementEventCounter, recordRevenue } from '../store/repositories/revenue';
import { money } from '../money';
import { checkDuplicate, hashContact, DEFAULT_DUPLICATE_POLICY, type DuplicatePolicy } from './dedupe';
import { attemptDelivery, dispositionFor, mayAttemptFallback, type SubmissionDisposition } from './delivery';
import { providerIdempotencyKey } from './idempotency';
import { createLeadProvider, enabledLeadProviderIds } from './providers/registry';
import { stateForZip } from './location';
import {
  hasCoverage, routeLead, scoreLeadQuality, selectableCampaigns, ROUTABLE_REQUIRED_FIELDS,
} from './routing';
import type { LeadSubmissionInput } from './schema';
import { silentRejectionFor } from './schema';
import type { LeadVerticalId } from '../policy';

/** How long a person's contact details are kept. Configurable, never infinite. */
export const DEFAULT_CONTACT_RETENTION_DAYS = 180;
/** The business record outlives the contact record so revenue can be reconciled. */
export const DEFAULT_LEAD_RETENTION_DAYS = 1_460;

export type LeadServiceConfig = {
  readonly hashPepper: string;
  readonly contactRetentionDays?: number;
  readonly leadRetentionDays?: number;
  readonly duplicatePolicy?: DuplicatePolicy;
  readonly privacyPolicyVersion: string;
  readonly termsVersion: string;
  readonly environment?: Record<string, string | undefined>;
};

export type CoverageOutcome = {
  readonly covered: boolean;
  /** The partner the consent text will name. Absent when nothing covers. */
  readonly partnerName?: string;
  readonly requiredFields: readonly string[];
};

/**
 * Step one: is there anywhere legitimate for this to go?
 *
 * Runs before a single contact field is requested. If the answer is no, the
 * form does not ask for a phone number "for later" — there is no waitlist, and
 * collecting details with nowhere to send them is collecting them for nothing.
 */
export async function checkCoverage(
  database: D1DatabaseLike,
  input: { vertical: LeadVerticalId; zip: string; state?: string },
  config: LeadServiceConfig,
): Promise<CoverageOutcome> {
  const environment = config.environment ?? process.env;
  const campaigns = await activeCampaignsForVertical(database, input.vertical);
  if (campaigns.length === 0) return { covered: false, requiredFields: [] };

  // A caller gives a ZIP; campaigns are usually scoped by state. Without this
  // translation every state-scoped campaign is invisible and coverage answers
  // "no" forever while appearing to work.
  const location = { zip: input.zip, state: input.state ?? stateForZip(input.zip) };

  const health = await providerHealthMap(database);
  const usage = await campaignUsageMap(database, campaigns.map((entry) => entry.campaignId));
  const enabledProviderIds = enabledLeadProviderIds(environment);

  const base = {
    vertical: input.vertical,
    location,
    campaigns,
    health,
    usage,
    enabledProviderIds,
    // No consent exists yet, so every campaign's own partner name counts as
    // disclosable — the consent step names whichever one is selected here.
    disclosedPartnerNames: new Set(campaigns.map((entry) => entry.disclosedPartnerName)),
  };

  if (!hasCoverage(base)) return { covered: false, requiredFields: [] };

  /*
   * The partner named here is the partner the consent text will name, and
   * routing later refuses any campaign that name does not match. So it has to
   * be chosen the way routing chooses — same eligibility, same order. Picking
   * the highest-priority campaign without applying coverage let a caller in
   * Texas be shown a California partner, agree to them, and then be told there
   * was no route after filling in the whole form.
   */
  const selected = selectableCampaigns(base)[0];
  return {
    covered: selected !== undefined,
    partnerName: selected?.disclosedPartnerName,
    requiredFields: [...new Set((selected ? [selected] : campaigns).flatMap((entry) => entry.requiredFields))]
      .filter((field) => (ROUTABLE_REQUIRED_FIELDS as readonly string[]).includes(field)),
  };
}

export type SubmitOutcome = {
  readonly leadId: string;
  readonly disposition: SubmissionDisposition;
  readonly partnerName?: string;
  readonly reason?: string;
};

/**
 * Step two: take the submission.
 *
 * Everything before the first network call is durable. If the provider hangs,
 * the reader still gets an honest answer and the drain job finishes the job.
 */
export async function submitLead(
  database: D1DatabaseLike,
  input: LeadSubmissionInput,
  config: LeadServiceConfig,
  options: { now?: number; pagePath: string; evidence?: { ipHash?: string; userAgent?: string } } = { pagePath: '/' },
): Promise<SubmitOutcome> {
  const now = options.now ?? Date.now();
  const vertical = input.vertical as LeadVerticalId;

  // Bots are dropped without an error message. A bot that learns which signal
  // caught it adapts; a person never reaches this branch.
  const silent = silentRejectionFor(input);
  if (silent) {
    return { leadId: generateId('lead', now), disposition: 'submitted', reason: silent };
  }

  const hashes = await hashContact(input.contact, config.hashPepper);

  if (await isSuppressed(database, hashes)) {
    const leadId = generateId('lead', now);
    await saveLeadRequest(database, baseLead(leadId, input, vertical, now, config), now);
    await updateLeadStatus(database, leadId, 'suppressed');
    return { leadId, disposition: 'suppressed', reason: 'This person asked us not to use their details.' };
  }

  const leadId = generateId('lead', now);
  const lead = await saveLeadRequest(database, baseLead(leadId, input, vertical, now, config), now);

  await saveLeadContact(
    database,
    { leadId, ...input.contact, ...hashes },
    plusDays(config.contactRetentionDays ?? DEFAULT_CONTACT_RETENTION_DAYS, now),
    now,
  );

  const duplicate = await checkDuplicate({
    hashes,
    vertical,
    now,
    leadId,
    policy: config.duplicatePolicy ?? DEFAULT_DUPLICATE_POLICY,
    lookup: (query) => findDuplicateLead(database, query),
  });

  const qualityScore = scoreLeadQuality({ qualification: input.qualification, project: input.project, zip: input.zip });
  await updateLeadStatus(database, leadId, 'validated', { duplicateState: duplicate.state, qualityScore });

  if (duplicate.state === 'suppressed') {
    await countEvent(database, 'lead_submit', input, now);
    return { leadId, disposition: 'suppressed', reason: 'A matching request was already sent recently.' };
  }

  // --- consent, before routing, naming the partner the reader was shown ---
  const version = activeConsentVersion(new Date(now).toISOString().slice(0, 10));
  if (version.version !== input.consent.version) {
    return { leadId, disposition: 'failed', reason: 'The consent wording changed while the form was open. Please review it again.' };
  }
  const rendered = renderConsent(version, input.locale as Locale, input.consent.partnerName);
  const consent = await recordConsent(database, {
    leadId,
    consentVersion: version.version,
    consentTextId: rendered.textId,
    consentTextSha256: rendered.sha256,
    locale: input.locale as Locale,
    pagePath: options.pagePath,
    calculatorId: input.calculatorId,
    serviceRequested: vertical,
    disclosedPartners: [input.consent.partnerName],
    communicationScope: [...version.scope],
    privacyPolicyVersion: config.privacyPolicyVersion,
    termsVersion: config.termsVersion,
    acceptedAt: new Date(now).toISOString(),
    evidence: options.evidence,
  }, now);

  await updateLeadStatus(database, leadId, 'consented', { consentId: consent.consentId });
  await countEvent(database, 'lead_consent_accept', input, now);

  // --- routing ---
  const campaigns = await activeCampaignsForVertical(database, vertical);
  const decision = routeLead({
    vertical,
    location: { zip: input.zip, state: input.state },
    qualification: input.qualification,
    qualityScore,
    campaigns,
    health: await providerHealthMap(database),
    usage: await campaignUsageMap(database, campaigns.map((entry) => entry.campaignId), now),
    enabledProviderIds: enabledLeadProviderIds(config.environment ?? process.env),
    disclosedPartnerNames: new Set([input.consent.partnerName]),
  }, availableFields(input));

  if (decision.outcome === 'no_route') {
    await updateLeadStatus(database, leadId, 'routing', { routingReason: decision.reason });
    await updateLeadStatus(database, leadId, 'failed', { routingReason: decision.reason });
    return { leadId, disposition: 'no_route', reason: decision.reason };
  }

  await updateLeadStatus(database, leadId, 'routing', {
    selectedCampaignId: decision.primary.campaignId,
    routingReason: decision.reason,
  });
  await countEvent(database, 'lead_submit', input, now);

  const primary = await deliver(database, {
    leadId, campaignId: decision.primary.campaignId, config, now, lead,
  });

  if (primary.disposition === 'failed' && decision.fallback && mayAttemptFallback({
    primaryStatus: primary.status,
    primaryAllowsFallback: decision.primary.allowsFallback,
    // The consent named one partner, so a different one may not receive it.
    // Recorded here rather than assumed so the reason is visible in the row.
    consentNamedFallbackPartner: decision.fallback.disclosedPartnerName === input.consent.partnerName,
  })) {
    const fallback = await deliver(database, {
      leadId, campaignId: decision.fallback.campaignId, config, now, lead,
    });
    return { leadId, disposition: fallback.disposition, partnerName: decision.fallback.disclosedPartnerName };
  }

  return { leadId, disposition: primary.disposition, partnerName: decision.primary.disclosedPartnerName };
}

/**
 * One delivery, including its consent re-check and its health bookkeeping.
 *
 * Also used by the drain job, which is why it takes a lead id rather than a
 * request context: by the time a retry runs, the request that created it is
 * long gone.
 */
export async function deliver(
  database: D1DatabaseLike,
  input: { leadId: string; campaignId: string; config: LeadServiceConfig; now: number; lead?: { vertical: string; pageId: string; calculatorId?: string; locale: string } },
): Promise<{ disposition: SubmissionDisposition; status: import('./types').DeliveryStatus }> {
  const campaign = await getCampaign(database, input.campaignId);
  if (!campaign) throw new Error(`No campaign ${input.campaignId}.`);

  // The check that makes the disclosure real, at the moment of sending.
  const consent = await assertDeliveryConsent(database, input.leadId, campaign.disclosedPartnerName);

  const contact = await loadLeadContactForDelivery(database, input.leadId);
  if (!contact) {
    return { disposition: 'failed', status: 'permanent_failure' };
  }

  const idempotencyKey = await providerIdempotencyKey(
    { leadId: input.leadId, campaignId: campaign.campaignId },
    input.config.hashPepper,
  );

  /*
   * Reuse the open row when there is one. The provider key is derived from the
   * lead and campaign precisely so a retry carries the same key the first
   * attempt did — which is what stops a provider billing twice when the first
   * attempt actually landed before the socket died. That same property means a
   * second row can never be inserted, so a retry has to continue the first one.
   */
  const existing = await openDeliveryFor(database, input.leadId, campaign.campaignId);
  if (existing && existing.attemptCount >= existing.maxAttempts) {
    await settleDelivery(database, existing.deliveryId, {
      status: 'permanent_failure',
      failureReason: 'Attempt budget exhausted.',
    }, input.now);
    return { disposition: 'failed', status: 'permanent_failure' };
  }

  const delivery = existing ?? await createDelivery(database, {
    leadId: input.leadId,
    campaignId: campaign.campaignId,
    providerId: campaign.providerId,
    idempotencyKey,
  }, input.now);

  await markDeliveryProcessing(database, delivery.deliveryId, input.now);

  const leadRow = await import('../store/repositories/leads').then((module) => module.getLeadRequest(database, input.leadId));
  if (!leadRow) throw new Error(`No lead ${input.leadId}.`);

  const provider = createLeadProvider(campaign.providerId);
  const outcome = await attemptDelivery({
    provider,
    payload: {
      lead: leadRow,
      contact,
      campaign,
      locale: leadRow.locale,
      idempotencyKey,
      consent: {
        consentId: consent.consentId,
        version: consent.consentVersion,
        textSha256: consent.consentTextSha256,
        acceptedAt: consent.acceptedAt,
        disclosedPartners: consent.disclosedPartners,
      },
    },
    delivery: { status: 'processing', attemptCount: delivery.attemptCount, maxAttempts: delivery.maxAttempts },
    now: input.now,
  });

  await settleDelivery(database, delivery.deliveryId, outcome, input.now);
  await recordProviderAttempt(
    database,
    campaign.providerId,
    outcome.status === 'accepted' || outcome.status === 'rejected',
    outcome.failureReason,
    input.now,
  );

  if (outcome.status === 'accepted') {
    // A retry that finally succeeds walks the lead forward from wherever it
    // was; a lead already marked accepted stays accepted rather than throwing
    // on an impossible transition.
    if (leadRow.status !== 'accepted') {
      if (leadRow.status !== 'submitted') await updateLeadStatus(database, input.leadId, 'submitted');
      await updateLeadStatus(database, input.leadId, 'accepted');
    }
    // Estimated, never confirmed. A buyer accepting a lead is not the same as
    // a buyer paying for it, and the ledger keeps those apart until a statement
    // or a postback says otherwise.
    await recordRevenue(database, {
      sourceType: 'lead',
      providerId: campaign.providerId,
      campaignId: campaign.campaignId,
      pageId: leadRow.pageId,
      calculatorId: leadRow.calculatorId,
      vertical: leadRow.vertical,
      locale: leadRow.locale,
      eventId: delivery.deliveryId,
      amount: money(outcome.payoutMinor ?? campaign.expectedPayoutMinor),
      status: 'estimated',
      isTest: campaign.providerId === 'mock',
      occurredAt: new Date(input.now).toISOString(),
    }, input.now);
  } else if (outcome.status === 'rejected') {
    if (leadRow.status !== 'rejected') {
      if (leadRow.status !== 'submitted') await updateLeadStatus(database, input.leadId, 'submitted');
      await updateLeadStatus(database, input.leadId, 'rejected');
    }
  }

  return { disposition: dispositionFor(outcome.status), status: outcome.status };
}

/**
 * A person asking us to stop.
 *
 * Records the suppression and erases the contact row in one call, so honouring
 * the request does not depend on a second job running.
 */
export async function suppressPerson(
  database: D1DatabaseLike,
  input: { phone?: string; email?: string; reason: string },
  config: LeadServiceConfig,
  at: number = Date.now(),
): Promise<string> {
  const hashes = await hashContact(input, config.hashPepper);
  return addSuppression(database, { ...hashes, scope: 'all_internal', reason: input.reason }, at);
}

function baseLead(
  leadId: string,
  input: LeadSubmissionInput,
  vertical: LeadVerticalId,
  now: number,
  config: LeadServiceConfig,
) {
  return {
    leadId,
    vertical,
    pageId: input.pageId,
    calculatorId: input.calculatorId,
    locale: input.locale as Locale,
    state: input.state,
    zip: input.zip,
    project: input.project,
    qualification: input.qualification,
    purgeAfter: plusDays(config.leadRetentionDays ?? DEFAULT_LEAD_RETENTION_DAYS, now),
  };
}

function availableFields(input: LeadSubmissionInput): Set<string> {
  const fields = new Set<string>(['zip']);
  if (input.contact.phone) fields.add('phone');
  if (input.contact.email) fields.add('email');
  if (input.contact.firstName) fields.add('first_name');
  if (input.contact.lastName) fields.add('last_name');
  if (input.contact.addressLine1) fields.add('address_line1');
  if (input.contact.city) fields.add('city');
  if (input.qualification.homeowner !== undefined) fields.add('homeowner');
  if (input.qualification.propertyType) fields.add('property_type');
  if (input.qualification.timeframe) fields.add('timeframe');
  if (input.qualification.workType) fields.add('work_type');
  return fields;
}

async function countEvent(
  database: D1DatabaseLike,
  eventName: string,
  input: LeadSubmissionInput,
  at: number,
): Promise<void> {
  await incrementEventCounter(database, {
    eventName,
    pageId: input.pageId,
    calculatorId: input.calculatorId,
    vertical: input.vertical,
    locale: input.locale,
  }, at);
}

export { pepperedHash };
