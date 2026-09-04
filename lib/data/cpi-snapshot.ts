import currentCpiJson from '@/data/bls-cpi/current.json';
import { cpiIndexForPeriod, cpiPeriodBounds, type BlsCpiSnapshot, type CpiObservation } from './bls-cpi';
import { readVerifiedEnvelope } from './envelope';

const currentCpiEnvelope = readVerifiedEnvelope<BlsCpiSnapshot>(currentCpiJson);
export const cpiSnapshot = currentCpiEnvelope.snapshot;
export const cpiManifest = currentCpiEnvelope.manifest;

export function getCpiIndex(period: string, observations: CpiObservation[] = cpiSnapshot.observations): number {
  return cpiIndexForPeriod(observations, period);
}

export function getCpiBounds(observations: CpiObservation[] = cpiSnapshot.observations) {
  return cpiPeriodBounds(observations);
}
