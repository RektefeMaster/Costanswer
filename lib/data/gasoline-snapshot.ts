import currentGasolineJson from '@/data/eia-gasoline/current.json';
import type { EiaGasolineSnapshot, GasolineGeography } from './eia-gasoline';
import { readVerifiedEnvelope } from './envelope';
import { gasolineGeographyForState } from '@/lib/location/gasoline-geography';
import type { StateCode } from '@/lib/location/states';

const currentGasolineEnvelope = readVerifiedEnvelope<EiaGasolineSnapshot>(currentGasolineJson);
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
