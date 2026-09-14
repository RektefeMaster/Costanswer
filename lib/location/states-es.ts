import { US_STATES, type StateCode } from './states';

/**
 * How US Spanish names the jurisdiction, for running text.
 *
 * URLs keep the English slugs people actually type (`texas`, `new-york`).
 * The display name is what a sentence says: "en Nueva York", not "en New York".
 */
const STATE_NAME_ES: Record<StateCode, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'Distrito de Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawái',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Luisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Míchigan',
  MN: 'Minnesota',
  MS: 'Misisipi',
  MO: 'Misuri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'Nuevo Hampshire',
  NJ: 'Nueva Jersey',
  NM: 'Nuevo México',
  NY: 'Nueva York',
  NC: 'Carolina del Norte',
  ND: 'Dakota del Norte',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregón',
  PA: 'Pensilvania',
  RI: 'Rhode Island',
  SC: 'Carolina del Sur',
  SD: 'Dakota del Sur',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'Virginia Occidental',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

export function getStateNameEs(code: StateCode): string {
  return STATE_NAME_ES[code];
}

export function stateAreaLabelEs(code: StateCode | 'US'): string {
  return code === 'US' ? 'Estados Unidos' : getStateNameEs(code);
}

/** Exhaustiveness: every English jurisdiction has a Spanish display name. */
(Object.keys(US_STATES) as StateCode[]).forEach((code) => {
  if (!STATE_NAME_ES[code]) throw new Error(`Missing Spanish state name for ${code}.`);
});
