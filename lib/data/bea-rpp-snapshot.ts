import currentBeaJson from '@/data/bea-rpp/current.json';
import type { BeaRppCategory, BeaRppRow, BeaRppSnapshot } from './bea-rpp';
import { readVerifiedEnvelope } from './envelope';
import type { StateCode } from '@/lib/location/states';

const envelope = readVerifiedEnvelope<BeaRppSnapshot>(currentBeaJson);
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
