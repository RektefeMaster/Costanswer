import { isStateCode, type StateCode } from './states';

export const GEOGRAPHY_KINDS = ['state', 'county', 'place', 'cbsa', 'hud-fmr'] as const;
export type GeographyKind = (typeof GEOGRAPHY_KINDS)[number];

export type CanonicalLocationId =
  | `state:${StateCode}`
  | `county:${string}`
  | `place:${string}`
  | `cbsa:${string}`
  | `hud-fmr:${string}`;

const STATE_ID = /^state:([A-Z]{2})$/;
const COUNTY_ID = /^county:(\d{5})$/;
const PLACE_ID = /^place:(\d{7})$/;
const CBSA_ID = /^cbsa:(\d{5})$/;
const HUD_ID = /^hud-fmr:([A-Z0-9]+)$/;

export function stateId(state: StateCode): CanonicalLocationId {
  return `state:${state}`;
}

export function countyId(geoid: string): CanonicalLocationId {
  if (!/^\d{5}$/.test(geoid)) throw new Error(`Invalid county GEOID: ${geoid}`);
  return `county:${geoid}`;
}

export function placeId(geoid: string): CanonicalLocationId {
  if (!/^\d{7}$/.test(geoid)) throw new Error(`Invalid place GEOID: ${geoid}`);
  return `place:${geoid}`;
}

export function cbsaId(code: string): CanonicalLocationId {
  if (!/^\d{5}$/.test(code)) throw new Error(`Invalid CBSA code: ${code}`);
  return `cbsa:${code}`;
}

export function hudFmrId(hudAreaCode: string): CanonicalLocationId {
  if (!/^[A-Z0-9]+$/.test(hudAreaCode)) throw new Error(`Invalid HUD FMR area code: ${hudAreaCode}`);
  return `hud-fmr:${hudAreaCode}`;
}

export function parseCanonicalLocationId(value: string): { kind: GeographyKind; key: string } {
  const state = STATE_ID.exec(value);
  if (state) {
    if (!isStateCode(state[1])) throw new Error(`Unknown state in canonical ID: ${value}`);
    return { kind: 'state', key: state[1] };
  }
  const county = COUNTY_ID.exec(value);
  if (county) return { kind: 'county', key: county[1] };
  const place = PLACE_ID.exec(value);
  if (place) return { kind: 'place', key: place[1] };
  const cbsa = CBSA_ID.exec(value);
  if (cbsa) return { kind: 'cbsa', key: cbsa[1] };
  const hud = HUD_ID.exec(value);
  if (hud) return { kind: 'hud-fmr', key: hud[1] };
  throw new Error(`Invalid canonical location ID: ${value}`);
}

export function isCanonicalLocationId(value: string): value is CanonicalLocationId {
  try {
    parseCanonicalLocationId(value);
    return true;
  } catch {
    return false;
  }
}

export function displayPlaceName(officialName: string): string {
  return officialName
    .replace(/\s+consolidated government \(balance\)$/i, '')
    .replace(/\s+metropolitan government \(balance\)$/i, '')
    .replace(/\s+unified government(?: \(balance\))?$/i, '')
    .replace(/\s+(city|town|village|CDP|borough)$/i, '')
    .trim();
}
