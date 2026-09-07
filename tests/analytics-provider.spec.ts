import { describe, expect, it } from 'vitest';
import { analyticsCspSources, ga4MeasurementId } from '@/lib/analytics-provider';

describe('analytics provider', () => {
  it('reports no provider when nothing is configured', () => {
    expect(ga4MeasurementId({})).toBeNull();
    expect(ga4MeasurementId({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: '  ' })).toBeNull();
  });

  it('leaves the content-security-policy untouched with no provider', () => {
    // The default posture must stay exactly as tight as it is today.
    expect(analyticsCspSources({})).toEqual({ script: [], connect: [], img: [] });
  });

  it('accepts a GA4 measurement id', () => {
    expect(ga4MeasurementId({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-ABCD123456' })).toBe('G-ABCD123456');
  });

  it('refuses an id that is not a GA4 property', () => {
    // A Universal Analytics id or a typo silently measures nothing, which is
    // the failure that looks like a broken site rather than a misconfigured one.
    expect(() => ga4MeasurementId({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'UA-12345-1' })).toThrow(/GA4 measurement id/);
    expect(() => ga4MeasurementId({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-' })).toThrow();
  });

  it('opens exactly the collection hosts gtag uses, and no wildcard', () => {
    const sources = analyticsCspSources({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-ABCD123456' });
    expect(sources.script).toEqual(['https://www.googletagmanager.com']);
    expect(sources.connect).toContain('https://*.analytics.google.com');
    expect(sources.connect.every((origin) => origin.startsWith('https://'))).toBe(true);
    expect(sources.connect).not.toContain('https:');
  });
});
