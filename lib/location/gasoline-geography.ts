import { US_STATES, type StateCode } from './states';

export const EIA_GASOLINE_GEOGRAPHY_CODES = [
  'NUS', 'R10', 'R1X', 'R1Y', 'R1Z', 'R20', 'R30', 'R40', 'R50', 'R5XCA',
  'SCA', 'SCO', 'SFL', 'SMA', 'SMN', 'SNY', 'SOH', 'STX', 'SWA',
] as const;

export type EiaGasolineGeographyCode = (typeof EIA_GASOLINE_GEOGRAPHY_CODES)[number];

export const GASOLINE_GEOGRAPHY_BY_STATE: Record<StateCode, Exclude<EiaGasolineGeographyCode, 'NUS'>> = {
  CT: 'R1X',
  ME: 'R1X',
  MA: 'SMA',
  NH: 'R1X',
  RI: 'R1X',
  VT: 'R1X',
  DE: 'R1Y',
  DC: 'R1Y',
  MD: 'R1Y',
  NJ: 'R1Y',
  NY: 'SNY',
  PA: 'R1Y',
  FL: 'SFL',
  GA: 'R1Z',
  NC: 'R1Z',
  SC: 'R1Z',
  VA: 'R1Z',
  WV: 'R1Z',
  IL: 'R20',
  IN: 'R20',
  IA: 'R20',
  KS: 'R20',
  KY: 'R20',
  MI: 'R20',
  MN: 'SMN',
  MO: 'R20',
  NE: 'R20',
  ND: 'R20',
  OH: 'SOH',
  OK: 'R20',
  SD: 'R20',
  TN: 'R20',
  WI: 'R20',
  AL: 'R30',
  AR: 'R30',
  LA: 'R30',
  MS: 'R30',
  NM: 'R30',
  TX: 'STX',
  CO: 'SCO',
  ID: 'R40',
  MT: 'R40',
  UT: 'R40',
  WY: 'R40',
  AK: 'R5XCA',
  AZ: 'R5XCA',
  CA: 'SCA',
  HI: 'R5XCA',
  NV: 'R5XCA',
  OR: 'R5XCA',
  WA: 'SWA',
};

export function isEiaGasolineGeographyCode(value: string): value is EiaGasolineGeographyCode {
  return (EIA_GASOLINE_GEOGRAPHY_CODES as readonly string[]).includes(value);
}

export function gasolineGeographyForState(stateCode: StateCode): Exclude<EiaGasolineGeographyCode, 'NUS'> {
  return GASOLINE_GEOGRAPHY_BY_STATE[stateCode];
}

export function statesUsingGasolineGeography(code: EiaGasolineGeographyCode): StateCode[] {
  return (Object.keys(US_STATES) as StateCode[]).filter((stateCode) => GASOLINE_GEOGRAPHY_BY_STATE[stateCode] === code);
}
