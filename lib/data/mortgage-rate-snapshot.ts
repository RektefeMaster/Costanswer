import currentMortgageRateJson from '@/data/freddie-mac/current.json';
import { freddieMacPmmsSnapshotSchema } from './freddie-mac-pmms';
import { assertManifestMatchesSnapshot, assertNormalizedHash, snapshotRecordFromEnvelope } from './envelope';
import { z } from 'zod';

const mortgageRateManifestSchema = z.object({
  currentSnapshotId: z.string(),
  observationPeriod: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
}).strict();

const currentMortgageRateEnvelopeSchema = z.object({
  manifest: mortgageRateManifestSchema,
  snapshot: freddieMacPmmsSnapshotSchema,
}).strict();

export function validateMortgageRateEnvelope(rawEnvelope: unknown) {
  const computedNormalizedHash = assertNormalizedHash(snapshotRecordFromEnvelope(rawEnvelope, 'Bundled Freddie Mac PMMS'), 'Bundled Freddie Mac PMMS data');
  const envelope = currentMortgageRateEnvelopeSchema.parse(rawEnvelope);
  assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computedNormalizedHash, 'Freddie Mac PMMS');
  return envelope;
}

const currentMortgageRateEnvelope = validateMortgageRateEnvelope(currentMortgageRateJson);
export const mortgageRateSnapshot = currentMortgageRateEnvelope.snapshot;
export const mortgageRateManifest = currentMortgageRateEnvelope.manifest;
