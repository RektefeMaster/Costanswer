import currentUsdaJson from '@/data/usda-food/current.json';
import { usdaFoodSnapshotSchema } from './usda-food';
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
  snapshot: usdaFoodSnapshotSchema,
}).strict();

export function validateUsdaFoodEnvelope(rawEnvelope: unknown) {
  const computed = assertNormalizedHash(snapshotRecordFromEnvelope(rawEnvelope, 'Bundled USDA food plans'), 'Bundled USDA food plan data');
  const envelope = envelopeSchema.parse(rawEnvelope);
  assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computed, 'USDA Food Plans');
  return envelope;
}

const envelope = validateUsdaFoodEnvelope(currentUsdaJson);
export const usdaFoodSnapshot = envelope.snapshot;
export const usdaFoodManifest = envelope.manifest;
