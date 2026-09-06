/**
 * Pay-per-call.
 *
 * Related to leads but not the same shape: there is no form, no contact record
 * and no consent to store, because the reader initiates the call themselves and
 * the network owns the recording and the qualification. What CostAnswer holds is
 * a tracked number issued by a campaign, when it is valid, and the events the
 * network reports back.
 *
 * Numbers are never invented and never hardcoded. A campaign without a number
 * issued by its provider shows no call option at all — a phone number that
 * rings nowhere is worse than no phone number.
 */
import type { Locale } from '@/lib/i18n/locales';
import type { LeadVerticalId } from '../policy';

export type CallCampaign = {
  readonly callCampaignId: string;
  readonly providerId: string;
  readonly vertical: LeadVerticalId;
  /** Issued by the provider. E.164. Never generated locally. */
  readonly trackedNumberE164: string;
  readonly displayNumber: string;
  readonly active: boolean;
  readonly validFrom: string;
  readonly validUntil?: string;
  readonly stateCoverage: readonly string[];
  /** Local hours the buyer actually answers, in IANA form. */
  readonly timezone: string;
  readonly openHour: number;
  readonly closeHour: number;
  readonly disclosedPartnerName: string;
};

export const CALL_EVENTS = ['call_connected', 'call_qualified', 'call_billable'] as const;
export type CallEvent = (typeof CALL_EVENTS)[number];

/**
 * Is this number safe to put on the page right now?
 *
 * Expiry is checked as well as the active flag, because a disconnected tracked
 * number is the most visible possible failure: the reader calls it, hears
 * nothing, and concludes the site is fake.
 */
export function isCallCampaignLive(campaign: CallCampaign, asOf: string): boolean {
  if (!campaign.active) return false;
  if (campaign.validFrom > asOf) return false;
  if (campaign.validUntil && campaign.validUntil <= asOf) return false;
  return /^\+1\d{10}$/.test(campaign.trackedNumberE164);
}

export function callCampaignCoversState(campaign: CallCampaign, state: string | undefined): boolean {
  if (campaign.stateCoverage.length === 0) return true;
  return state !== undefined && campaign.stateCoverage.includes(state);
}

/**
 * Whether the buyer is open, in their hours not the reader's.
 *
 * Offering a call at 2am routes a motivated person to voicemail and burns the
 * intent that produced the click.
 */
export function isWithinCallHours(campaign: CallCampaign, at: Date): boolean {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: campaign.timezone,
    hour: 'numeric',
    hour12: false,
  }).format(at));
  return hour >= campaign.openHour && hour < campaign.closeHour;
}

export type CallCtaModel = {
  readonly displayNumber: string;
  readonly telHref: string;
  readonly partnerName: string;
  readonly locale: Locale;
};

export function callCtaModel(campaign: CallCampaign, locale: Locale): CallCtaModel {
  return {
    displayNumber: campaign.displayNumber,
    telHref: `tel:${campaign.trackedNumberE164}`,
    partnerName: campaign.disclosedPartnerName,
    locale,
  };
}

/** No campaigns are configured. A provisioned number is a provider deliverable. */
export const CALL_CAMPAIGNS: readonly CallCampaign[] = Object.freeze([]);

export function liveCallCampaign(input: {
  vertical: LeadVerticalId;
  state?: string;
  asOf: string;
  at: Date;
  campaigns?: readonly CallCampaign[];
}): CallCampaign | null {
  const campaigns = input.campaigns ?? CALL_CAMPAIGNS;
  return campaigns.find((campaign) =>
    campaign.vertical === input.vertical
    && isCallCampaignLive(campaign, input.asOf)
    && callCampaignCoversState(campaign, input.state)
    && isWithinCallHours(campaign, input.at)) ?? null;
}
