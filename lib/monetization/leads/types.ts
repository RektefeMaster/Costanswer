/**
 * The lead domain.
 *
 * Two records, kept apart on purpose. `LeadRequest` is the business object —
 * what was asked for, where, which campaign took it, what happened. It is what
 * every dashboard, funnel and log line uses. `LeadContact` is the person, and
 * it is loaded only by the delivery path and the privacy tooling. Nothing that
 * counts things ever holds a phone number.
 */
import type { Locale } from '@/lib/i18n/locales';
import type { Attribution } from '../attribution/types';
import type { LeadVerticalId } from '../policy';

export const LEAD_STATUSES = [
  'created', 'validated', 'consented', 'routing', 'submitted',
  'accepted', 'rejected', 'failed', 'expired', 'suppressed',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const DELIVERY_STATUSES = [
  'pending', 'processing', 'accepted', 'rejected',
  'retryable_failure', 'permanent_failure', 'expired', 'paid', 'reversed',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const NORMALIZED_PROVIDER_EVENTS = [
  'lead_received', 'lead_accepted', 'lead_rejected', 'lead_billable', 'lead_unbillable',
  'lead_sold', 'lead_paid', 'lead_reversed', 'call_connected', 'call_qualified', 'unknown',
] as const;
export type NormalizedProviderEvent = (typeof NORMALIZED_PROVIDER_EVENTS)[number];

export type DuplicateState = 'none' | 'detected' | 'suppressed' | 'allowed';

export type LeadProject = {
  readonly type?: string;
  readonly size?: number;
  readonly unit?: string;
  readonly qualityTier?: string;
  readonly estimatedLow?: number;
  readonly estimatedHigh?: number;
  readonly timeline?: string;
};

/**
 * Qualification answers.
 *
 * Every field here exists because a campaign asks for it. There is no
 * "household income" and no "are you the decision maker", because no campaign
 * this system routes to requires them and collecting a field a buyer did not
 * ask for is collecting it for nothing.
 */
export type LeadQualification = {
  readonly homeowner?: boolean;
  readonly propertyType?: 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'mobile' | 'commercial';
  readonly timeframe?: 'immediately' | 'within_1_month' | 'within_3_months' | 'within_6_months' | 'planning';
  readonly workType?: 'repair' | 'replacement' | 'new_installation';
  readonly currentCondition?: 'emergency' | 'poor' | 'fair' | 'good';
  readonly budgetRange?: string;
};

export type LeadRequest = {
  readonly leadId: string;
  readonly status: LeadStatus;
  readonly vertical: LeadVerticalId;
  readonly pageId: string;
  readonly calculatorId?: string;
  readonly locale: Locale;
  readonly state?: string;
  readonly zip?: string;
  readonly project: LeadProject;
  readonly qualification: LeadQualification;
  readonly consentId?: string;
  readonly selectedCampaignId?: string;
  readonly routingReason?: string;
  readonly duplicateState: DuplicateState;
  readonly qualityScore?: number;
  /** Where this request came from. Never a person, only a source. */
  readonly attribution: Attribution;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly purgeAfter: string;
};

/** Loaded only where a person's details are genuinely needed. */
export type LeadContact = {
  readonly leadId: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly addressLine1?: string;
  readonly city?: string;
  readonly phoneHash?: string;
  readonly emailHash?: string;
};

export type LeadDelivery = {
  readonly deliveryId: string;
  readonly leadId: string;
  readonly campaignId: string;
  readonly providerId: string;
  readonly status: DeliveryStatus;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly idempotencyKey: string;
  readonly providerLeadId?: string;
  readonly providerStatusRaw?: string;
  readonly failureReason?: string;
  readonly latencyMs?: number;
  readonly nextAttemptAt?: string;
  readonly settledAt?: string;
};

/**
 * Which delivery statuses are final.
 *
 * A retry against an accepted delivery is a second billable lead for the same
 * person, so "is this settled" is asked before every attempt and is defined
 * here rather than reasoned about at each call site.
 */
const TERMINAL: ReadonlySet<DeliveryStatus> = new Set<DeliveryStatus>([
  'accepted', 'rejected', 'permanent_failure', 'expired', 'paid', 'reversed',
]);

export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
  return TERMINAL.has(status);
}

const LEAD_TRANSITIONS: Readonly<Record<LeadStatus, readonly LeadStatus[]>> = {
  created: ['validated', 'suppressed', 'failed'],
  validated: ['consented', 'suppressed', 'failed'],
  consented: ['routing', 'suppressed', 'failed'],
  routing: ['submitted', 'failed', 'expired'],
  submitted: ['accepted', 'rejected', 'failed', 'expired'],
  accepted: [],
  rejected: [],
  failed: ['routing'],
  expired: [],
  suppressed: [],
};

export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_TRANSITIONS[from].includes(to);
}

export function assertLeadTransition(from: LeadStatus, to: LeadStatus): void {
  if (!canTransitionLead(from, to)) {
    throw new Error(`A lead cannot move from ${from} to ${to}.`);
  }
}

const DELIVERY_TRANSITIONS: Readonly<Record<DeliveryStatus, readonly DeliveryStatus[]>> = {
  pending: ['processing', 'expired'],
  processing: ['accepted', 'rejected', 'retryable_failure', 'permanent_failure'],
  retryable_failure: ['processing', 'permanent_failure', 'expired'],
  accepted: ['paid', 'reversed'],
  rejected: [],
  permanent_failure: [],
  expired: [],
  paid: ['reversed'],
  reversed: [],
};

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return DELIVERY_TRANSITIONS[from].includes(to);
}

export function assertDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus): void {
  if (!canTransitionDelivery(from, to)) {
    throw new Error(`A delivery cannot move from ${from} to ${to}.`);
  }
}
