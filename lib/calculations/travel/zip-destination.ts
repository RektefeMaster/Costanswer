import { geographySnapshot } from '@/lib/data/geography-snapshot';
import { countiesForZip, zctaCountySnapshot } from '@/lib/data/zcta-county-snapshot';
import { getPerDiemDestination, getStandardRateForState, gsaPerDiemSnapshot } from '@/lib/data/gsa-perdiem-snapshot';
import { formatPerDiemDestinationLabel, isDuplicateDcMetroRow, type PerDiemDestination } from '@/lib/data/gsa-perdiem';
import { getStateName, isStateCode } from '@/lib/location/states';

export type ZipResolution =
  | { status: 'not-a-zcta'; zip: string; message: string }
  | { status: 'outside-conus'; zip: string; state: string; message: string }
  | {
    status: 'resolved';
    zip: string;
    /** The destination a trip to this ZIP should be priced against. */
    destinationKey: string;
    destinationLabel: string;
    /** True when GSA lists no locality here and the state standard CONUS rate applies. */
    usesStandardRate: boolean;
    countyLabel: string;
    state: string;
    /** Why this ZIP maps to this rate, in one sentence. */
    summary: string;
    /**
     * True when GSA carves a city out of this county, so a ZIP cannot tell
     * Sedona from Flagstaff or Cambridge from Burlington.
     */
    splitByCity: boolean;
    /** City rates GSA carved out of the county this ZIP sits in. Not the rate quoted until the traveller picks one. */
    citySplitDestinationKeys: string[];
    citySplitLabels: string[];
    /** Other destinations this ZIP also touches, when it crosses a county line or a city carve-out. */
    alternateDestinationKeys: string[];
    alternateLabels: string[];
  };

function stateLabel(code: string): string {
  return isStateCode(code) ? getStateName(code) : code;
}

function labelsFor(keys: string[]): string[] {
  return keys
    .map((key) => getPerDiemDestination(key))
    .filter((destination): destination is PerDiemDestination => destination !== undefined)
    .map(formatPerDiemDestinationLabel);
}

/**
 * County names differ between the two sources.
 *
 * Census writes "Baldwin County", GSA writes "Baldwin"; Louisiana has parishes
 * and Alaska has boroughs. Stripping the type word lets the two line up without
 * hand-maintaining a mapping.
 */
function normalizeCountyName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(counties|county|parish|borough|census area|municipality|municipio|city and borough)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Pull city carve-outs out of GSA's county string before the rest is split.
 *
 * "Middlesex less the city of Cambridge" is two facts: the county rate, and a
 * city that has its own rate. Dropping the "less" clause used to throw the
 * city away, so a Cambridge ZIP resolved as Burlington. "City limits of Sedona"
 * never matched a county name at all, so Sedona took Flagstaff's rate.
 */
function parseCoveredPlaces(county: string): { includes: string[]; cityIncludes: string[]; excludes: string[] } {
  const excludes: string[] = [];
  let rest = county.replace(/\bless\s+(?:the\s+)?city(?:\s+limits)?\s+of\s+([^,;/]+)/gi, (_, city: string) => {
    const name = normalizeCountyName(city);
    if (name) excludes.push(name);
    return ' ';
  });
  const cityIncludes: string[] = [];
  rest = rest.replace(/\bcity\s+limits\s+of\s+([^,;/]+)/gi, (_, city: string) => {
    const name = normalizeCountyName(city);
    if (name) cityIncludes.push(name);
    return ' ';
  });
  rest = rest.replace(/\bcities\s+of\s+([^,;/]+)/gi, (_, city: string) => {
    const name = normalizeCountyName(city);
    if (name) cityIncludes.push(name);
    return ' ';
  });
  rest = rest.replace(/\bcity\s+of\s+([^,;/]+)/gi, (_, city: string) => {
    const name = normalizeCountyName(city);
    if (name) cityIncludes.push(name);
    return ' ';
  });
  const includes: string[] = [];
  for (const piece of rest.split(/\s*\/\s*|[;,]|\s+and\s+/)) {
    const name = normalizeCountyName(piece);
    if (name) includes.push(name);
  }
  return {
    includes: [...new Set(includes)],
    cityIncludes: [...new Set(cityIncludes)],
    excludes: [...new Set(excludes)],
  };
}

function addIndex(map: Map<string, string[]>, key: string, destinationKey: string): void {
  const current = map.get(key) ?? [];
  if (!current.includes(destinationKey)) map.set(key, [...current, destinationKey]);
}

const countyByGeoid = new Map(geographySnapshot.counties.map((county) => [county.geoid, county]));

const destinationsByStateCounty = new Map<string, string[]>();
const destinationsByStateCity = new Map<string, string[]>();
const excludedCitiesByCountyKey = new Map<string, string[]>();

