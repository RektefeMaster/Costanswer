import type { NextConfig } from 'next';
import { analyticsCspSources } from './lib/analytics-provider';
import { adCspSources } from './lib/monetization/ads/provider';

/*
 * The policy widens only for the vendors that are actually configured.
 *
 * With none configured this is byte-for-byte the policy the site has always
 * shipped. With one configured it gains that vendor's own origins and nothing
 * else — no wildcard, no blanket https:. Deriving it from the provider records
 * is what stops the two from drifting: `script-src 'self'` silently blocks
 * every third-party script, and the failure looks like a broken integration
 * rather than a refused one.
 *
 * Both are read at build time, so enabling advertising or analytics needs a
 * rebuild rather than a restart.
 */
const ads = adCspSources();
const analytics = analyticsCspSources();

function directive(name: string, base: string, extra: readonly string[]): string {
  const unique = [...new Set(extra)];
  return unique.length > 0 ? `${name} ${base} ${unique.join(' ')}` : `${name} ${base}`;
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  directive('img-src', "'self' data:", [...ads.img, ...analytics.img]),
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  directive('script-src', "'self' 'unsafe-inline'", [...ads.script, ...analytics.script]),
  directive('connect-src', "'self' ws: wss:", [...ads.connect, ...analytics.connect]),
  // No ad network configured means no third-party frames at all.
  ads.frame.length > 0 ? `frame-src ${ads.frame.join(' ')}` : "frame-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/topics/auto', destination: '/topics/car', permanent: true },
      { source: '/auto/:path*', destination: '/car/:path*', permanent: true },
      { source: '/money/auto-loan', destination: '/money/car-loan', permanent: true },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    ];
    return [
      { source: '/', headers: securityHeaders },
      { source: '/:path*', headers: securityHeaders },
      /*
       * The salary family renders on demand rather than prerendering: there are
       * 33,369 leaf pages, past the ceiling on static assets. Their figures
       * change once a year when BLS publishes, so the edge holds a copy for a
       * day and serves a stale one for a week while it refreshes — the Worker
       * runs once per page per day at most.
       *
       * The occupation and state-hub levels were left out of this and so ran
       * the Worker on every single request, for 812 pages whose content changes
       * annually. Same data, same cadence, same policy.
       */
      {
        source: '/salary/:occupation/:state',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/salary/:occupation',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/salary/states/:state',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        // Priced from a plan-year file that does not change inside the year.
        source: '/api/marketplace/quote',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

export default nextConfig;
