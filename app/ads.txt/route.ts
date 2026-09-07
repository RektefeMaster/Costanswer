import { activeAdProvider } from '@/lib/monetization/ads/provider';

/**
 * `/ads.txt` — the authorised-sellers file.
 *
 * Google stops serving on a domain whose ads.txt is missing or invalid once
 * one has been expected, so this is not paperwork: it is the difference
 * between a filled slot and an empty one. It is generated rather than
 * committed because the publisher id is issued at approval, and a file
 * carrying a placeholder id is worse than no file — a wrong entry is read as
 * "this seller is not authorised" rather than as "not configured yet".
 *
 * With no network configured this is a 404, which is exactly the state the
 * spec describes for a site that sells no inventory.
 */

/** Google's own exchange id. Fixed by Google, identical for every AdSense publisher. */
const GOOGLE_TAG_ID = 'f08c47fec0942fa0';

function normalisePublisherId(clientId: string): string | null {
  const trimmed = clientId.trim();
  // AdSense issues `ca-pub-0000000000000000`; ads.txt wants the `pub-` form.
  const match = /^(?:ca-)?(pub-\d{10,20})$/.exec(trimmed);
  return match ? match[1] : null;
}

export function GET() {
  const provider = activeAdProvider();
  const notFound = new Response('Not found.', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });

  if (provider?.networkId !== 'adsense') return notFound;

  const publisherId = normalisePublisherId(process.env.ADSENSE_CLIENT_ID ?? '');
  if (!publisherId) return notFound;

  const body = `google.com, ${publisherId}, DIRECT, ${GOOGLE_TAG_ID}\n`;
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // Crawled roughly daily by the exchanges; a day of staleness is fine and
      // a long TTL is not, because revoking a seller has to take effect.
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
