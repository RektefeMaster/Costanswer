import { geographySnapshot } from '@/lib/data/geography-snapshot';
import type { GeographyCbsa, GeographyCounty, GeographyPlace } from '@/lib/data/geography';
import { getStateName, isStateCode, type StateCode } from './states';
import {
  displayPlaceName,
  parseCanonicalLocationId,
  type CanonicalLocationId,
} from './ids';

export type SearchableLocationKind = 'state' | 'place' | 'cbsa';

export type LocationSearchHit = {
  id: CanonicalLocationId;
  kind: SearchableLocationKind;
  name: string;
  displayName: string;
  state: StateCode | null;
  stateName: string | null;
  subtitle: string;
};

type IndexedLocation = LocationSearchHit & {
  tokens: string[];
  compact: string;
};

const STATE_NAME_TO_CODE = new Map(Object.entries(
  Object.fromEntries(
    geographySnapshot.states.map((row) => [row.name.toLowerCase(), row.state as StateCode]),
  ),
));

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function searchCompact(value: string): string {
  return compact(value)
    .replace(/\bst\b/g, 'saint')
    .replace(/\bft\b/g, 'fort')
    .replace(/\bmt\b/g, 'mount');
}

function tokenize(value: string): string[] {
  const base = compact(value).split(' ').filter(Boolean);
  const synonyms: string[] = [];
  for (const token of base) {
    if (token === 'st') synonyms.push('saint');
    if (token === 'saint') synonyms.push('st');
    if (token === 'ft') synonyms.push('fort');
    if (token === 'fort') synonyms.push('ft');
    if (token === 'mt') synonyms.push('mount');
    if (token === 'mount') synonyms.push('mt');
  }
  return [...base, ...synonyms];
}

function placeDisplay(place: GeographyPlace): string {
  return `${displayPlaceName(place.name)}, ${place.state}`;
}

function cbsaDisplay(cbsa: GeographyCbsa): string {
  const states = cbsa.stateCodes.map((code) => code).join('-');
  return `${cbsa.name.replace(/,\s*[A-Z]{2}(?:-[A-Z]{2})*$/, '')}, ${states} metro`;
}

const index: IndexedLocation[] = [
  ...geographySnapshot.states.map((row) => ({
    id: row.id as CanonicalLocationId,
    kind: 'state' as const,
    name: row.name,
    displayName: row.name,
    state: row.state as StateCode,
    stateName: row.name,
    subtitle: 'State',
    tokens: tokenize(`${row.name} ${row.state}`),
    compact: compact(`${row.name} ${row.state}`),
  })),
  ...geographySnapshot.places.map((row) => ({
    id: row.id as CanonicalLocationId,
    kind: 'place' as const,
    name: displayPlaceName(row.name),
    displayName: placeDisplay(row),
    state: row.state as StateCode,
    stateName: getStateName(row.state as StateCode),
    subtitle: getStateName(row.state as StateCode),
    tokens: tokenize(`${displayPlaceName(row.name)} ${row.name} ${row.state}`),
    compact: compact(`${displayPlaceName(row.name)} ${row.state}`),
  })),
  ...geographySnapshot.cbsas.map((row) => ({
    id: row.id as CanonicalLocationId,
    kind: 'cbsa' as const,
    name: row.name,
    displayName: cbsaDisplay(row),
    state: row.multiState ? null : row.stateCodes[0] as StateCode,
    stateName: row.multiState ? null : getStateName(row.stateCodes[0] as StateCode),
    subtitle: row.multiState ? 'Multi-state metro' : `${getStateName(row.stateCodes[0] as StateCode)} metro`,
    tokens: tokenize(`${row.name} metro metropolitan ${row.stateCodes.join(' ')}`),
    compact: compact(row.name),
  })),
];

function parseStateHint(query: string): { rest: string; state: StateCode | null } {
  const trimmed = query.trim().replace(/\s+/g, ' ');
  const comma = /^(.*?),\s*([A-Za-z. ]+)$/.exec(trimmed);
  if (comma) {
    const hint = compact(comma[2]).replace(/\./g, '');
    if (hint.length === 2 && isStateCode(hint.toUpperCase())) {
      return { rest: comma[1], state: hint.toUpperCase() as StateCode };
    }
    const named = STATE_NAME_TO_CODE.get(hint);
    if (named) return { rest: comma[1], state: named };
  }
  const trailing = /^(.*?)\s+([A-Za-z]{2})$/.exec(trimmed);
  if (trailing && isStateCode(trailing[2].toUpperCase())) {
    return { rest: trailing[1], state: trailing[2].toUpperCase() as StateCode };
  }
  const trailingName = /^(.*?)\s+([A-Za-z][A-Za-z ]+)$/.exec(trimmed);
  if (trailingName) {
    const named = STATE_NAME_TO_CODE.get(compact(trailingName[2]));
    if (named) return { rest: trailingName[1], state: named };
  }
  return { rest: trimmed, state: null };
}

