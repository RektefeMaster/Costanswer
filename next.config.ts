import type { NextConfig } from 'next';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' ws: wss:",
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
    ];
  },
};

export default nextConfig;
