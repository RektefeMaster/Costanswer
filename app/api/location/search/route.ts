import { searchLocations } from '@/lib/location/search';

/**
 * Short cache window on purpose: these hits come from the deployed geography
 * snapshot, so a long shared TTL would keep serving the previous release's
 * place list after a data refresh ships.
 */
const CACHE_CONTROL = 'public, max-age=600';

/**
 * Location typeahead.
 *
 * The index this searches is built from the 1.4 MB national geography snapshot.
 * Serving it from here keeps that snapshot — and the per-load cost of tokenizing
 * ~1,150 entries — out of the browser entirely.
 */
export function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q') ?? '';
  if (query.trim().length === 0) {
    return Response.json({ hits: [] }, { headers: { 'cache-control': CACHE_CONTROL } });
  }
  return Response.json(
    { hits: searchLocations(query, 8) },
    { headers: { 'cache-control': CACHE_CONTROL } },
  );
}
