import { describe, expect, it } from 'vitest';
import { parseAnalyticsEvent } from '@/lib/analytics';
import { parseIntegrationConfig } from '@/lib/integration-config';
import { isStateCode, STATE_CODES } from '@/lib/location/states';
import { formatPublishingDateLong, parsePublishingDate, PUBLISHING_SNAPSHOT_DATE, PUBLISHING_SNAPSHOT_INSTANT } from '@/lib/publishing';

describe('analytics privacy boundary', () => {
  it('accepts only the event-specific allowlist', () => {
    expect(parseAnalyticsEvent('tool_opened', { toolId: 'concrete', category: 'home' })).toEqual({
      name: 'tool_opened',
      payload: { toolId: 'concrete', category: 'home' },
    });
    expect(parseAnalyticsEvent('tool_opened', { toolId: 'concrete', category: 'home', hourlyRate: 99 })).toBeNull();
    expect(parseAnalyticsEvent('search', { resultType: 'matched', query: 'private search text' })).toBeNull();
  });
});

describe('optional integration gates', () => {
  it('is disabled by default and requires privacy prerequisites before activation', () => {
    expect(parseIntegrationConfig({})).toMatchObject({ analyticsEnabled: false, advertisingEnabled: false, affiliatesEnabled: false });
    expect(parseIntegrationConfig({
      NEXT_PUBLIC_CONTACT_EMAIL: '',
      NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE: '  ',
      NEXT_PUBLIC_PRIVACY_POLICY_VERSION: '',
    })).toMatchObject({
      analyticsEnabled: false,
      advertisingEnabled: false,
      affiliatesEnabled: false,
      privacyEffectiveDate: undefined,
      publicContactEmail: undefined,
      policyVersion: undefined,
    });
    expect(() => parseIntegrationConfig({ NEXT_PUBLIC_ANALYTICS_ENABLED: 'true' })).toThrow(/NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE/);
    expect(() => parseIntegrationConfig({
      NEXT_PUBLIC_ADVERTISING_ENABLED: 'true',
      NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE: '2026-09-02',
      NEXT_PUBLIC_CONTACT_EMAIL: 'not-an-email',
      NEXT_PUBLIC_PRIVACY_POLICY_VERSION: '1',
    })).toThrow();
  });

  it('rejects non-calendar privacy dates even when analytics stays off', () => {
    expect(() => parseIntegrationConfig({ NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE: '2026-02-31' })).toThrow(/real calendar date/);
    expect(parseIntegrationConfig({
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'true',
      NEXT_PUBLIC_ADVERTISING_ENABLED: 'true',
      NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE: '2026-09-02',
      NEXT_PUBLIC_CONTACT_EMAIL: 'privacy@example.com',
      NEXT_PUBLIC_PRIVACY_POLICY_VERSION: '1',
    })).toMatchObject({ analyticsEnabled: true, advertisingEnabled: true, publicContactEmail: 'privacy@example.com' });
    expect(() => parseIntegrationConfig({ NEXT_PUBLIC_AFFILIATES_ENABLED: 'true' })).toThrow(/NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE/);
    expect(parseIntegrationConfig({
      NEXT_PUBLIC_AFFILIATES_ENABLED: 'true',
      NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE: '2026-09-02',
      NEXT_PUBLIC_CONTACT_EMAIL: 'privacy@example.com',
      NEXT_PUBLIC_PRIVACY_POLICY_VERSION: '1',
    })).toMatchObject({ affiliatesEnabled: true });
  });
});

describe('location code guard', () => {
  it('accepts all 51 state/DC codes and rejects prototype keys', () => {
    expect(STATE_CODES).toHaveLength(51);
    expect(STATE_CODES.every(isStateCode)).toBe(true);
    for (const value of ['toString', 'constructor', '__proto__', 'tx', 'ZZ']) expect(isStateCode(value), value).toBe(false);
  });
});

describe('publishing clock', () => {
  it('accepts real calendar dates and formats the versioned snapshot in UTC', () => {
    expect(parsePublishingDate('2026-02-31')).toBeNull();
    expect(parsePublishingDate(PUBLISHING_SNAPSHOT_DATE)).toBe(Date.parse(PUBLISHING_SNAPSHOT_INSTANT));
    expect(formatPublishingDateLong(PUBLISHING_SNAPSHOT_DATE)).toBe('September 2, 2026');
  });
});

