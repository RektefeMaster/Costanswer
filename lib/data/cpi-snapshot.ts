import currentCpiJson from '@/data/bls-cpi/current.json';
import { blsCpiSnapshotSchema, cpiIndexForPeriod, cpiPeriodBounds, type CpiObservation } from './bls-cpi';
import { assertManifestMatchesSnapshot, assertNormalizedHash, snapshotRecordFromEnvelope } from './envelope';
import { z } from 'zod';

const cpiManifestSchema = z.object({
  currentSnapshotId: z.string(),
  observationPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
}).strict();

const currentCpiEnvelopeSchema = z.object({
  manifest: cpiManifestSchema,
  snapshot: blsCpiSnapshotSchema,
}).strict();

export function validateCpiEnvelope(rawEnvelope: unknown) {
  const computedNormalizedHash = assertNormalizedHash(snapshotRecordFromEnvelope(rawEnvelope, 'Bundled BLS CPI'), 'Bundled BLS CPI data');
  const envelope = currentCpiEnvelopeSchema.parse(rawEnvelope);
  assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computedNormalizedHash, 'BLS CPI');
  return envelope;
}

const currentCpiEnvelope = validateCpiEnvelope(currentCpiJson);
export const cpiSnapshot = currentCpiEnvelope.snapshot;
export const cpiManifest = currentCpiEnvelope.manifest;

export function getCpiIndex(period: string, observations: CpiObservation[] = cpiSnapshot.observations): number {
  return cpiIndexForPeriod(observations, period);
}

export function getCpiBounds(observations: CpiObservation[] = cpiSnapshot.observations) {
  return cpiPeriodBounds(observations);
}
