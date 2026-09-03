import currentElectricityJson from '@/data/eia/current.json';
import { eiaElectricitySnapshotSchema, type ElectricityStateRate } from './eia-electricity';
import { assertManifestMatchesSnapshot, assertNormalizedHash, snapshotRecordFromEnvelope } from './envelope';
import type { StateCode } from '@/lib/location/states';
import { z } from 'zod';

const electricityManifestSchema = z.object({
  currentSnapshotId: z.string(),
  observationPeriod: z.string().regex(/^\d{4}-\d{2}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
}).strict();

const currentElectricityEnvelopeSchema = z.object({
  manifest: electricityManifestSchema,
  snapshot: eiaElectricitySnapshotSchema,
}).strict();

export function validateElectricityEnvelope(rawEnvelope: unknown) {
  const computedNormalizedHash = assertNormalizedHash(snapshotRecordFromEnvelope(rawEnvelope, 'Bundled EIA electricity'), 'Bundled EIA electricity data');
  const envelope = currentElectricityEnvelopeSchema.parse(rawEnvelope);
  assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computedNormalizedHash, 'EIA electricity');
  return envelope;
}

const currentElectricityEnvelope = validateElectricityEnvelope(currentElectricityJson);
export const electricitySnapshot = currentElectricityEnvelope.snapshot;
export const electricityManifest = currentElectricityEnvelope.manifest;

const ratesByState = new Map(electricitySnapshot.states.map((row) => [row.stateCode, row]));

export function getElectricityRate(stateCode: StateCode): ElectricityStateRate {
  const rate = ratesByState.get(stateCode);
  if (!rate) throw new Error(`No published electricity rate for ${stateCode}`);
  return rate;
}
