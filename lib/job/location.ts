import { countiesForZip } from '@/lib/data/zcta-county-snapshot';
import { geographySnapshot } from '@/lib/data/geography-snapshot';
import { getStateName } from '@/lib/location/states';
import type { JobLocation } from './types';

const countyByGeoid = new Map(geographySnapshot.counties.map((county) => [county.geoid, county]));

export const ZIP_ZCTA_PROVENANCE_LABEL =
  'Location uses an approximate ZIP/ZCTA match to county, not a HUD USPS ZIP-to-county crosswalk.';

export function locateJobZip(zip: string): JobLocation | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const counties = countiesForZip(zip);
  if (!counties || counties.length === 0) return null;
  const geoid = counties[0];
  const county = countyByGeoid.get(geoid);
  if (!county) return null;
  return {
    zip,
    provenance: 'approximate-zip-zcta',
    provenanceLabel: ZIP_ZCTA_PROVENANCE_LABEL,
    countyGeoid: geoid,
    countyName: county.name,
    state: county.state,
    stateName: getStateName(county.state),
    additionalCountyCount: counties.length - 1,
  };
}
