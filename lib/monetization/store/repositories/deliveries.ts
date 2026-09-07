/**
 * Delivery attempts and provider callbacks.
 *
 * The outbox. A row is created before any network call, so a Worker that dies
 * mid-flight leaves a record the drain job can finish rather than a lead that
 * silently never went.
 */
import { generateId } from '../../ids';
import { assertDeliveryTransition, type DeliveryStatus, type LeadDelivery, type NormalizedProviderEvent } from '../../leads/types';
import { fromJson, nowIso, type D1DatabaseLike } from '../d1';

export async function createDelivery(
  database: D1DatabaseLike,
  input: { leadId: string; campaignId: string; providerId: string; idempotencyKey: string; maxAttempts?: number },
  at: number = Date.now(),
): Promise<LeadDelivery> {
  const timestamp = nowIso(at);
  const delivery: LeadDelivery = {
    deliveryId: generateId('delivery', at),
    leadId: input.leadId,
    campaignId: input.campaignId,
    providerId: input.providerId,
    status: 'pending',
    attemptCount: 0,
    maxAttempts: input.maxAttempts ?? 5,
    idempotencyKey: input.idempotencyKey,
  };

  await database.prepare(`
    INSERT INTO lead_deliveries (
      delivery_id, lead_id, campaign_id, provider_id, status, attempt_count,
      max_attempts, idempotency_key, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
  `).bind(
    delivery.deliveryId, delivery.leadId, delivery.campaignId, delivery.providerId,
    delivery.status, 0, delivery.maxAttempts, delivery.idempotencyKey, timestamp, timestamp,
  ).run();

  return delivery;
}

/**
 * The open delivery for this lead and campaign, if there is one.
 *
 * A retry must reuse the row it is retrying. Creating a second row derives the
 * same provider idempotency key and the unique index rejects it, which is
 * correct as a duplicate-billing guard and fatal as a retry path: without this
 * lookup the outbox can never drain and every timed-out lead is stuck forever.
 */
export async function openDeliveryFor(
  database: D1DatabaseLike,
  leadId: string,
  campaignId: string,
): Promise<LeadDelivery | null> {
  const row = await database.prepare(`
    SELECT * FROM lead_deliveries
     WHERE lead_id = ? AND campaign_id = ?
       AND status IN ('pending','processing','retryable_failure')
     ORDER BY created_at DESC
     LIMIT 1
  `).bind(leadId, campaignId).first();
  return row ? deliveryFromRow(row) : null;
}

export async function getDelivery(database: D1DatabaseLike, deliveryId: string): Promise<LeadDelivery | null> {
  const row = await database.prepare('SELECT * FROM lead_deliveries WHERE delivery_id = ?').bind(deliveryId).first();
  return row ? deliveryFromRow(row) : null;
}

export async function markDeliveryProcessing(
  database: D1DatabaseLike,
  deliveryId: string,
  at: number = Date.now(),
): Promise<void> {
  const current = await getDelivery(database, deliveryId);
  if (!current) throw new Error(`No delivery ${deliveryId}.`);
  assertDeliveryTransition(current.status, 'processing');
  const timestamp = nowIso(at);
  await database.prepare(`
    UPDATE lead_deliveries
       SET status = 'processing', attempt_count = attempt_count + 1,
           first_attempt_at = COALESCE(first_attempt_at, ?), last_attempt_at = ?, updated_at = ?
     WHERE delivery_id = ?
  `).bind(timestamp, timestamp, timestamp, deliveryId).run();
}

export async function settleDelivery(
  database: D1DatabaseLike,
  deliveryId: string,
  outcome: {
    status: DeliveryStatus;
    providerLeadId?: string;
    providerStatusRaw?: string;
    failureReason?: string;
    latencyMs?: number;
    nextAttemptAt?: string;
  },
  at: number = Date.now(),
): Promise<void> {
  const current = await getDelivery(database, deliveryId);
  if (!current) throw new Error(`No delivery ${deliveryId}.`);
  assertDeliveryTransition(current.status, outcome.status);

  const timestamp = nowIso(at);
  const settled = outcome.status !== 'retryable_failure' && outcome.status !== 'processing';
  await database.prepare(`
    UPDATE lead_deliveries
       SET status = ?, provider_lead_id = COALESCE(?, provider_lead_id),
           provider_status_raw = ?, failure_reason = ?, latency_ms = ?,
           next_attempt_at = ?, settled_at = ?, updated_at = ?
     WHERE delivery_id = ?
  `).bind(
    outcome.status, outcome.providerLeadId ?? null, outcome.providerStatusRaw ?? null,
    outcome.failureReason ?? null, outcome.latencyMs ?? null, outcome.nextAttemptAt ?? null,
    settled ? timestamp : null, timestamp, deliveryId,
  ).run();
}

