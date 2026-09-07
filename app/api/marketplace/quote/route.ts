/**
 * County marketplace premiums, priced on the server.
 *
 * The two ACA calculators used to import the CMS snapshot directly. Because
 * they are client islands, that put a 3.8 MB chunk — 425 KB gzipped, 2,055
 * counties of premium columns — into the browser of anyone who opened either
 * page. On a phone that is the whole page budget spent on data for one county,
 * and it contradicted the rule the OEWS module states about itself: the wage
 * columns never leave the server.
 *
 * Everything either calculator needs for one county and one household comes
 * back from here as a few hundred bytes. Nothing about the response depends on
 * who is asking, so it is cacheable by the edge for as long as the snapshot
 * lives — a plan year.
 */
import { CMS_COST_SHARING_LEVELS, CMS_METALS, type CmsMetal } from '@/lib/data/cms-marketplace';
import {
  benchmarkForHousehold, cmsCountiesForZip, cmsMarketplaceIndex,
  costSharingVariant, lowestMetalForHousehold, metalSummary,
} from '@/lib/data/cms-marketplace-snapshot';
import { parseEnrollingAges } from '@/lib/data/cms-marketplace';

/**
 * The landscape file describes a plan year and does not change within one, so
 * a long shared TTL is honest here. The snapshot id is in the payload, so a
 * cached response can always be told apart from a newer one.
 */
const CACHE_CONTROL = 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800';

const ZIP = /^\d{5}$/;
/** Guards the response size: a household larger than this is not a household. */
const MAX_AGES = 12;

export function GET(request: Request) {
  const url = new URL(request.url);
  const zip = (url.searchParams.get('zip') ?? '').trim();
  const requestedCounty = (url.searchParams.get('county') ?? '').trim();
  const agesParam = (url.searchParams.get('ages') ?? '').trim();

  if (!ZIP.test(zip)) {
    return Response.json(
      { status: 'invalid-zip', message: 'Enter a five-digit ZIP code.' },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    );
  }

  const lookup = cmsCountiesForZip(zip);
  if (lookup.status !== 'covered') {
    // Not an error: a ZIP outside the 30 HealthCare.gov states is a real state
    // of the data, and the page says so rather than showing a blank result.
    return Response.json({ status: lookup.status, lookup }, { headers: { 'cache-control': CACHE_CONTROL } });
  }

  const parsedAges = parseEnrollingAges(agesParam);
  if (parsedAges.ages.length > MAX_AGES) {
    return Response.json(
      { status: 'too-many-ages', message: `Price at most ${MAX_AGES} people at once.` },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    );
  }

  const county = lookup.counties.find((entry) => entry.countyFips === requestedCounty) ?? lookup.counties[0];
  const ages = parsedAges.invalidTokens.length === 0 ? parsedAges.ages : [];

  const metals = ages.length > 0
    ? Object.fromEntries(CMS_METALS.map((metal: CmsMetal) => [metal, {
        quote: lowestMetalForHousehold(county.countyFips, metal, ages),
        summary: metalSummary(county.countyFips, metal),
      }]))
    : Object.fromEntries(CMS_METALS.map((metal: CmsMetal) => [metal, {
        quote: null,
        summary: metalSummary(county.countyFips, metal),
      }]));

  return Response.json({
    status: 'covered',
    lookup,
    county,
    ages,
    invalidTokens: parsedAges.invalidTokens,
    benchmark: ages.length > 0 ? benchmarkForHousehold(county.countyFips, ages) : null,
    metals,
    // All four levels, so the page can follow an income change without another
    // round trip. Four small objects is cheaper than a request per keystroke.
    costSharing: Object.fromEntries(
      CMS_COST_SHARING_LEVELS.map((level) => [level, costSharingVariant(county.countyFips, level)]),
    ),
    snapshotId: cmsMarketplaceIndex.snapshotId,
  }, { headers: { 'cache-control': CACHE_CONTROL } });
}
