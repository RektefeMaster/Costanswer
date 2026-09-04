import currentTaxJson from '@/data/tax/2026.json';
import type { TaxYearSnapshot } from './schema';

/**
 * Hash and schema checks for this snapshot live in `lib/data/verify.ts` and run
 * in `npm run verify:tax` and the test suite, not on every page load.
 */
const snapshotsByYear = new Map<number, TaxYearSnapshot>([
  [2026, currentTaxJson as unknown as TaxYearSnapshot],
]);

export function getTaxYearSnapshot(taxYear: number): TaxYearSnapshot {
  const snapshot = snapshotsByYear.get(taxYear);
  if (!snapshot) {
    throw new Error(`Tax year ${taxYear} is not in the published snapshot. Available years: ${[...snapshotsByYear.keys()].join(', ')}.`);
  }
  return snapshot;
}

export function listPublishedTaxYears(): number[] {
  return [...snapshotsByYear.keys()].sort((left, right) => left - right);
}

export const taxSnapshot = getTaxYearSnapshot(2026);
