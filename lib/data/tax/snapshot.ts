import currentTaxJson from '@/data/tax/2026.json';
import { sha256 } from '@/lib/data/sha256';
import { taxYearSnapshotSchema, type TaxYearSnapshot } from './schema';

const taxEnvelopeSchema = taxYearSnapshotSchema;

export function validateTaxYearSnapshot(rawSnapshot: unknown): TaxYearSnapshot {
  if (!rawSnapshot || typeof rawSnapshot !== 'object' || !('normalizedSha256' in rawSnapshot)) {
    throw new Error('Bundled tax snapshot is missing its normalized hash.');
  }
  const { normalizedSha256: embeddedNormalizedHash, ...hashableSnapshot } = rawSnapshot as Record<string, unknown>;
  const computedNormalizedHash = sha256(JSON.stringify(hashableSnapshot));
  if (computedNormalizedHash !== embeddedNormalizedHash) {
    throw new Error('Bundled tax data failed its normalized SHA-256 integrity check.');
  }
  const snapshot = taxEnvelopeSchema.parse(rawSnapshot);
  if (snapshot.normalizedSha256 !== computedNormalizedHash) {
    throw new Error('Tax snapshot hash does not match the parsed document.');
  }
  return snapshot;
}

const snapshotsByYear = new Map<number, TaxYearSnapshot>([
  [2026, validateTaxYearSnapshot(currentTaxJson)],
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
