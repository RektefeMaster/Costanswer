/**
 * The state a ZIP is in.
 *
 * The coverage form asks for a ZIP because that is what people know. Campaigns
 * are usually scoped by state because that is how a buyer's contractor network
 * is organised. Without a translation between the two, a state-scoped campaign
 * is invisible to every caller and the coverage check answers "no" forever
 * while looking like it worked.
 *
 * Both snapshots this needs are already deployed: the Census ZCTA-to-county
 * crosswalk and the OMB geography file, which carries a state code on every
 * county. A ZIP that straddles a state line resolves to the county with the
 * largest land share, which the crosswalk already orders first.
 */
import { countiesForZip } from '@/lib/data/zcta-county-snapshot';
import { geographySnapshot } from '@/lib/data/geography-snapshot';
import { isStateCode, type StateCode } from '@/lib/location/states';

let stateByCountyGeoid: Map<string, StateCode> | undefined;

function countyIndex(): Map<string, StateCode> {
  if (!stateByCountyGeoid) {
    const index = new Map<string, StateCode>();
    for (const county of geographySnapshot.counties) {
      if (isStateCode(county.state)) index.set(county.geoid, county.state);
    }
    stateByCountyGeoid = index;
  }
  return stateByCountyGeoid;
}

/**
 * Undefined means the ZIP is not a ZCTA the Census publishes — a PO box, a
 * single large recipient, or a typo. That is a real state of the data, not a
 * lookup failure, and the caller should treat it as "we cannot place you"
 * rather than substituting a neighbouring state.
 */
export function stateForZip(zip: string): StateCode | undefined {
  const counties = countiesForZip(zip.trim());
  if (!counties || counties.length === 0) return undefined;
  for (const geoid of counties) {
    const state = countyIndex().get(geoid);
    if (state) return state;
  }
  return undefined;
}
