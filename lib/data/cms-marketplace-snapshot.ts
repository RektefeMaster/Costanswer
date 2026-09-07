/**
 * Runtime access to the CMS Marketplace landscape release.
 *
 * Two files travel with the application, for the same reason the OEWS wages do:
 * a row of objects for 2,055 counties costs 7 MB and would not fit in a Worker
 * beside the rest of the data, while the same figures as integer cents cost
 * 1.1 MB. The index carries county identity and every claim the snapshot makes
 * about itself; `premiums.json` carries only numbers, and the ingest proves the
 * packing lossless before writing either.
 *
 * The hash and schema checks live in lib/data/verify.ts and run at publication.
 * Request time reads the committed JSON directly.
 */
import indexJson from '@/data/cms-marketplace/index.json';
import premiumsJson from '@/data/cms-marketplace/premiums.json';
import { geographySnapshot } from './geography-snapshot';
import { countiesForZip } from './zcta-county-snapshot';
import {
  costSharingLevelForIncome,
  householdPremium,
  parseEnrollingAges,
  premiumForAge,
  unpackBenchmarkSilver,
  unpackCostSharing,
  unpackMetal,
  type CmsCostSharingLevel,
  type CmsCostSharingVariant,
  type CmsCountyIdentity,
  type CmsHouseholdQuote,
  type CmsMarketplaceIndex,
  type CmsMarketplacePremiums,
  type CmsMetal,
  type CmsMetalSummary,
  type CmsZipLookup,
} from './cms-marketplace';
import type { StateCode } from '@/lib/location/states';

export const cmsMarketplaceIndex = indexJson as unknown as CmsMarketplaceIndex;
const packed = premiumsJson as unknown as CmsMarketplacePremiums;

if (packed.snapshotId !== cmsMarketplaceIndex.snapshotId) {
  throw new Error('The bundled CMS index and premium columns come from different releases.');
}

export const cmsMarketplaceManifest = {
  currentSnapshotId: cmsMarketplaceIndex.snapshotId,
  observationPeriod: cmsMarketplaceIndex.observationPeriod,
  normalizedSha256: cmsMarketplaceIndex.normalizedSha256,
  validationStatus: 'passed' as const,
};

const positionByFips = new Map(cmsMarketplaceIndex.counties.map((county, position) => [county.countyFips, position]));
const coveredStates = new Set<string>(cmsMarketplaceIndex.coveredStateCodes);

export function isCmsCoveredState(stateCode: string): boolean {
  return coveredStates.has(stateCode);
}

/** Counties this release prices, for one state, in FIPS order. */
export function cmsCountiesForState(stateCode: StateCode): CmsCountyIdentity[] {
  return cmsMarketplaceIndex.counties.filter((county) => county.stateCode === stateCode);
}

export function getCmsCounty(countyFips: string): CmsCountyIdentity | undefined {
  const position = positionByFips.get(countyFips);
  return position === undefined ? undefined : cmsMarketplaceIndex.counties[position];
}

function positionOf(countyFips: string): number {
  const position = positionByFips.get(countyFips);
  if (position === undefined) throw new Error(`No published Marketplace plans for county ${countyFips}.`);
  return position;
}

export function benchmarkSilverByAge(countyFips: string): number[] {
  return unpackBenchmarkSilver(packed.values, positionOf(countyFips));
}

export function metalSummary(countyFips: string, metal: CmsMetal): CmsMetalSummary | null {
  return unpackMetal(packed.values, positionOf(countyFips), metal);
}

export function costSharingVariant(countyFips: string, level: CmsCostSharingLevel): CmsCostSharingVariant | null {
  return unpackCostSharing(packed.values, positionOf(countyFips), level);
}

/**
 * The county's benchmark premium for one household, under the federal rating
 * rules. This is the figure a premium tax credit is calculated from.
 */
export function benchmarkForHousehold(countyFips: string, ages: number[]): CmsHouseholdQuote {
  const county = getCmsCounty(countyFips);
  if (!county) throw new Error(`No published Marketplace plans for county ${countyFips}.`);
  return householdPremium(county, benchmarkSilverByAge(countyFips), ages);
}

/** The full price of the cheapest plan at a metal level, for one household. */
export function lowestMetalForHousehold(countyFips: string, metal: CmsMetal, ages: number[]): CmsHouseholdQuote | null {
  const county = getCmsCounty(countyFips);
  const summary = metalSummary(countyFips, metal);
  if (!county || !summary) return null;
  return householdPremium(county, summary.lowestByAge, ages);
}

/** GEOID's leading two digits are the state FIPS; the gazetteer names the state. */
const stateCodeByFips = new Map<string, StateCode>(
  geographySnapshot.counties.map((county) => [county.stateFips, county.state as StateCode]),
);

/**
 * Counties a ZIP code falls in that this release prices.
 *
 * A ZIP can straddle a county line, so every match is returned and the caller
 * lets the reader choose: two counties in one ZIP can carry different
 * benchmarks and so different credits. A ZIP that resolves to real counties
 * this release does not price is reported separately from an unknown ZIP,
 * because one means "your state publishes elsewhere" and the other means
 * "check the digits" — and the page has to say the right one.
 */
export function cmsCountiesForZip(zip: string): CmsZipLookup {
  const geoids = countiesForZip(zip);
  if (!geoids || geoids.length === 0) return { status: 'unknown-zip', stateCodes: [] };
  // The state is reported whether or not this release prices the county. Alaska
  // and Hawaii have their own federal poverty guidelines, so a caller that
  // cannot name the state must not fall back to a contiguous-state default.
  const stateCodes = [...new Set(geoids.map((geoid) => stateCodeByFips.get(geoid.slice(0, 2)))
    .filter((code): code is StateCode => code !== undefined))];
  const counties = geoids.map((geoid) => getCmsCounty(geoid)).filter((county): county is CmsCountyIdentity => county !== undefined);
  if (counties.length > 0) return { status: 'covered', counties, stateCodes };
  return { status: 'not-in-this-release', stateCodes };
}

export { costSharingLevelForIncome, parseEnrollingAges, premiumForAge };

/**
 * The handful of figures a page prints about this release.
 *
 * Built here so a browser island can be handed them as props instead of
 * importing the module that produces them — importing it pulls 3.8 MB of
 * premium columns into the bundle to render one line of text.
 */
export function cmsReleaseSummary(): {
  snapshotId: string;
  countyCount: number;
  coveredStateCount: number;
  planYear: string;
} {
  return {
    snapshotId: cmsMarketplaceIndex.snapshotId,
    countyCount: cmsMarketplaceIndex.counties.length,
    coveredStateCount: cmsMarketplaceIndex.coveredStateCodes.length,
    planYear: cmsMarketplaceIndex.observationPeriod,
  };
}
