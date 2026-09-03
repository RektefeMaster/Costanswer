import currentBeaJson from '@/data/bea-rpp/current.json';
import { beaRppSnapshotSchema, type BeaRppCategory, type BeaRppRow } from './bea-rpp';
import { assertManifestMatchesSnapshot, assertNormalizedHash, snapshotRecordFromEnvelope } from './envelope';
import { z } from 'zod';
import type { StateCode } from '@/lib/location/states';

const manifestSchema = z.object({
  currentSnapshotId: z.string(),
  observationPeriod: z.string(),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
}).strict();

const envelopeSchema = z.object({
  manifest: manifestSchema,
  snapshot: beaRppSnapshotSchema,
}).strict();

export function validateBeaRppEnvelope(rawEnvelope: unknown) {
  const computed = assertNormalizedHash(snapshotRecordFromEnvelope(rawEnvelope, 'Bundled BEA RPP'), 'Bundled BEA RPP data');
  const envelope = envelopeSchema.parse(rawEnvelope);
  assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computed, 'BEA RPP');
  return envelope;
}

const envelope = validateBeaRppEnvelope(currentBeaJson);
export const beaRppSnapshot = envelope.snapshot;
export const beaRppManifest = envelope.manifest;

const stateByFips = new Map<string, BeaRppRow[]>();
for (const row of beaRppSnapshot.states) {
  const list = stateByFips.get(row.geoFips) ?? [];
  list.push(row);
  stateByFips.set(row.geoFips, list);
}
const metroByCbsa = new Map<string, BeaRppRow[]>();
for (const row of beaRppSnapshot.metros) {
  const list = metroByCbsa.get(row.geoFips) ?? [];
  list.push(row);
  metroByCbsa.set(row.geoFips, list);
}

export function stateFipsToBeaGeo(stateFips: string): string {
  return `${stateFips}000`;
}

export function getBeaStateRpp(state: StateCode, stateFips: string, category: BeaRppCategory = 'allItems'): BeaRppRow | undefined {
  return stateByFips.get(stateFipsToBeaGeo(stateFips))?.find((row) => row.category === category);
}

export function getBeaMetroRpp(cbsaCode: string, category: BeaRppCategory = 'allItems'): BeaRppRow | undefined {
  return metroByCbsa.get(cbsaCode)?.find((row) => row.category === category);
}

export function rppIndexToShareAboveNational(value: number): number {
  return value - 100;
}
