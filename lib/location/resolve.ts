import { geographySnapshot } from '@/lib/data/geography-snapshot';
import { getAcsRow } from '@/lib/data/acs-snapshot';
import type { CensusAcsRow } from '@/lib/data/census-acs';
import { getBeaMetroRpp, getBeaStateRpp } from '@/lib/data/bea-rpp-snapshot';
import { resolveHudFmrSnapshot, uniqueHudAreaForCounty } from '@/lib/data/hud-fmr-snapshot';
import type { HudFmrArea, HudFmrSnapshot } from '@/lib/data/hud-fmr';
import { gasolineGeographyForState } from './gasoline-geography';
import { getStateName, isStateCode, type StateCode } from './states';
import { displayPlaceName, parseCanonicalLocationId, type CanonicalLocationId } from './ids';
import { getCbsa, getCounty, getPlace } from './search';
import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';

export type CoverageStatus = 'exact' | 'uniqueDerived' | 'ambiguous' | 'unavailable' | 'fallback' | 'national';

export type HousingCoverage =
  | { status: 'exact' | 'uniqueDerived'; area: HudFmrArea; countyGeoids: string[]; method: string }
  | { status: 'ambiguous'; countyGeoids: string[]; hudAreaCodes: string[]; message: string }
  | { status: 'unavailable'; message: string };

export type LocationCoverage = {
  locationId: CanonicalLocationId;
  displayName: string;
  kind: ReturnType<typeof parseCanonicalLocationId>['kind'];
  state: StateCode | null;
  stateAmbiguous: boolean;
  census: { status: CoverageStatus; geoId: string | null; label: string; row: CensusAcsRow | null };
  hud: HousingCoverage;
  bea: {
    status: CoverageStatus;
    geography: 'metro' | 'state';
    label: string;
    cbsaCode: string | null;
    allItems: number | null;
    fallback: 'exactMetro' | 'stateFallback' | 'unavailable';
  };
  eiaGasoline: { status: CoverageStatus; label: string; geographyCode: string | null };
  eiaElectricity: { status: CoverageStatus; label: string };
  food: { status: CoverageStatus; label: string };
  eligibleStates: StateCode[];
  countyChoices: Array<{ geoid: string; name: string; state: StateCode }>;
};

function censusGeoId(kind: 'state' | 'county' | 'place' | 'cbsa', key: string): string {
  if (kind === 'state') return `0400000US${key}`;
  if (kind === 'county') return `0500000US${key}`;
  if (kind === 'place') return `1600000US${key}`;
  return `310M700US${key}`;
}

function countyChoicesFor(geoids: string[]): Array<{ geoid: string; name: string; state: StateCode }> {
  return geoids.flatMap((geoid) => {
    const county = getCounty(geoid);
    if (!county) return [];
    return [{ geoid: county.geoid, name: county.name, state: county.state as StateCode }];
  }).sort((left, right) => left.name.localeCompare(right.name) || left.state.localeCompare(right.state) || left.geoid.localeCompare(right.geoid));
}

const HUD_MULTI_AREA_MESSAGE = 'This location maps to more than one HUD Fair Market Rent area. Choose a county or enter housing cost manually.';
const HUD_SPLIT_COUNTY_MESSAGE = 'This county contains more than one HUD Fair Market Rent area. HUD does not publish a single value for the whole county. Enter housing cost manually.';

function uniqueHudFromCounties(snapshot: HudFmrSnapshot, countyGeoids: string[]): HousingCoverage {
  const areas = new Map<string, HudFmrArea>();
  const ambiguousCodes = new Set<string>();
  const resolvedCounties: string[] = [];
  const knownGeoids = countyGeoids.filter((geoid) => Boolean(getCounty(geoid)));
  for (const geoid of knownGeoids) {
    const result = uniqueHudAreaForCounty(snapshot, geoid);
    if (result === 'ambiguous') {
      const row = snapshot.ambiguousCounties.find((item: { countyGeoid: string; hudAreaCodes: string[] }) => item.countyGeoid === geoid);
      row?.hudAreaCodes.forEach((code: string) => ambiguousCodes.add(code));
      continue;
    }
    if (!result) continue;
    resolvedCounties.push(geoid);
    areas.set(result.hudAreaCode, result);
  }
  if (areas.size === 1 && ambiguousCodes.size === 0) {
    const area = [...areas.values()][0];
    return { status: 'uniqueDerived', area, countyGeoids: resolvedCounties, method: 'county-to-hud-unique' };
  }
  if (areas.size === 0 && ambiguousCodes.size > 0 && knownGeoids.length === 1) {
    return {
      status: 'ambiguous',
      countyGeoids: knownGeoids,
      hudAreaCodes: [...ambiguousCodes],
      message: HUD_SPLIT_COUNTY_MESSAGE,
    };
  }
  if (areas.size > 1 || ambiguousCodes.size > 0) {
    return {
      status: 'ambiguous',
      countyGeoids: knownGeoids,
      hudAreaCodes: [...new Set([...areas.keys(), ...ambiguousCodes])],
      message: HUD_MULTI_AREA_MESSAGE,
    };
  }
  return { status: 'unavailable', message: 'Housing benchmark unavailable for this selected location. Try a metro or county, or enter housing cost manually.' };
}

