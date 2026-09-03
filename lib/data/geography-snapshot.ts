import currentGeographyJson from '@/data/geography/current.json';
import { geographySnapshotSchema } from './geography';
import { assertManifestMatchesSnapshot, assertNormalizedHash, snapshotRecordFromEnvelope } from './envelope';
import { z } from 'zod';

const manifestSchema = z.object({
  currentSnapshotId: z.string(),
  observationPeriod: z.string(),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
}).strict();

const envelopeSchema = z.object({
  manifest: manifestSchema,
  snapshot: geographySnapshotSchema,
}).strict();

export function validateGeographyEnvelope(rawEnvelope: unknown) {
  const computed = assertNormalizedHash(snapshotRecordFromEnvelope(rawEnvelope, 'Bundled geography'), 'Bundled geography data');
  const envelope = envelopeSchema.parse(rawEnvelope);
  assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computed, 'Geography');
  return envelope;
}

const envelope = validateGeographyEnvelope(currentGeographyJson);
export const geographySnapshot = envelope.snapshot;
export const geographyManifest = envelope.manifest;
