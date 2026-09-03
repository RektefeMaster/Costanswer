import currentIrsRetirementJson from '@/data/irs-retirement/current.json';
import { irsRetirementSnapshotSchema } from './irs-retirement';
import { assertManifestMatchesSnapshot, assertNormalizedHash, snapshotRecordFromEnvelope } from './envelope';
import { formatPublishingDateLong } from '@/lib/publishing';
import { z } from 'zod';

const manifestSchema = z.object({
  currentSnapshotId: z.string(),
  observationPeriod: z.string(),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
}).strict();

const envelopeSchema = z.object({
  manifest: manifestSchema,
  snapshot: irsRetirementSnapshotSchema,
}).strict();

export function validateIrsRetirementEnvelope(rawEnvelope: unknown) {
  const computed = assertNormalizedHash(
    snapshotRecordFromEnvelope(rawEnvelope, 'Bundled IRS retirement limits'),
    'Bundled IRS retirement-limit data',
  );
  const envelope = envelopeSchema.parse(rawEnvelope);
  assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computed, 'IRS retirement limits');
  return envelope;
}

const envelope = validateIrsRetirementEnvelope(currentIrsRetirementJson);
export const irsRetirementSnapshot = envelope.snapshot;
export const irsRetirementManifest = envelope.manifest;
export const irsRetirementLimits = irsRetirementSnapshot.limits;

export function irsRetirementPublishedLabel(snapshot = irsRetirementSnapshot): string {
  return formatPublishingDateLong(snapshot.publishedAt.slice(0, 10));
}
