import currentInsuranceJson from '@/data/naic-insurance/current.json';
import { readVerifiedEnvelope } from './envelope';
import type { InsuranceStateRate, NaicInsuranceSnapshot } from './naic-insurance';
import type { StateCode } from '@/lib/location/states';

const envelope = readVerifiedEnvelope<NaicInsuranceSnapshot>(currentInsuranceJson);
export const insuranceSnapshot = envelope.snapshot;
export const insuranceManifest = envelope.manifest;
const ratesByState = new Map(insuranceSnapshot.states.map((row) => [row.stateCode, row]));

export function getInsuranceStateRate(stateCode: StateCode): InsuranceStateRate {
  const row = ratesByState.get(stateCode);
  if (!row) throw new Error(`No published insurance benchmark for ${stateCode}.`);
  return row;
}
