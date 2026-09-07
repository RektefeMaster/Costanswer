/**
 * Getting a lead to the buyer, exactly once, or knowing that it did not go.
 *
 * A delivery is money and a promise made to a person, so it is a durable row
 * with a state machine rather than an awaited fetch inside a request handler.
 * The submit endpoint writes the row and makes one attempt; if that attempt is
 * inconclusive the row survives with a `next_attempt_at`, and the drain job
 * finishes the job after the Worker that started it is gone.
 *
 * The rule that matters most: an accepted delivery is never retried. Everything
 * else here exists to make that hold under a timeout, where we genuinely do not
 * know whether the buyer received it. The provider idempotency key is what
 * turns that unknown into a safe repeat.
 */
import {
  assertDeliveryTransition, isTerminalDeliveryStatus,
  type DeliveryStatus, type LeadDelivery,
} from './types';
import type { LeadProvider, LeadSubmissionPayload, LeadSubmissionResult } from './providers/types';

export const DEFAULT_MAX_ATTEMPTS = 5;
export const PROVIDER_TIMEOUT_MS = 8_000;

/**
 * Backoff with jitter.
 *
 * Without jitter, a provider that returns 500 to everything gets every retry in
 * the queue back at the same instant, which is how a degraded provider becomes
 * a down one.
 */
export function nextAttemptDelayMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(30_000 * 2 ** Math.max(attempt - 1, 0), 15 * 60_000);
  return Math.round(base * (0.75 + random() * 0.5));
}

export type DeliveryOutcome = {
  readonly status: DeliveryStatus;
  readonly providerLeadId?: string;
  readonly providerStatusRaw?: string;
  readonly failureReason?: string;
  readonly latencyMs: number;
  readonly nextAttemptAt?: string;
  readonly payoutMinor?: number;
};

function statusFor(result: LeadSubmissionResult): DeliveryStatus {
  switch (result.outcome) {
    case 'accepted': return 'accepted';
    case 'rejected': return 'rejected';
    case 'retryable_failure': return 'retryable_failure';
    case 'permanent_failure': return 'permanent_failure';
    default: {
      const exhaustive: never = result;
      throw new Error(`Unhandled submission outcome: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/**
 * One attempt.
 *
 * The timeout is enforced here rather than trusted to the adapter, because an
 * adapter that hangs holds a request open and the reader watches a spinner. A
 * timeout is `retryable_failure`, never a rejection: we do not know that the
 * buyer refused it, only that we did not hear back.
 */
export async function attemptDelivery(input: {
  provider: LeadProvider;
  payload: LeadSubmissionPayload;
  delivery: Pick<LeadDelivery, 'status' | 'attemptCount' | 'maxAttempts'>;
  now?: number;
  timeoutMs?: number;
  random?: () => number;
}): Promise<DeliveryOutcome> {
  const now = input.now ?? Date.now();
  if (isTerminalDeliveryStatus(input.delivery.status)) {
    throw new Error(`Refusing to re-attempt a ${input.delivery.status} delivery. This is the duplicate-billing guard.`);
  }

  const startedAt = Date.now();
  let result: LeadSubmissionResult;
  try {
    result = await withTimeout(
      input.provider.submitLead(input.payload),
      input.timeoutMs ?? PROVIDER_TIMEOUT_MS,
    );
  } catch (error) {
    result = {
      outcome: 'retryable_failure',
      reason: error instanceof Error ? error.message : 'Provider call failed.',
    };
  }
  const latencyMs = Date.now() - startedAt;

  const attemptCount = input.delivery.attemptCount + 1;
  let status = statusFor(result);

  // Out of attempts: a retryable failure becomes permanent so the queue drains
  // and an operator sees a real failure rather than a row that retries forever.
  if (status === 'retryable_failure' && attemptCount >= input.delivery.maxAttempts) {
    status = 'permanent_failure';
  }

  assertDeliveryTransition('processing', status);

  return {
    status,
    latencyMs,
    providerLeadId: result.outcome === 'accepted' ? result.providerLeadId : undefined,
    providerStatusRaw: 'rawStatus' in result ? result.rawStatus : undefined,
    failureReason: 'reason' in result ? result.reason : undefined,
    payoutMinor: result.outcome === 'accepted' ? result.payoutMinor : undefined,
    nextAttemptAt: status === 'retryable_failure'
      ? new Date(now + nextAttemptDelayMs(attemptCount, input.random)).toISOString()
      : undefined,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Provider did not respond within ${timeoutMs}ms.`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * What the reader is told, given how the delivery went.
 *
 * The `pending` case is the one worth being careful about. A provider timeout
 * means the request may well have landed, so telling the reader it failed would
 * be wrong, and telling them it succeeded would be a claim we cannot support.
 * It says the request is in and they will hear back — which is true either way —
 * and never claims a professional has accepted anything.
 */
export type SubmissionDisposition = 'submitted' | 'pending' | 'no_route' | 'failed' | 'suppressed';

export function dispositionFor(status: DeliveryStatus): SubmissionDisposition {
  switch (status) {
    case 'accepted': return 'submitted';
    case 'pending':
    case 'processing':
    case 'retryable_failure': return 'pending';
    case 'rejected':
    case 'permanent_failure':
    case 'expired': return 'failed';
    case 'paid':
    case 'reversed': return 'submitted';
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled delivery status: ${exhaustive}`);
    }
  }
}

/**
 * Whether the fallback campaign may be tried.
 *
 * Only after a hard failure, never after a rejection. A buyer rejecting a lead
 * is a commercial answer — sending the same person to a second network because
 * the first said no is exactly the indiscriminate distribution the policy
 * forbids. A transport failure is different: nobody received it.
 */
export function mayAttemptFallback(input: {
  primaryStatus: DeliveryStatus;
  primaryAllowsFallback: boolean;
  consentNamedFallbackPartner: boolean;
}): boolean {
  if (!input.primaryAllowsFallback) return false;
  if (!input.consentNamedFallbackPartner) return false;
  return input.primaryStatus === 'permanent_failure' || input.primaryStatus === 'expired';
}
