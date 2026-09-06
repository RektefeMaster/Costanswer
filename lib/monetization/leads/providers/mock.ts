/**
 * A lead provider that behaves like a real one and sends nothing anywhere.
 *
 * This is what makes the whole delivery path testable — retries, idempotency,
 * duplicate suppression, webhook replay, reversal — without a single consumer's
 * phone number leaving the process. It is also the most dangerous file here if
 * it ever runs in production, because it accepts real contact details and
 * discards them while reporting success. `flags.ts` refuses to resolve
 * `leads.mock.enabled` outside development unless `MONETIZATION_ALLOW_MOCKS` is
 * explicitly set, and the constructor refuses too. Two locks, on purpose.
 */
import { sha256 } from '@/lib/data/sha256';
import type {
  CoverageResult, LeadProvider, LeadSubmissionPayload, LeadSubmissionResult,
  ProviderDescriptor, ProviderEvent, ProviderHealthReport,
} from './types';

export type MockBehaviour =
  | 'accept' | 'reject' | 'timeout' | 'server_error'
  | 'duplicate' | 'slow_accept' | 'invalid_response';

export type MockOptions = {
  readonly behaviour?: MockBehaviour;
  readonly payoutMinor?: number;
  readonly latencyMs?: number;
  readonly allowInProduction?: boolean;
};

export class MockLeadProvider implements LeadProvider {
  private readonly behaviour: MockBehaviour;
  private readonly payoutMinor: number;
  private readonly latencyMs: number;
  /** Every payload it was handed, so tests can assert on what would have been sent. */
  readonly submissions: LeadSubmissionPayload[] = [];
  private readonly seenIdempotencyKeys = new Set<string>();

  constructor(options: MockOptions = {}, environment: Record<string, string | undefined> = process.env) {
    const productionAllowed = options.allowInProduction === true || environment.MONETIZATION_ALLOW_MOCKS === 'true';
    if (environment.NODE_ENV === 'production' && !productionAllowed) {
      throw new Error('MockLeadProvider cannot be constructed in production. It accepts real contact details and discards them.');
    }
    this.behaviour = options.behaviour ?? 'accept';
    this.payoutMinor = options.payoutMinor ?? 6_500;
    this.latencyMs = options.latencyMs ?? 0;
  }

  describe(): ProviderDescriptor {
    return {
      providerId: 'mock',
      displayName: 'Mock lead provider (test only)',
      providerType: 'lead_network',
      status: 'configured',
      integrationModes: ['server_post'],
      supportedVerticals: ['*'],
      requiredEnv: [],
      documentationCheckedAt: '2026-09-06',
    };
  }

  async checkCoverage(input: { vertical: string; zip?: string }): Promise<CoverageResult> {
    // 00000 is reserved here as the "no buyer" ZIP so the uncovered path is
    // reachable in a test without disabling the provider.
    if (input.zip === '00000') return { covered: false, reason: 'No mock buyer for this area.' };
    return { covered: true };
  }

  async submitLead(payload: LeadSubmissionPayload): Promise<LeadSubmissionResult> {
    if (this.latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, this.latencyMs));

    // Idempotency modelled the way real networks do it: the same key returns
    // the same acceptance rather than creating a second lead.
    if (this.seenIdempotencyKeys.has(payload.idempotencyKey)) {
      return {
        outcome: 'accepted',
        providerLeadId: `mock-${sha256(payload.idempotencyKey).slice(0, 16)}`,
        rawStatus: 'duplicate_of_prior_submission',
        payoutMinor: 0,
      };
    }

    switch (this.behaviour) {
      case 'timeout':
        return { outcome: 'retryable_failure', reason: 'Mock provider timed out.' };
      case 'server_error':
        return { outcome: 'retryable_failure', reason: 'Mock provider returned 500.' };
      case 'invalid_response':
        return { outcome: 'permanent_failure', reason: 'Mock provider returned an unparseable body.' };
      case 'reject':
        this.submissions.push(payload);
        return { outcome: 'rejected', rawStatus: 'duplicate_in_market', reason: 'Mock provider rejected the lead.' };
      case 'duplicate':
        this.submissions.push(payload);
        return { outcome: 'rejected', rawStatus: 'duplicate', reason: 'Mock provider already has this consumer.' };
      case 'slow_accept':
      case 'accept':
      default: {
        this.submissions.push(payload);
        this.seenIdempotencyKeys.add(payload.idempotencyKey);
        return {
          outcome: 'accepted',
          providerLeadId: `mock-${sha256(payload.idempotencyKey).slice(0, 16)}`,
          rawStatus: 'accepted',
          payoutMinor: this.payoutMinor,
        };
      }
    }
  }

  async handleWebhook(payload: string, headers: Headers): Promise<ProviderEvent> {
    const body = JSON.parse(payload) as Record<string, unknown>;
    return {
      providerEventId: String(body.event_id ?? sha256(payload).slice(0, 24)),
      normalizedEvent: normalizeMockStatus(String(body.status ?? '')),
      rawStatus: typeof body.status === 'string' ? body.status : undefined,
      providerLeadId: typeof body.lead_id === 'string' ? body.lead_id : undefined,
      amountMinor: typeof body.amount_minor === 'number' ? body.amount_minor : undefined,
      currency: typeof body.currency === 'string' ? body.currency : 'USD',
      signatureVerified: headers.get('x-mock-signature') === 'valid',
    };
  }

  async healthCheck(): Promise<ProviderHealthReport> {
    return { reachable: this.behaviour !== 'timeout', latencyMs: this.latencyMs };
  }
}

function normalizeMockStatus(status: string): ProviderEvent['normalizedEvent'] {
  switch (status) {
    case 'accepted': return 'lead_accepted';
    case 'rejected': return 'lead_rejected';
    case 'billable': return 'lead_billable';
    case 'paid': return 'lead_paid';
    case 'reversed': return 'lead_reversed';
    default: return 'unknown';
  }
}
