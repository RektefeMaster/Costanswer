import currentGasolineJson from '@/data/eia-gasoline/current.json';
import { eiaGasolineSnapshotSchema, type GasolineGeography } from './eia-gasoline';
import { assertManifestMatchesSnapshot, assertNormalizedHash, snapshotRecordFromEnvelope } from './envelope';
import { gasolineGeographyForState } from '@/lib/location/gasoline-geography';
import type { StateCode } from '@/lib/location/states';
import { z } from 'zod';

const gasolineManifestSchema = z.object({
  currentSnapshotId: z.string(),
  observationPeriod: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
}).strict();

const currentGasolineEnvelopeSchema = z.object({
  manifest: gasolineManifestSchema,
  snapshot: eiaGasolineSnapshotSchema,
}).strict();

export function validateGasolineEnvelope(rawEnvelope: unknown) {
  const computedNormalizedHash = assertNormalizedHash(snapshotRecordFromEnvelope(rawEnvelope, 'Bundled EIA gasoline'), 'Bundled EIA gasoline data');
  const envelope = currentGasolineEnvelopeSchema.parse(rawEnvelope);
  assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computedNormalizedHash, 'EIA gasoline');
  return envelope;
}

const currentGasolineEnvelope = validateGasolineEnvelope(currentGasolineJson);
export const gasolineSnapshot = currentGasolineEnvelope.snapshot;
export const gasolineManifest = currentGasolineEnvelope.manifest;

const geographyByCode = new Map(gasolineSnapshot.geographies.map((row) => [row.code, row]));

export function getGasolineGeography(code: GasolineGeography['code']): GasolineGeography {
  const geography = geographyByCode.get(code);
  if (!geography) throw new Error(`No published gasoline geography for ${code}`);
  return geography;
}

export function getGasolinePriceForState(stateCode: StateCode): GasolineGeography {
  return getGasolineGeography(gasolineGeographyForState(stateCode));
}
