/**
 * What a lead provider has to be able to do.
 *
 * Everything except `submitLead` and `describe` is optional, because real
 * networks differ: some expose a coverage ping, some only tell you at
 * submission; some post back, some are polled; some sign their webhooks, some
 * do not. Making those optional keeps the honest adapters honest — an adapter
 * that does not implement `checkCoverage` is stating that its network has no
 * such call, rather than faking one.
 *
 * No adapter in this repository invents an endpoint, a field name or an
 * authentication scheme. Where the integration needs documentation we do not
 * have, the adapter reports `configuration_required`, refuses to submit, and
 * says exactly what is missing.
 */
import type { Locale } from '@/lib/i18n/locales';
import type { LeadCampaign } from '../campaigns';
import type { LeadContact, LeadRequest, NormalizedProviderEvent } from '../types';

export type ProviderIntegrationStatus =
  | 'configuration_required'
  | 'configured'
  | 'enabled'
  | 'disabled'
  | 'compliance_hold';

export type ProviderDescriptor = {
  readonly providerId: string;
  readonly displayName: string;
  readonly providerType: 'lead_network' | 'direct_partner' | 'call_network';
  readonly status: ProviderIntegrationStatus;
  /** Documented integration modes. Empty when the documentation is account-gated. */
  readonly integrationModes: readonly ('server_post' | 'api_auction' | 'referral_link' | 'tracked_call')[];
  readonly supportedVerticals: readonly string[];
  /** Environment variables that must be set before this adapter can submit. */
  readonly requiredEnv: readonly string[];
  /** Plain sentence naming what is still missing. Shown in the admin screen. */
  readonly outstandingDependency?: string;
  readonly documentationUrl?: string;
  /** When the integration facts above were last checked against the provider. */
  readonly documentationCheckedAt: string;
};

export type CoverageResult = {
  readonly covered: boolean;
  readonly reason?: string;
};

export type LeadSubmissionPayload = {
  readonly lead: LeadRequest;
  readonly contact: LeadContact;
  readonly campaign: LeadCampaign;
  readonly locale: Locale;
  readonly idempotencyKey: string;
  readonly consent: {
    readonly consentId: string;
    readonly version: string;
    readonly textSha256: string;
    readonly acceptedAt: string;
    readonly disclosedPartners: readonly string[];
  };
};

export type LeadSubmissionResult =
  | {
      readonly outcome: 'accepted';
      readonly providerLeadId?: string;
      readonly rawStatus?: string;
      readonly payoutMinor?: number;
    }
  | {
      readonly outcome: 'rejected';
      readonly rawStatus?: string;
      readonly reason: string;
    }
  | {
      readonly outcome: 'retryable_failure';
      readonly reason: string;
    }
  | {
      readonly outcome: 'permanent_failure';
      readonly reason: string;
    };

export type ProviderEvent = {
  readonly providerEventId: string;
  readonly normalizedEvent: NormalizedProviderEvent;
  readonly rawStatus?: string;
  readonly providerLeadId?: string;
  readonly amountMinor?: number;
  readonly currency?: string;
  readonly signatureVerified: boolean;
};

export type ProviderHealthReport = {
  readonly reachable: boolean;
  readonly latencyMs?: number;
  readonly detail?: string;
};

export interface LeadProvider {
  describe(): ProviderDescriptor;
  checkCoverage?(input: { vertical: string; zip?: string; state?: string }): Promise<CoverageResult>;
  submitLead(payload: LeadSubmissionPayload): Promise<LeadSubmissionResult>;
  getStatus?(providerLeadId: string): Promise<{ normalizedEvent: NormalizedProviderEvent; rawStatus?: string }>;
  handleWebhook?(payload: string, headers: Headers): Promise<ProviderEvent>;
  healthCheck?(): Promise<ProviderHealthReport>;
}

/**
 * The refusal every unconfigured adapter returns.
 *
 * A permanent failure rather than a retryable one: retrying a submission to a
 * network we have no credentials for is a queue that never drains, and the
 * absence of credentials is not a transient condition.
 */
export function configurationRequired(descriptor: ProviderDescriptor): LeadSubmissionResult {
  return {
    outcome: 'permanent_failure',
    reason: descriptor.outstandingDependency
      ?? `${descriptor.displayName} is not configured. Required environment: ${descriptor.requiredEnv.join(', ') || 'unknown'}.`,
  };
}

export function isSubmittable(descriptor: ProviderDescriptor, environment: Record<string, string | undefined>): boolean {
  if (descriptor.status !== 'enabled' && descriptor.status !== 'configured') return false;
  return descriptor.requiredEnv.every((key) => (environment[key]?.trim().length ?? 0) > 0);
}
