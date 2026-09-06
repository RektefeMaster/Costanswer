/**
 * The monetization event taxonomy.
 *
 * `lib/analytics.ts` already had the right idea: an allowlist of events, an
 * allowlist of fields per event, and a parser that rejects anything with an
 * extra key rather than forwarding it. That is the PII boundary, and this
 * module extends it rather than opening a second, looser door.
 *
 * The rule every field here obeys: a monetization event may carry an internal
 * id, a category, a place at state granularity and a provider name. It may not
 * carry a phone number, an email address, a name, a street address, a ZIP code,
 * or any amount the reader typed. If a funnel needs to be joined back to a
 * person, it is joined in the database on `leadId`, where access is controlled —
 * not in an analytics pipeline where it is not.
 */
import { CATEGORY_IDS } from './../categories';
import { LOCALES } from '@/lib/i18n/locales';
import { AD_PLACEMENTS } from './ads/slots';
import { MONETIZATION_VERTICALS } from './context';
import { integrationConfig } from '@/lib/integration-config';

export const MONETIZATION_EVENTS = [
  'lead_cta_impression',
  'lead_cta_click',
  'lead_coverage_check',
  'lead_coverage_available',
  'lead_coverage_unavailable',
  'lead_form_start',
  'lead_form_step_complete',
  'lead_form_validation_error',
  'lead_consent_view',
  'lead_consent_accept',
  'lead_submit',
  'lead_provider_submit',
  'lead_provider_accept',
  'lead_provider_reject',
  'lead_provider_timeout',
  'lead_billable',
  'lead_paid',
  'lead_reversed',
  'call_cta_impression',
  'call_cta_click',
  'call_connected',
  'call_qualified',
  'call_billable',
  'affiliate_module_impression',
  'affiliate_offer_impression',
  'affiliate_offer_click',
  'affiliate_conversion_imported',
  'affiliate_revenue_confirmed',
  'affiliate_revenue_reversed',
  'ad_slot_eligible',
  'ad_slot_rendered',
  'ad_revenue_imported',
  'advanced_opened',
  'compare_used',
  'reverse_used',
  'quote_checked',
  'source_clicked',
  'guide_to_calculator',
  'language_switched',
  'intent_selected',
] as const;

export type MonetizationEventName = (typeof MONETIZATION_EVENTS)[number];

type FieldCheck = (value: unknown) => boolean;

const boundedId: FieldCheck = (value) => typeof value === 'string' && value.length >= 1 && value.length <= 80;
const optionalBoundedId: FieldCheck = (value) => value === undefined || boundedId(value);
const oneOf = (allowed: readonly string[]): FieldCheck => (value) => typeof value === 'string' && allowed.includes(value);
const optionalOneOf = (allowed: readonly string[]): FieldCheck => (value) => value === undefined || oneOf(allowed)(value);
const smallCount: FieldCheck = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1000;
/** State only. A ZIP is a household in a rural county, so it never leaves the server. */
const stateCode: FieldCheck = (value) => value === undefined || (typeof value === 'string' && /^[A-Z]{2}$/.test(value));

const PAGE_CONTEXT: Record<string, FieldCheck> = {
  pageId: boundedId,
  calculatorId: optionalBoundedId,
  locale: oneOf(LOCALES),
  vertical: oneOf(MONETIZATION_VERTICALS),
};

const LEAD_CONTEXT: Record<string, FieldCheck> = {
  ...PAGE_CONTEXT,
  leadId: optionalBoundedId,
  state: stateCode,
};

const PROVIDER_CONTEXT: Record<string, FieldCheck> = {
  ...LEAD_CONTEXT,
  providerId: boundedId,
  campaignId: optionalBoundedId,
};

const AFFILIATE_CONTEXT: Record<string, FieldCheck> = {
  ...PAGE_CONTEXT,
  merchantId: boundedId,
  offerId: boundedId,
  productCategory: boundedId,
  placement: boundedId,
};

