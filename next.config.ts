import type { NextConfig } from 'next';
import { adCspSources } from './lib/monetization/ads/provider';

/*
 * The policy widens only for the ad network that is actually configured.
 *
 * With none configured this is byte-for-byte the policy the site has always
 * shipped. With one configured it gains that network's own origins and nothing
 * else — no wildcard, no blanket https:. Deriving it from the provider record
 * is what stops the two from drifting: `script-src 'self'` silently blocks
 * every ad script, and the failure looks like a broken integration rather than
 * a refused one.
 */
const ads = adCspSources();

function directive(name: string, base: string, extra: readonly string[]): string {
  return extra.length > 0 ? `${name} ${base} ${extra.join(' ')}` : `${name} ${base}`;
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  directive('img-src', "'self' data:", ads.img),
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  directive('script-src', "'self' 'unsafe-inline'", ads.script),
  directive('connect-src', "'self' ws: wss:", ads.connect),
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
      {
        /**
         * Occupation-in-state pages are rendered on demand rather than
         * prerendered: there are 33,369 of them, past the ceiling on static
         * assets. Their figures change once a year when BLS publishes, so the
         * edge holds a copy for a day and serves a stale one for a week while
         * it refreshes — the Worker runs once per page per day at most.
         */
        source: '/salary/:occupation/:state',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

export default nextConfig;
