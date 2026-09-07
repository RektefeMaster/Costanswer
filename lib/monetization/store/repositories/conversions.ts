/** Storing an imported affiliate statement, exactly once. */
import { generateId } from '../../ids';
import type { ConversionLine } from '../../affiliate/conversions';
import { nowIso, type D1DatabaseLike } from '../d1';
import { recordRevenue } from './revenue';

export type ImportResult = {
  readonly batchId: string;
  readonly imported: number;
  readonly duplicates: number;
  readonly totalMinor: number;
};

export async function importConversions(
  database: D1DatabaseLike,
  lines: readonly ConversionLine[],
  actor: string,
  at: number = Date.now(),
): Promise<ImportResult> {
  const batchId = generateId('revenue', at);
  const timestamp = nowIso(at);
  let imported = 0;
  let duplicates = 0;
  let totalMinor = 0;

  for (const line of lines) {
    // The ledger row first, so a crash between the two leaves an unrecorded
    // import rather than money with no provenance.
    const entry = await recordRevenue(database, {
      sourceType: 'affiliate',
      providerId: line.merchantId,
      providerReference: `${line.merchantId}:${line.lineReference}`,
      amount: line.amount,
      status: line.status,
      isTest: false,
      occurredAt: `${line.occurredOn}T00:00:00Z`,
      reportedAt: timestamp,
    }, at);

    if (!entry) {
      duplicates += 1;
      continue;
    }

    try {
      await database.prepare(`
        INSERT INTO affiliate_conversion_imports (
          import_id, batch_id, merchant_id, line_reference, occurred_on,
          amount_minor, currency, status, revenue_entry_id, imported_by, created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        generateId('revenue', at), batchId, line.merchantId, line.lineReference,
        line.occurredOn, line.amount.minorUnits, line.amount.currency, line.status,
        entry.entryId, actor, timestamp,
      ).run();
      imported += 1;
      totalMinor += line.amount.minorUnits;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/UNIQUE|constraint/i.test(message)) {
        duplicates += 1;
        continue;
      }
      throw error;
    }
  }

  return { batchId, imported, duplicates, totalMinor };
}

export async function recentImports(
  database: D1DatabaseLike,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  const rows = await database.prepare(
    'SELECT * FROM affiliate_conversion_imports ORDER BY created_at DESC LIMIT ?',
  ).bind(limit).all();
  return rows.results;
}