/**
 * Work the drain job should pick up.
 *
 * Ordered oldest first so a backlog clears in the order people submitted, and
 * limited so one invocation cannot run past a Worker's CPU budget.
 */
export async function dueDeliveries(
  database: D1DatabaseLike,
  limit = 25,
  at: number = Date.now(),
): Promise<LeadDelivery[]> {
  const rows = await database.prepare(`
    SELECT * FROM lead_deliveries
     WHERE status IN ('pending','retryable_failure')
       AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
     ORDER BY created_at ASC
     LIMIT ?
  `).bind(nowIso(at), limit).all();
  return rows.results.map(deliveryFromRow);
}

/** The delivery a provider's own lead id refers to, so a callback can be tied back. */
export async function deliveryForProviderLead(
  database: D1DatabaseLike,
  providerId: string,
  providerLeadId: string,
): Promise<LeadDelivery | null> {
  const row = await database.prepare(
    'SELECT * FROM lead_deliveries WHERE provider_id = ? AND provider_lead_id = ? LIMIT 1',
  ).bind(providerId, providerLeadId).first();
  return row ? deliveryFromRow(row) : null;
}

export async function deliveriesForLead(database: D1DatabaseLike, leadId: string): Promise<LeadDelivery[]> {
  const rows = await database.prepare('SELECT * FROM lead_deliveries WHERE lead_id = ? ORDER BY created_at ASC').bind(leadId).all();
  return rows.results.map(deliveryFromRow);
}

/**
 * Record a provider callback.
 *
 * Returns false when the event has already been seen. That is the replay guard,
 * and it is a unique index rather than a select-then-insert so two concurrent
 * deliveries of the same webhook cannot both pass the check.
 */
export async function recordProviderEvent(
  database: D1DatabaseLike,
  input: {
    providerId: string;
    providerEventId: string;
    deliveryId?: string;
    leadId?: string;
    normalizedEvent: NormalizedProviderEvent;
    rawStatus?: string;
    amountMinor?: number;
    currency?: string;
    signatureVerified: boolean;
    payloadDigest: string;
  },
  at: number = Date.now(),
): Promise<boolean> {
  try {
    await database.prepare(`
      INSERT INTO lead_provider_events (
        event_id, provider_id, provider_event_id, delivery_id, lead_id,
        normalized_event, raw_status, amount_minor, currency, signature_verified,
        received_at, payload_digest
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      generateId('providerEvent', at), input.providerId, input.providerEventId,
      input.deliveryId ?? null, input.leadId ?? null, input.normalizedEvent,
      input.rawStatus ?? null, input.amountMinor ?? null, input.currency ?? 'USD',
      input.signatureVerified ? 1 : 0, nowIso(at), input.payloadDigest,
    ).run();
    return true;
  } catch (error) {
    // A unique-constraint violation is the expected path for a replay, not an
    // error worth surfacing. Anything else is.
    const message = error instanceof Error ? error.message : String(error);
    if (/UNIQUE|constraint/i.test(message)) return false;
    throw error;
  }
}

function deliveryFromRow(row: Record<string, unknown>): LeadDelivery {
  return {
    deliveryId: String(row.delivery_id),
    leadId: String(row.lead_id),
    campaignId: String(row.campaign_id),
    providerId: String(row.provider_id),
    status: String(row.status) as DeliveryStatus,
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 5),
    idempotencyKey: String(row.idempotency_key),
    providerLeadId: optional(row.provider_lead_id),
    providerStatusRaw: optional(row.provider_status_raw),
    failureReason: optional(row.failure_reason),
    latencyMs: row.latency_ms === null || row.latency_ms === undefined ? undefined : Number(row.latency_ms),
    nextAttemptAt: optional(row.next_attempt_at),
    settledAt: optional(row.settled_at),
  };
}

function optional(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

export { fromJson };
