import electricitySnapshotJson from '@/data/eia/electricity-retail-sales.normalized.json';
import electricityManifestJson from '@/data/eia/manifest.json';
import { eiaElectricitySnapshotSchema, type ElectricityStateRate } from './eia-electricity';
import type { StateCode } from '@/lib/location/states';
import { z } from 'zod';

export const electricitySnapshot = eiaElectricitySnapshotSchema.parse(electricitySnapshotJson);
export const electricityManifest = z.object({
  currentSnapshotId: z.string(),
  observationPeriod: z.string().regex(/^\d{4}-\d{2}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
}).parse(electricityManifestJson);

if (
  electricityManifest.currentSnapshotId !== electricitySnapshot.snapshotId
  || electricityManifest.observationPeriod !== electricitySnapshot.observationPeriod
  || electricityManifest.normalizedSha256 !== electricitySnapshot.normalizedSha256
) {
  throw new Error('EIA manifest does not match the promoted electricity snapshot. Publication is incomplete.');
}

const ratesByState = new Map(electricitySnapshot.states.map((row) => [row.stateCode, row]));

export function getElectricityRate(stateCode: StateCode): ElectricityStateRate {
  const rate = ratesByState.get(stateCode);
  if (!rate) throw new Error(`No published electricity rate for ${stateCode}`);
  return rate;
}