/**
 * The one entry GSA writes as prose rather than a delimited list.
 *
 * The Washington DC rate covers named cities and counties in Virginia and
 * Maryland, described in a sentence: "also the cities of Alexandria, Falls
 * Church and Fairfax, and the counties of Arlington and Fairfax, in Virginia;
 * and the counties of Montgomery and Prince George's in Maryland". Parsing that
 * generically would be guesswork, so the jurisdictions it names are listed
 * here by county GEOID and checked against the geography snapshot at load.
 */
const DC_METRO_COUNTY_GEOIDS = [
  '11001', // District of Columbia
  '51510', // Alexandria city, VA
  '51610', // Falls Church city, VA
  '51600', // Fairfax city, VA
  '51013', // Arlington County, VA
  '51059', // Fairfax County, VA
  '24031', // Montgomery County, MD
  '24033', // Prince George's County, MD
];

for (const destination of gsaPerDiemSnapshot.destinations) {
  if (destination.isStandardRate || !destination.county) continue;
  // GSA republishes the DC metro rate under MD and VA. Indexing those clones
  // made Fairfax resolve as "District of Columbia, VA" instead of Washington.
  if (isDuplicateDcMetroRow(destination)) continue;
  const { includes, cityIncludes, excludes } = parseCoveredPlaces(destination.county);
  const countyKeys: string[] = [];
  for (const name of includes) {
    const key = `${destination.state}|${name}`;
    countyKeys.push(key);
    addIndex(destinationsByStateCounty, key, destination.key);
  }
  for (const name of cityIncludes) {
    // Independent cities are "Roanoke city" in Census and "City limits of
    // Roanoke" in GSA. Index them as "name city" so "Roanoke County" does not
    // steal the city rate.
    const key = `${destination.state}|${name} city`;
    addIndex(destinationsByStateCounty, key, destination.key);
    addIndex(destinationsByStateCity, `${destination.state}|${name}`, destination.key);
  }
  for (const piece of destination.city.split(/\s*\/\s*/)) {
    const name = normalizeCountyName(piece);
    if (name && name !== 'standard rate') addIndex(destinationsByStateCity, `${destination.state}|${name}`, destination.key);
  }
  for (const city of excludes) {
    for (const countyKey of countyKeys) {
      const current = excludedCitiesByCountyKey.get(countyKey) ?? [];
      if (!current.includes(city)) excludedCitiesByCountyKey.set(countyKey, [...current, city]);
    }
  }
}

const dcDestination = gsaPerDiemSnapshot.destinations.find((destination) => destination.state === 'DC');
if (!dcDestination) throw new Error('The GSA snapshot has no District of Columbia rate to attach its metro counties to.');
for (const geoid of DC_METRO_COUNTY_GEOIDS) {
  const county = countyByGeoid.get(geoid);
  if (!county) throw new Error(`DC metro county ${geoid} is not in the geography snapshot.`);
  const key = `${county.state}|${normalizeCountyName(county.name)}`;
  const already = (destinationsByStateCounty.get(key) ?? []).filter((destinationKey) => destinationKey !== dcDestination.key);
  destinationsByStateCounty.set(key, [dcDestination.key, ...already]);
}

export const ZCTA_SNAPSHOT_ID = zctaCountySnapshot.snapshotId;

/**
 * States the GSA dataset covers.
 *
 * Presence in the dataset is the test for CONUS, not whether the state has a
 * standard rate: D.C. is CONUS but has only its own named rate, with no
 * standard fallback behind it.
 */
const conusStates = new Set(gsaPerDiemSnapshot.destinations.map((destination) => destination.state as string));

/**
 * Census independent cities are "Roanoke city"; GSA writes "City limits of
 * Roanoke". Trying the name with and without a trailing "city" is what lets
 * those ZIPs find the listed rate instead of the state standard.
 */
function countyIndexKeys(state: string, name: string): string[] {
  const normalized = normalizeCountyName(name);
  const withoutCity = normalized.replace(/\s+city$/, '');
  return withoutCity === normalized
    ? [`${state}|${normalized}`]
    : [`${state}|${normalized}`, `${state}|${withoutCity}`];
}

function destinationsForCounty(state: string, name: string): string[] {
  return [...new Set(countyIndexKeys(state, name).flatMap((key) => destinationsByStateCounty.get(key) ?? []))];
}

function cityRatesExcludedFrom(state: string, countyName: string): string[] {
  const cities = [...new Set(countyIndexKeys(state, countyName).flatMap((key) => excludedCitiesByCountyKey.get(key) ?? []))];
  return [...new Set(cities.flatMap((city) => [
    ...(destinationsByStateCity.get(`${state}|${city}`) ?? []),
    ...(destinationsByStateCounty.get(`${state}|${city}`) ?? []),
  ]))];
}

/**
 * Turn a ZIP code into the GSA destination a trip there is priced against.
 *
 * Most ZIP codes have no separately listed rate: GSA names about three hundred
 * localities and covers the rest of each state with one standard CONUS rate.
 * That is the normal answer rather than a failure, so it is reported as its
 * own state and said plainly, not left to look like a lookup that came up empty.
 *
 * A ZCTA that crosses a county line is priced against the county that covers
 * most of its land. A listed locality in a sliver of the ZIP is an alternate,
 * not the rate the trip is quoted at.
 */
