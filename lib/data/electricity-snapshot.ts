import currentElectricityJson from '@/data/eia/current.json';
import type { EiaElectricitySnapshot, ElectricityStateRate } from './eia-electricity';
import { readVerifiedEnvelope } from './envelope';
import type { StateCode } from '@/lib/location/states';

const currentElectricityEnvelope = readVerifiedEnvelope<EiaElectricitySnapshot>(currentElectricityJson);
export const electricitySnapshot = currentElectricityEnvelope.snapshot;
export const electricityManifest = currentElectricityEnvelope.manifest;

const ratesByState = new Map(electricitySnapshot.states.map((row) => [row.stateCode, row]));

export function getElectricityRate(stateCode: StateCode): ElectricityStateRate {
  const rate = ratesByState.get(stateCode);
  if (!rate) throw new Error(`No published electricity rate for ${stateCode}`);
  return rate;
}