const eventFields: Record<MonetizationEventName, Record<string, FieldCheck>> = {
  lead_cta_impression: LEAD_CONTEXT,
  lead_cta_click: LEAD_CONTEXT,
  lead_coverage_check: { ...PAGE_CONTEXT, state: stateCode },
  lead_coverage_available: { ...PAGE_CONTEXT, state: stateCode },
  lead_coverage_unavailable: { ...PAGE_CONTEXT, state: stateCode },
  lead_form_start: LEAD_CONTEXT,
  lead_form_step_complete: { ...LEAD_CONTEXT, step: smallCount },
  lead_form_validation_error: { ...LEAD_CONTEXT, field: boundedId },
  lead_consent_view: { ...LEAD_CONTEXT, consentVersion: boundedId },
  lead_consent_accept: { ...LEAD_CONTEXT, consentVersion: boundedId },
  lead_submit: LEAD_CONTEXT,
  lead_provider_submit: PROVIDER_CONTEXT,
  lead_provider_accept: PROVIDER_CONTEXT,
  lead_provider_reject: { ...PROVIDER_CONTEXT, reason: boundedId },
  lead_provider_timeout: PROVIDER_CONTEXT,
  lead_billable: PROVIDER_CONTEXT,
  lead_paid: PROVIDER_CONTEXT,
  lead_reversed: PROVIDER_CONTEXT,
  call_cta_impression: LEAD_CONTEXT,
  call_cta_click: LEAD_CONTEXT,
  call_connected: PROVIDER_CONTEXT,
  call_qualified: PROVIDER_CONTEXT,
  call_billable: PROVIDER_CONTEXT,
  affiliate_module_impression: { ...PAGE_CONTEXT, offerCount: smallCount },
  affiliate_offer_impression: AFFILIATE_CONTEXT,
  affiliate_offer_click: AFFILIATE_CONTEXT,
  affiliate_conversion_imported: { ...PAGE_CONTEXT, merchantId: boundedId },
  affiliate_revenue_confirmed: { ...PAGE_CONTEXT, merchantId: boundedId },
  affiliate_revenue_reversed: { ...PAGE_CONTEXT, merchantId: boundedId },
  ad_slot_eligible: { ...PAGE_CONTEXT, placement: oneOf(AD_PLACEMENTS) },
  ad_slot_rendered: { ...PAGE_CONTEXT, placement: oneOf(AD_PLACEMENTS), networkId: boundedId },
  ad_revenue_imported: { networkId: boundedId, dayBucket: boundedId },
  advanced_opened: { toolId: boundedId, category: oneOf(CATEGORY_IDS) },
  compare_used: { toolId: boundedId, category: oneOf(CATEGORY_IDS) },
  reverse_used: { toolId: boundedId, category: oneOf(CATEGORY_IDS) },
  quote_checked: { ...PAGE_CONTEXT, verdict: boundedId },
  source_clicked: { toolId: boundedId, sourceId: boundedId },
  guide_to_calculator: { guideId: boundedId, toolId: boundedId },
  language_switched: { from: oneOf(LOCALES), to: oneOf(LOCALES) },
  intent_selected: { ...PAGE_CONTEXT, intent: optionalOneOf(['hire_professional', 'diy', 'researching']) },
};

export type MonetizationEvent = {
  readonly name: MonetizationEventName;
  readonly payload: Record<string, unknown>;
};

/**
 * Field names that must never appear in a monetization payload.
 *
 * Belt and braces over the per-event allowlist. The allowlist already rejects
 * unknown keys, but this list makes the intent explicit and is what a reviewer
 * reads when adding an event.
 */
export const FORBIDDEN_ANALYTICS_FIELDS = [
  'phone', 'phoneNumber', 'email', 'emailAddress', 'firstName', 'lastName', 'name',
  'address', 'addressLine1', 'street', 'zip', 'zipCode', 'postalCode', 'ip', 'ipAddress',
  'amount', 'income', 'salary', 'balance', 'payout', 'commission',
];

export function parseMonetizationEvent(name: MonetizationEventName, payload: unknown): MonetizationEvent | null {
  const fields = eventFields[name];
  if (!fields || payload === null || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const entries = Object.entries(payload as Record<string, unknown>);
  for (const [key, value] of entries) {
    if (FORBIDDEN_ANALYTICS_FIELDS.includes(key)) return null;
    const check = Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : undefined;
    if (!check || !check(value)) return null;
  }

  // Every non-optional field must be present. A funnel missing its denominator
  // is worse than no funnel, because it looks like a conversion rate.
  for (const [key, check] of Object.entries(fields)) {
    if (!(key in (payload as Record<string, unknown>)) && !check(undefined)) return null;
  }

  return { name, payload: payload as Record<string, unknown> };
}

export function isMonetizationEventName(value: unknown): value is MonetizationEventName {
  return typeof value === 'string' && (MONETIZATION_EVENTS as readonly string[]).includes(value);
}

/** Same provider-neutral local bus the calculator events already use. */
export function emitMonetizationEvent(name: MonetizationEventName, payload: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !integrationConfig.analyticsEnabled) return;
  const event = parseMonetizationEvent(name, payload);
  if (!event) return;
  window.dispatchEvent(new CustomEvent('costanswer:monetization', { detail: event }));
}
