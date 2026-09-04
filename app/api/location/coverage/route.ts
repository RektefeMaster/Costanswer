import { resolveCostOfLivingCoverage } from '@/lib/calculations/col/coverage';
import { calculationErrorMessage } from '@/lib/calculations/error';

/**
 * Short cache window on purpose: these responses embed the snapshot ids of the
 * deployed data, so a long shared TTL would keep serving the previous release's
 * provenance after a data refresh ships.
 */
const CACHE_CONTROL = 'public, max-age=600';

/**
 * Resolve one location against the HUD FMR, Census ACS, BEA RPP, and geography
 * snapshots. The response is a few kilobytes; the tables behind it are ~4 MB,
 * which is why this is a request rather than a bundle.
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const locationId = params.get('id');
  if (!locationId) {
    return Response.json({ error: 'A location id is required.' }, { status: 400 });
  }
  try {
    const coverage = resolveCostOfLivingCoverage({
      locationId,
      residentialState: params.get('state') ?? undefined,
      countyGeoid: params.get('county') ?? undefined,
    });
    return Response.json(
      { coverage },
      { headers: { 'cache-control': CACHE_CONTROL } },
    );
  } catch (error) {
    return Response.json({ error: calculationErrorMessage(error) }, { status: 400 });
  }
}