function ambiguousCountyChoices(hud: HousingCoverage, geoids: string[]): Array<{ geoid: string; name: string; state: StateCode }> {
  if (hud.status !== 'ambiguous') return [];
  const choices = countyChoicesFor(geoids);
  return choices.length > 1 ? choices : [];
}

export function resolveLocationCoverage(input: {
  locationId: string;
  residentialState?: string;
  countyGeoid?: string;
  asOf?: string;
}): LocationCoverage {
  const parsed = parseCanonicalLocationId(input.locationId);
  const asOf = input.asOf ?? PUBLISHING_SNAPSHOT_DATE;
  const hudSnapshot = resolveHudFmrSnapshot(asOf);
  const requestedState = input.residentialState && isStateCode(input.residentialState) ? input.residentialState : null;

  if (parsed.kind === 'state') {
    const state = parsed.key as StateCode;
    const stateRow = geographySnapshot.states.find((row) => row.state === state);
    if (!stateRow) throw new Error(`Unknown state ${state}`);
    const acs = getAcsRow(censusGeoId('state', stateRow.stateFips));
    const rpp = getBeaStateRpp(state, stateRow.stateFips);
    return {
      locationId: input.locationId as CanonicalLocationId,
      displayName: stateRow.name,
      kind: 'state',
      state,
      stateAmbiguous: false,
      census: { status: acs ? 'exact' : 'unavailable', geoId: acs?.geoId ?? null, label: stateRow.name, row: acs ?? null },
      hud: { status: 'unavailable', message: 'HUD Fair Market Rents are published for FMR areas, not whole states. Enter housing cost or choose a city or metro.' },
      bea: {
        status: rpp ? 'fallback' : 'unavailable',
        geography: 'state',
        label: `${stateRow.name} (BEA state)`,
        cbsaCode: null,
        allItems: rpp?.value ?? null,
        fallback: rpp ? 'stateFallback' : 'unavailable',
      },
      eiaGasoline: { status: 'exact', label: `EIA ${getStateName(state)} or its PADD region`, geographyCode: gasolineGeographyForState(state) },
      eiaElectricity: { status: 'exact', label: `EIA ${getStateName(state)}` },
      food: { status: 'national', label: 'USDA national food-at-home benchmark' },
      eligibleStates: [state],
      countyChoices: [],
    };
  }

  if (parsed.kind === 'county') {
    const county = getCounty(parsed.key);
    if (!county) throw new Error(`Unknown county ${parsed.key}`);
    const state = county.state as StateCode;
    const acs = getAcsRow(censusGeoId('county', county.geoid));
    const cbsaMap = geographySnapshot.countyToCbsa.find((row) => row.countyGeoid === county.geoid);
    const cbsa = cbsaMap ? getCbsa(cbsaMap.cbsaCode) : undefined;
    const hud = uniqueHudFromCounties(hudSnapshot, [county.geoid]);
    const metroRpp = cbsa ? getBeaMetroRpp(cbsa.cbsaCode) : undefined;
    const stateRpp = getBeaStateRpp(state, county.stateFips);
    return {
      locationId: input.locationId as CanonicalLocationId,
      displayName: `${county.name}, ${county.state}`,
      kind: 'county',
      state,
      stateAmbiguous: false,
      census: { status: acs ? 'exact' : 'unavailable', geoId: acs?.geoId ?? null, label: `${county.name}, ${county.state}`, row: acs ?? null },
      hud,
      bea: metroRpp
        ? { status: 'exact', geography: 'metro', label: cbsa!.name, cbsaCode: cbsa!.cbsaCode, allItems: metroRpp.value, fallback: 'exactMetro' }
        : { status: stateRpp ? 'fallback' : 'unavailable', geography: 'state', label: `${getStateName(state)} (BEA state)`, cbsaCode: null, allItems: stateRpp?.value ?? null, fallback: stateRpp ? 'stateFallback' : 'unavailable' },
      eiaGasoline: { status: 'exact', label: `EIA ${getStateName(state)} or its PADD region`, geographyCode: gasolineGeographyForState(state) },
      eiaElectricity: { status: 'exact', label: `EIA ${getStateName(state)}` },
      food: { status: 'national', label: 'USDA national food-at-home benchmark' },
      eligibleStates: [state],
      countyChoices: ambiguousCountyChoices(hud, [county.geoid]),
    };
  }

  if (parsed.kind === 'place') {
    const place = getPlace(parsed.key);
    if (!place) throw new Error(`Unknown place ${parsed.key}`);
    const state = place.state as StateCode;
    const cbsa = getCbsa(place.principalOfCbsa);
    const acs = getAcsRow(censusGeoId('place', place.geoid));
    const inStateCounties = (cbsa?.countyGeoids ?? []).filter((geoid) => geoid.startsWith(place.stateFips));
    const selectedCounty = input.countyGeoid && inStateCounties.includes(input.countyGeoid) ? [input.countyGeoid] : inStateCounties;
    const hud = uniqueHudFromCounties(hudSnapshot, selectedCounty);
    const metroHud = uniqueHudFromCounties(hudSnapshot, inStateCounties);
    const metroRpp = cbsa ? getBeaMetroRpp(cbsa.cbsaCode) : undefined;
    const stateRpp = getBeaStateRpp(state, place.stateFips);
    return {
      locationId: input.locationId as CanonicalLocationId,
      displayName: `${displayPlaceName(place.name)}, ${place.state}`,
      kind: 'place',
      state,
      stateAmbiguous: false,
      census: { status: acs ? 'exact' : 'unavailable', geoId: acs?.geoId ?? null, label: `${displayPlaceName(place.name)}, ${place.state}`, row: acs ?? null },
      hud,
      bea: metroRpp
        ? { status: 'exact', geography: 'metro', label: cbsa!.name, cbsaCode: cbsa!.cbsaCode, allItems: metroRpp.value, fallback: 'exactMetro' }
        : { status: stateRpp ? 'fallback' : 'unavailable', geography: 'state', label: `${getStateName(state)} (BEA state)`, cbsaCode: null, allItems: stateRpp?.value ?? null, fallback: stateRpp ? 'stateFallback' : 'unavailable' },
      eiaGasoline: { status: 'exact', label: `EIA ${getStateName(state)} or its PADD region`, geographyCode: gasolineGeographyForState(state) },
      eiaElectricity: { status: 'exact', label: `EIA ${getStateName(state)}` },
      food: { status: 'national', label: 'USDA national food-at-home benchmark' },
      eligibleStates: [state],
      countyChoices: ambiguousCountyChoices(metroHud, inStateCounties),
    };
  }

  if (parsed.kind === 'cbsa') {
    const cbsa = getCbsa(parsed.key);
    if (!cbsa) throw new Error(`Unknown CBSA ${parsed.key}`);
    const validRequested = requestedState && cbsa.stateCodes.includes(requestedState) ? requestedState : null;
    const stateAmbiguous = cbsa.multiState && !validRequested;
    const state = cbsa.multiState ? validRequested : cbsa.stateCodes[0] as StateCode;
    const counties = state ? cbsa.countyGeoids.filter((geoid) => {
      const county = getCounty(geoid);
      return county?.state === state;
    }) : cbsa.countyGeoids;
    const acs = getAcsRow(censusGeoId('cbsa', cbsa.cbsaCode));
    const hud = uniqueHudFromCounties(hudSnapshot, counties);
    const metroRpp = getBeaMetroRpp(cbsa.cbsaCode);
    const stateRow = state ? geographySnapshot.states.find((row) => row.state === state) : undefined;
    const stateRpp = state && stateRow ? getBeaStateRpp(state, stateRow.stateFips) : undefined;
    return {
      locationId: input.locationId as CanonicalLocationId,
      displayName: cbsa.name,
      kind: 'cbsa',
      state,
      stateAmbiguous,
      census: { status: acs ? 'exact' : 'unavailable', geoId: acs?.geoId ?? null, label: cbsa.name, row: acs ?? null },
      hud: stateAmbiguous && hud.status !== 'uniqueDerived' && hud.status !== 'exact'
        ? { status: 'unavailable', message: 'This metro crosses state lines. Choose the residential state, a city, or enter housing cost manually.' }
        : hud,
      bea: metroRpp
        ? { status: 'exact', geography: 'metro', label: cbsa.name, cbsaCode: cbsa.cbsaCode, allItems: metroRpp.value, fallback: 'exactMetro' }
        : { status: stateRpp ? 'fallback' : 'unavailable', geography: 'state', label: state ? `${getStateName(state)} (BEA state)` : 'State RPP unavailable until a residential state is selected', cbsaCode: null, allItems: stateRpp?.value ?? null, fallback: stateRpp ? 'stateFallback' : 'unavailable' },
      eiaGasoline: state
        ? { status: 'exact', label: `EIA ${getStateName(state)} or its PADD region`, geographyCode: gasolineGeographyForState(state) }
        : { status: 'unavailable', label: 'Fuel geography needs a residential state', geographyCode: null },
      eiaElectricity: state
        ? { status: 'exact', label: `EIA ${getStateName(state)}` }
        : { status: 'unavailable', label: 'Electricity geography needs a residential state' },
      food: { status: 'national', label: 'USDA national food-at-home benchmark' },
      eligibleStates: cbsa.stateCodes as StateCode[],
      countyChoices: stateAmbiguous ? [] : ambiguousCountyChoices(hud, counties),
    };
  }

  throw new Error('HUD FMR areas are not directly searchable in v1. Select a city, metro, or state.');
}
