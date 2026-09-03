import currentAcsJson from '@/data/census-acs/current.json';
import { censusAcsSnapshotSchema, type CensusAcsRow } from './census-acs';
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
  snapshot: censusAcsSnapshotSchema,
}).strict();

export function validateAcsEnvelope(rawEnvelope: unknown) {
  const computed = assertNormalizedHash(snapshotRecordFromEnvelope(rawEnvelope, 'Bundled ACS'), 'Bundled ACS data');
  const envelope = envelopeSchema.parse(rawEnvelope);
  assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computed, 'Census ACS');
  return envelope;
}

const envelope = validateAcsEnvelope(currentAcsJson);
export const acsSnapshot = envelope.snapshot;
export const acsManifest = envelope.manifest;
export type { CensusAcsRow } from './census-acs';

const rowsByGeoId = new Map(acsSnapshot.rows.map((row) => [row.geoId, row]));

export function getAcsRow(geoId: string): CensusAcsRow | undefined {
  return rowsByGeoId.get(geoId);
}
