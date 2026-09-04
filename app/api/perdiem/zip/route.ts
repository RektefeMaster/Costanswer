import { calculationErrorMessage } from '@/lib/calculations/error';
import { resolveZipToDestination } from '@/lib/calculations/travel/zip-destination';

/**
 * Short cache window on purpose: these hits come from the deployed GSA and
 * Census snapshots, so a long shared TTL would keep serving the previous
 * release's ZIP map after a data refresh ships.
 */
const CACHE_CONTROL = 'public, max-age=600';

/**
 * ZIP code to GSA per diem destination.
 *
 * The Census ZCTA-to-county crosswalk is a national table. Serving the lookup
 * from here keeps that file — and the GSA county index built from it — out of
 * the browser. A ZIP that is not a separately listed locality is a successful
 * standard CONUS rate, not a failed search.
 */
export function GET(request: Request) {
  const zip = new URL(request.url).searchParams.get('zip') ?? '';
  try {
    return Response.json(
      { resolution: resolveZipToDestination(zip) },
      { headers: { 'cache-control': CACHE_CONTROL } },
    );
  } catch (error) {
    return Response.json(
      {
        resolution: {
          status: 'not-a-zcta',
          zip,
          message: calculationErrorMessage(error),
        },
      },
      { status: 400, headers: { 'cache-control': CACHE_CONTROL } },
    );
  }
}
