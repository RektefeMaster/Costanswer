/**
 * The measured-traffic provider.
 *
 * `lib/analytics.ts` owns *what* may be measured — a closed event list and a
 * per-field allowlist that drops anything not declared. This owns *where* it
 * goes, and it is deliberately a separate file: the boundary is worth keeping
 * even with one provider behind it, because the rule that raw amounts, ZIPs and
 * free text never leave the page has to survive changing vendors.
 *
 * With no measurement id configured every function here reports "off" and the
 * document is unchanged — same posture as advertising.
 */

/** `G-` followed by Google's own identifier. Anything else is a typo, not a property. */
const GA4_ID = /^G-[A-Z0-9]{4,20}$/;

export function ga4MeasurementId(
  environment: Record<string, string | undefined> = process.env,
): string | null {
  const raw = environment.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();
  if (!raw) return null;
  if (!GA4_ID.test(raw)) {
    throw new Error(`NEXT_PUBLIC_GA4_MEASUREMENT_ID is "${raw}", which is not a GA4 measurement id (G-XXXXXXXXXX).`);
  }
  return raw;
}

/**
 * CSP additions for the analytics provider, or nothing.
 *
 * Same reasoning as `adCspSources`: `script-src 'self'` silently blocks the
 * tag, and a silent block looks like a broken integration rather than a
 * refused one. The origins are Google's documented set for gtag.js — the
 * regional `*.google-analytics.com` and `*.analytics.google.com` hosts are
 * where collection actually lands, so omitting them drops events without an
 * error the operator would see.
 */
export function analyticsCspSources(
  environment: Record<string, string | undefined> = process.env,
): Readonly<Record<'script' | 'connect' | 'img', readonly string[]>> {
  if (!ga4MeasurementId(environment)) {
    return { script: [], connect: [], img: [] };
  }
  return {
    script: ['https://www.googletagmanager.com'],
    connect: [
      'https://www.google-analytics.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://*.googletagmanager.com',
    ],
    img: ['https://www.google-analytics.com', 'https://www.googletagmanager.com'],
  };
}