export function resolveZipToDestination(rawZip: string): ZipResolution {
  const zip = rawZip.trim();
  if (!/^\d{5}$/.test(zip)) {
    return { status: 'not-a-zcta', zip, message: 'Enter a five-digit ZIP code.' };
  }
  const counties = countiesForZip(zip);
  if (!counties || counties.length === 0) {
    return {
      status: 'not-a-zcta',
      zip,
      message: 'The Census file has no area for this ZIP code. PO-box-only ZIP codes have none, so pick the destination by name instead.',
    };
  }

  const known = counties.map((geoid) => countyByGeoid.get(geoid)).filter((county) => county !== undefined);
  const primary = known[0];
  if (!primary) {
    return {
      status: 'outside-conus',
      zip,
      state: '',
      message: 'This ZIP code is outside the continental U.S. GSA does not set its per diem rate.',
    };
  }
  if (!conusStates.has(primary.state)) {
    return {
      status: 'outside-conus',
      zip,
      state: primary.state,
      message: `${primary.name} is outside the continental U.S. Alaska, Hawaii and the territories are set by the Department of Defense, not GSA.`,
    };
  }

  const countyLabel = `${primary.name}, ${primary.state}`;
  const primaryMatches = destinationsForCounty(primary.state, primary.name);
  const citySplits = cityRatesExcludedFrom(primary.state, primary.name).filter((key) => !primaryMatches.includes(key));
  const otherMatches = [...new Set([
    ...known.slice(1).flatMap((county) => destinationsForCounty(county.state, county.name)),
    ...citySplits,
  ])].filter((key) => !primaryMatches.includes(key));
  const splitByCity = citySplits.length > 0;

  if (primaryMatches.length === 0) {
    const standard = getStandardRateForState(primary.state);
    if (!standard) {
      return {
        status: 'outside-conus',
        zip,
        state: primary.state,
        message: `GSA publishes no rate covering ${primary.name}.`,
      };
    }
    const citySplitLabels = labelsFor(citySplits);
    const alternateLabels = labelsFor(otherMatches);
    const summary = [
      `ZIP ${zip} is in ${countyLabel}. GSA does not list this locality separately, so the ${stateLabel(primary.state)} standard CONUS rate applies.`,
      splitByCity
        ? `GSA carves a city out of this county, so a ZIP cannot tell them apart. If the trip is to ${citySplitLabels.join(' or ')}, pick that destination.`
        : alternateLabels.length > 0
          ? `This ZIP also reaches ${alternateLabels.join(', ')}; the rate used is the county that covers most of the ZIP.`
          : '',
    ].filter(Boolean).join(' ');
    return {
      status: 'resolved',
      zip,
      destinationKey: standard.key,
      destinationLabel: formatPerDiemDestinationLabel(standard),
      usesStandardRate: true,
      countyLabel,
      state: primary.state,
      summary,
      splitByCity,
      citySplitDestinationKeys: citySplits,
      citySplitLabels,
      alternateDestinationKeys: otherMatches,
      alternateLabels,
    };
  }

  const destination = getPerDiemDestination(primaryMatches[0]);
  if (!destination) {
    return {
      status: 'not-a-zcta',
      zip,
      message: 'This ZIP mapped to a destination that is not in the loaded rate table. Pick the destination by name instead.',
    };
  }

  const alternateKeys = [...primaryMatches.slice(1), ...otherMatches];
  const alternateLabels = labelsFor(alternateKeys);
  const listedAs = destination.state === primary.state
    ? `ZIP ${zip} is in ${countyLabel}, which GSA lists as ${formatPerDiemDestinationLabel(destination).replace(/, [A-Z]{2}$/, '')}.`
    : `ZIP ${zip} is in ${countyLabel}. That area takes the ${formatPerDiemDestinationLabel(destination)} per diem rate.`;
  const citySplitLabels = labelsFor(citySplits);
  const otherCountyLabels = labelsFor(otherMatches.filter((key) => !citySplits.includes(key)));
  const splitNote = splitByCity
    ? `GSA carves a city out of this county, so a ZIP cannot tell them apart. If the trip is to ${citySplitLabels.join(' or ')}, pick that destination.`
    : otherCountyLabels.length > 0
      ? `This ZIP also reaches ${otherCountyLabels.join(', ')}; the rate used is the county that covers most of the ZIP.`
      : '';
  const summary = [listedAs, splitNote].filter(Boolean).join(' ');

  return {
    status: 'resolved',
    zip,
    destinationKey: destination.key,
    destinationLabel: formatPerDiemDestinationLabel(destination),
    usesStandardRate: destination.isStandardRate,
    countyLabel,
    state: primary.state,
    summary,
    splitByCity,
    citySplitDestinationKeys: citySplits,
    citySplitLabels,
    alternateDestinationKeys: alternateKeys,
    alternateLabels,
  };
}
