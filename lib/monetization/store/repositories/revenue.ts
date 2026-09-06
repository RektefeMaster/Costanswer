/** The revenue ledger, and the counters a dashboard divides by. */
import { generateId } from '../../ids';
import { money } from '../../money';
import { assertRevenueTransition, type RevenueLedgerEntry, type RevenueSource, type RevenueStatus } from '../../revenue/ledger';
import { dayBucket, nowIso, type D1DatabaseLike } from '../d1';

export type NewRevenueEntry = Omit<RevenueLedgerEntry, 'entryId'>;

/**
 * Write a ledger row.
 *
 * Returns null when the provider reference has already been recorded — an
 * import run twice must not double the month. The unique partial index does the
 * work; this only translates the constraint into a value the caller can branch
 * on rather than an exception it has to classify.
 */
export async function recordRevenue(
  database: D1DatabaseLike,
  entry: NewRevenueEntry,
  at: number = Date.now(),
): Promise<RevenueLedgerEntry | null> {
  const row: RevenueLedgerEntry = { ...entry, entryId: generateId('revenue', at) };
  const timestamp = nowIso(at);
  try {
    await database.prepare(`
      INSERT INTO revenue_ledger (
        entry_id, source_type, provider_id, campaign_id, page_id, calculator_id,
        vertical, locale, event_id, provider_reference, amount_minor, currency,
        status, is_test, occurred_at, reported_at, confirmed_at, paid_at,
        reversed_at, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      row.entryId, row.sourceType, row.providerId, row.campaignId ?? null, row.pageId ?? null,
      row.calculatorId ?? null, row.vertical ?? null, row.locale ?? null, row.eventId ?? null,
      row.providerReference ?? null, row.amount.minorUnits, row.amount.currency, row.status,
      row.isTest ? 1 : 0, row.occurredAt, row.reportedAt ?? null, row.confirmedAt ?? null,
      row.paidAt ?? null, row.reversedAt ?? null, timestamp, timestamp,
    ).run();
    return row;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/UNIQUE|constraint/i.test(message)) return null;
    throw error;
  }
}

export async function advanceRevenueStatus(
  database: D1DatabaseLike,
  entryId: string,
  next: RevenueStatus,
  at: number = Date.now(),
): Promise<void> {
  const row = await database.prepare('SELECT status FROM revenue_ledger WHERE entry_id = ?').bind(entryId).first<{ status: string }>();
  if (!row) throw new Error(`No revenue entry ${entryId}.`);
  assertRevenueTransition(row.status as RevenueStatus, next);

  const timestamp = nowIso(at);
  const column = { reported: 'reported_at', confirmed: 'confirmed_at', paid: 'paid_at', reversed: 'reversed_at' }[next as 'reported' | 'confirmed' | 'paid' | 'reversed'];
  await database.prepare(
    `UPDATE revenue_ledger SET status = ?, ${column} = ?, updated_at = ? WHERE entry_id = ?`,
  ).bind(next, timestamp, timestamp, entryId).run();
}

export async function revenueBetween(
  database: D1DatabaseLike,
  fromIso: string,
  toIso: string,
  includeTest = false,
): Promise<RevenueLedgerEntry[]> {
  const rows = await database.prepare(`
    SELECT * FROM revenue_ledger
     WHERE occurred_at >= ? AND occurred_at < ? AND (is_test = 0 OR ? = 1)
     ORDER BY occurred_at DESC
  `).bind(fromIso, toIso, includeTest ? 1 : 0).all();
  return rows.results.map((row) => ({
    entryId: String(row.entry_id),
    sourceType: String(row.source_type) as RevenueSource,
    providerId: String(row.provider_id),
    campaignId: optional(row.campaign_id),
    pageId: optional(row.page_id),
    calculatorId: optional(row.calculator_id),
    vertical: optional(row.vertical),
    locale: optional(row.locale),
    eventId: optional(row.event_id),
    providerReference: optional(row.provider_reference),
    amount: money(Number(row.amount_minor), 'USD'),
    status: String(row.status) as RevenueStatus,
    isTest: row.is_test === 1,
    occurredAt: String(row.occurred_at),
    reportedAt: optional(row.reported_at),
    confirmedAt: optional(row.confirmed_at),
    paidAt: optional(row.paid_at),
    reversedAt: optional(row.reversed_at),
  }));
}

/**
 * Bump an aggregate counter.
 *
 * Counters, not a row per visit. The denominators a dashboard needs — sessions,
 * impressions, CTA views — are counts, and keeping a row per person to derive a
 * count is collecting data for no reason.
 */
export async function incrementEventCounter(
  database: D1DatabaseLike,
  input: {
    eventName: string;
    pageId?: string;
    calculatorId?: string;
    vertical?: string;
    locale?: string;
    providerId?: string;
    placement?: string;
    by?: number;
  },
  at: number = Date.now(),
): Promise<void> {
  await database.prepare(`
    INSERT INTO monetization_events (day_bucket, event_name, page_id, calculator_id, vertical, locale, provider_id, placement, count)
    VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(day_bucket, event_name, page_id, calculator_id, vertical, locale, provider_id, placement)
    DO UPDATE SET count = count + excluded.count
  `).bind(
    dayBucket(at), input.eventName, input.pageId ?? '', input.calculatorId ?? '',
    input.vertical ?? '', input.locale ?? '', input.providerId ?? '', input.placement ?? '',
    input.by ?? 1,
  ).run();
}

export async function eventCounts(
  database: D1DatabaseLike,
  fromDay: string,
  toDay: string,
): Promise<Map<string, number>> {
  const rows = await database.prepare(`
    SELECT event_name, SUM(count) AS total FROM monetization_events
     WHERE day_bucket >= ? AND day_bucket <= ? GROUP BY event_name
  `).bind(fromDay, toDay).all<{ event_name: string; total: number }>();
  return new Map(rows.results.map((row) => [row.event_name, Number(row.total)]));
}

function optional(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}