const KIND_ORDER: Record<SearchableLocationKind, number> = { state: 0, place: 1, cbsa: 2 };

function scoreHit(hit: IndexedLocation, queryCompact: string, queryTokens: string[]): number {
  const queryKey = searchCompact(queryCompact);
  const nameKey = searchCompact(hit.name);
  const displayKey = searchCompact(hit.displayName);
  const compactKey = searchCompact(hit.compact);
  if (compactKey === queryKey || displayKey === queryKey || nameKey === queryKey) {
    return 100;
  }
  // Use the raw compact query length so "st" does not become "saint" and match every St. city.
  if (queryCompact.length < 3) return 0;
  if (nameKey.startsWith(queryKey)) return 88;
  if (compactKey.startsWith(queryKey)) return 80;
  const matched = queryTokens.filter((token) => hit.tokens.some((item) => item === token || (token.length >= 4 && item.startsWith(token))));
  if (matched.length === 0) return 0;
  if (matched.length !== queryTokens.length) return 0;
  return 40 + matched.length * 5;
}

export function searchLocations(query: string, limit = 8): LocationSearchHit[] {
  const trimmed = query.trim();
  if (trimmed.length === 2 && isStateCode(trimmed.toUpperCase())) {
    const code = trimmed.toUpperCase() as StateCode;
    const stateHit = index.find((hit) => hit.kind === 'state' && hit.state === code);
    const inState = index.filter((hit) => hit.id !== stateHit?.id && (
      hit.state === code
      || (hit.kind === 'cbsa' && geographySnapshot.cbsas.find((row) => row.id === hit.id)?.stateCodes.includes(code))
    ));
    return [stateHit, ...inState].filter((hit): hit is IndexedLocation => Boolean(hit)).slice(0, limit).map(publicHit);
  }
  const parsed = parseStateHint(query);
  const queryCompact = compact(parsed.rest);
  if (!queryCompact) return [];
  const queryTokens = tokenize(parsed.rest);
  const scored = index
    .filter((hit) => !parsed.state || hit.state === parsed.state || (hit.kind === 'cbsa' && geographySnapshot.cbsas.find((row) => row.id === hit.id)?.stateCodes.includes(parsed.state!)))
    .map((hit) => ({ hit, score: scoreHit(hit, queryCompact, queryTokens) }))
    .filter((row) => row.score > 0)
    .sort((left, right) => (
      right.score - left.score
      || KIND_ORDER[left.hit.kind] - KIND_ORDER[right.hit.kind]
      || left.hit.displayName.localeCompare(right.hit.displayName)
    ));

  const seen = new Set<string>();
  const results: LocationSearchHit[] = [];
  for (const row of scored) {
    if (seen.has(row.hit.id)) continue;
    seen.add(row.hit.id);
    results.push(publicHit(row.hit));
    if (results.length >= limit) break;
  }
  return results;
}

function publicHit(hit: IndexedLocation): LocationSearchHit {
  const { tokens, compact: _compact, ...rest } = hit;
  return rest;
}

export function getLocationSearchHit(id: string): LocationSearchHit | undefined {
  const hit = index.find((row) => row.id === id);
  if (!hit) return undefined;
  return publicHit(hit);
}

export function requireCanonicalLocation(id: string): CanonicalLocationId {
  parseCanonicalLocationId(id);
  return id as CanonicalLocationId;
}

export function getPlace(geoid: string): GeographyPlace | undefined {
  return geographySnapshot.places.find((row) => row.geoid === geoid);
}

export function getCbsa(code: string): GeographyCbsa | undefined {
  return geographySnapshot.cbsas.find((row) => row.cbsaCode === code);
}

export function getCounty(geoid: string): GeographyCounty | undefined {
  return geographySnapshot.counties.find((row) => row.geoid === geoid);
}
