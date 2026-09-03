import { US_STATES, type StateCode } from './states';

export const CENSUS_REGION_IDS = ['Northeast', 'Midwest', 'South', 'West'] as const;
export type CensusRegionId = (typeof CENSUS_REGION_IDS)[number];

export const CENSUS_REGION_BY_STATE: Record<StateCode, CensusRegionId> = {
  CT: 'Northeast',
  ME: 'Northeast',
  MA: 'Northeast',
  NH: 'Northeast',
  RI: 'Northeast',
  VT: 'Northeast',
  NJ: 'Northeast',
  NY: 'Northeast',
  PA: 'Northeast',
  IL: 'Midwest',
  IN: 'Midwest',
  IA: 'Midwest',
  KS: 'Midwest',
  MI: 'Midwest',
  MN: 'Midwest',
  MO: 'Midwest',
  NE: 'Midwest',
  ND: 'Midwest',
  OH: 'Midwest',
  SD: 'Midwest',
  WI: 'Midwest',
  AL: 'South',
  AR: 'South',
  DE: 'South',
  DC: 'South',
  FL: 'South',
  GA: 'South',
  KY: 'South',
  LA: 'South',
  MD: 'South',
  MS: 'South',
  NC: 'South',
  OK: 'South',
  SC: 'South',
  TN: 'South',
  TX: 'South',
  VA: 'South',
  WV: 'South',
  AK: 'West',
  AZ: 'West',
  CA: 'West',
  CO: 'West',
  HI: 'West',
  ID: 'West',
  MT: 'West',
  NV: 'West',
  NM: 'West',
  OR: 'West',
  UT: 'West',
  WA: 'West',
  WY: 'West',
};

export function getCensusRegion(stateCode: StateCode): CensusRegionId {
  return CENSUS_REGION_BY_STATE[stateCode];
}

export function getCensusRegionLabel(region: CensusRegionId): string {
  switch (region) {
    case 'Northeast':
      return 'Northeast';
    case 'Midwest':
      return 'Midwest';
    case 'South':
      return 'South';
    case 'West':
      return 'West';
    default: {
      const exhaustive: never = region;
      throw new Error(`Unhandled census region: ${exhaustive}`);
    }
  }
}

export function statesInCensusRegion(region: CensusRegionId): StateCode[] {
  return (Object.keys(US_STATES) as StateCode[]).filter((stateCode) => CENSUS_REGION_BY_STATE[stateCode] === region);
}
