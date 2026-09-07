/**
 * The lead journey exactly as a browser drives it, through the HTTP handlers.
 *
 * The unit tests prove the service; the browser tests prove the page. This is
 * the seam between them — the request handlers, their validation, their
 * idempotency and the words they send back — which is where a form and an
 * engine that are each correct can still fail to meet.
 *
 * The route modules are imported directly and handed a Request, so the whole
 * path runs without a server: origin check, rate limit, schema, policy gate,
 * flags, service, response copy.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeD1 } from './support/fake-d1';
import { setMonetizationDatabase } from '@/lib/monetization/store/d1';
import { campaignToBindings, type LeadCampaign } from '@/lib/monetization/leads/campaigns';
import { activeConsentVersion } from '@/lib/monetization/consent/versions';
import { nowIso } from '@/lib/monetization/store/d1';
import { siteConfig } from '@/lib/site-config';

/**
 * Open the lead gate for one page.
 *
 * Every shipped policy has `lead.enabled: false`, which is the correct default
 * and would make every request here a no-op. Mocking the lookup for one page is
 * how the enabled path gets exercised without weakening the default that
 * protects the other hundred.
 */
vi.mock('@/lib/monetization/policy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/monetization/policy')>();
  return {
    ...actual,
    getMonetizationPolicy: (pageId: string) =>
      pageId === 'job-roof-replacement'
        ? { ...actual.getMonetizationPolicy(pageId), lead: { enabled: true, vertical: 'roofing' as const } }
        : actual.getMonetizationPolicy(pageId),
  };
});

const PEPPER = 'journey-pepper-that-is-at-least-32-characters';
const PARTNER = 'Partner A';
// Must match what assertSameOrigin compares against, which is resolved at
// module load from the environment.
const ORIGIN = siteConfig.origin;

function campaign(overrides: Partial<LeadCampaign> = {}): LeadCampaign {
  return {
    campaignId: 'camp-roofing', providerId: 'mock', vertical: 'roofing',
    displayName: 'Roofing', active: true, exclusive: true, allowsFallback: false,
    priority: 100, payoutModel: 'per_lead', expectedPayoutMinor: 6_500,
    stateCoverage: ['TX'], zipCoverage: [], excludedStates: [],
    requiredFields: ['phone', 'zip'], consentScope: ['contact_about_this_request'],
    disclosedPartnerName: PARTNER, qualityFloor: 0, ...overrides,
  };
}

async function seed(database: FakeD1, overrides: Partial<LeadCampaign> = {}) {
  const timestamp = nowIso();
  await database.prepare(`
    INSERT INTO monetization_providers (
      provider_id, provider_type, display_name, status, supported_verticals,
      health_state, consecutive_failures, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?)
  `).bind('mock', 'lead_network', 'Mock', 'enabled', '[]', 'healthy', 0, timestamp, timestamp).run();
  await database.prepare(`
    INSERT INTO lead_campaigns (
      campaign_id, provider_id, vertical, display_name, active, exclusive,
      allows_fallback, priority, payout_model, expected_payout_minor, daily_cap,
      hourly_cap, state_coverage, zip_coverage, excluded_states, required_fields,
      consent_scope, disclosed_partner_name, quality_floor, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(...campaignToBindings(campaign(overrides), timestamp)).run();
}

function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers },
    body: JSON.stringify(body),
  });
}

const PAGE_ID = 'job-roof-replacement';

const LIVE_ENV = {
  MONETIZATION_ENABLED: 'true',
  LEADS_ENABLED: 'true',
  LEADS_MOCK_ENABLED: 'true',
  MONETIZATION_HASH_PEPPER: PEPPER,
  NODE_ENV: 'test',
};

describe('the lead journey over HTTP', () => {
  let database: FakeD1;

  beforeEach(() => {
    database = new FakeD1();
    setMonetizationDatabase(database);
    for (const [key, value] of Object.entries(LIVE_ENV)) vi.stubEnv(key, value);
  });

  it('refuses a cross-origin submission before reading a single field', async () => {
    const { POST } = await import('@/app/api/monetization/lead/route');
    const request = new Request(`${ORIGIN}/api/monetization/lead`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://attacker.example' },
      body: JSON.stringify({ contact: { phone: '2145551234' } }),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
    // Nothing was stored, so a forged post cannot even create a record.
    expect(database.select('lead_requests')).toHaveLength(0);
  });

  it('rejects a body that is not JSON', async () => {
    const { POST } = await import('@/app/api/monetization/lead/route');
    const response = await POST(new Request(`${ORIGIN}/api/monetization/lead`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', origin: ORIGIN },
      body: 'not json',
    }));
    expect(response.status).toBe(415);
  });

  it('answers coverage without naming a partner when nothing covers', async () => {
    await seed(database, { stateCoverage: ['CA'] });
    const { POST } = await import('@/app/api/monetization/coverage/route');
    const response = await POST(post('/api/monetization/coverage', {
      vertical: 'roofing', zip: '75201', pageId: PAGE_ID, locale: 'en-US',
    }));
    const body = (await response.json()) as { covered: boolean; partnerName?: string; requiredFields: string[] };
    expect(body.covered).toBe(false);
    expect(body.partnerName).toBeUndefined();
    expect(body.requiredFields).toEqual([]);
  });

  it('tells a page with lead capture switched off that there is no coverage', async () => {
    await seed(database);
    const { POST } = await import('@/app/api/monetization/coverage/route');
    // `concrete` has a lead vertical declared but ships disabled, which is the
    // conservative default every page starts from and which this test's mock
    // deliberately does not touch.
    const response = await POST(post('/api/monetization/coverage', {
      vertical: 'roofing', zip: '75201', pageId: 'concrete', locale: 'en-US',
    }));
    expect(((await response.json()) as { covered: boolean }).covered).toBe(false);
  });

  it('refuses a submission for a service the page does not offer', async () => {
    await seed(database);
    const { POST } = await import('@/app/api/monetization/lead/route');
    const response = await POST(post('/api/monetization/lead', {
      vertical: 'plumbing', pageId: PAGE_ID, locale: 'en-US', zip: '75201',
      project: {}, qualification: {}, contact: { phone: '2145551234' },
      consent: { version: activeConsentVersion('2026-09-06').version, accepted: true, partnerName: PARTNER },
      elapsedMs: 30_000,
    }));
    expect(response.status).toBe(400);
  });

  it('refuses a submission with consent not ticked', async () => {
    await seed(database);
    const { POST } = await import('@/app/api/monetization/lead/route');
    const response = await POST(post('/api/monetization/lead', {
      vertical: 'roofing', pageId: PAGE_ID, locale: 'en-US', zip: '75201',
      project: {}, qualification: {}, contact: { phone: '2145551234' },
      consent: { version: activeConsentVersion('2026-09-06').version, accepted: false, partnerName: PARTNER },
      elapsedMs: 30_000,
    }));
    expect(response.status).toBe(400);
    expect(database.select('lead_contacts')).toHaveLength(0);
  });

  it('refuses a submission with no way to reach the person', async () => {
    await seed(database);
    const { POST } = await import('@/app/api/monetization/lead/route');
    const response = await POST(post('/api/monetization/lead', {
      vertical: 'roofing', pageId: PAGE_ID, locale: 'en-US', zip: '75201',
      project: {}, qualification: {}, contact: {},
      consent: { version: activeConsentVersion('2026-09-06').version, accepted: true, partnerName: PARTNER },
      elapsedMs: 30_000,
    }));
    expect(response.status).toBe(400);
  });

  it('rate limits a flood of submissions from one caller', async () => {
    await seed(database);
    const { POST } = await import('@/app/api/monetization/lead/route');
    const body = {
      vertical: 'roofing', pageId: PAGE_ID, locale: 'en-US', zip: '75201',
      project: {}, qualification: {}, contact: { phone: '2145551234' },
      consent: { version: activeConsentVersion('2026-09-06').version, accepted: true, partnerName: PARTNER },
      elapsedMs: 30_000,
    };
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await POST(post('/api/monetization/lead', body, {
        'cf-connecting-ip': '203.0.113.7',
        'idempotency-key': `flood-key-${attempt}-0123456789`,
      }));
      statuses.push(response.status);
    }
    expect(statuses).toContain(429);
  });

  it('never returns a raw error to the reader', async () => {
    await seed(database);
    const { POST } = await import('@/app/api/monetization/lead/route');
    const response = await POST(post('/api/monetization/lead', { nonsense: true }));
    const body = (await response.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe('string');
    // No stack, no SQL, no table name on a page that just took a phone number.
    expect(body.error).not.toMatch(/at \w+|SELECT|INSERT|lead_contacts|Error:/);
  });

  it('keeps contact details out of the response body entirely', async () => {
    await seed(database);
    const { POST } = await import('@/app/api/monetization/lead/route');
    const response = await POST(post('/api/monetization/lead', {
      vertical: 'roofing', pageId: PAGE_ID, locale: 'en-US', zip: '75201',
      project: {}, qualification: {}, contact: { phone: '2145551234', email: 'sam@example.com' },
      consent: { version: activeConsentVersion('2026-09-06').version, accepted: true, partnerName: PARTNER },
      elapsedMs: 30_000,
    }, { 'cf-connecting-ip': '203.0.113.9', 'idempotency-key': 'clean-key-0123456789' }));

    const text = await response.text();
    expect(text).not.toContain('2145551234');
    expect(text).not.toContain('sam@example.com');
    expect(text).not.toContain('75201');
  });

  it('drops a bot silently, telling it nothing about why', async () => {
    await seed(database);
    const { POST } = await import('@/app/api/monetization/lead/route');
    const response = await POST(post('/api/monetization/lead', {
      vertical: 'roofing', pageId: PAGE_ID, locale: 'en-US', zip: '75201',
      project: {}, qualification: {}, contact: { phone: '2145551234' },
      consent: { version: activeConsentVersion('2026-09-06').version, accepted: true, partnerName: PARTNER },
      website: 'http://spam.example', elapsedMs: 30_000,
    }, { 'cf-connecting-ip': '203.0.113.11', 'idempotency-key': 'bot-key-0123456789012' }));

    const body = (await response.json()) as { ok: boolean; error?: string };
    expect(body.ok).toBe(true);
    // The response is indistinguishable from a real one, and nothing is stored.
    expect(body.error).toBeUndefined();
    expect(database.select('lead_contacts')).toHaveLength(0);
  });
});

describe('the admin endpoint over HTTP', () => {
  beforeEach(() => {
    setMonetizationDatabase(new FakeD1());
    vi.stubEnv('MONETIZATION_ADMIN_TOKEN', 'an-admin-token-that-is-long-enough-32');
  });

  it('hides itself from an unauthenticated caller', async () => {
    const { GET } = await import('@/app/api/monetization/admin/route');
    const response = await GET(new Request(`${ORIGIN}/api/monetization/admin`));
    // 404 rather than 401: the endpoint does not confirm its own existence.
    expect(response.status).toBe(404);
  });

  it('refuses an action that is not on the allowed list', async () => {
    const { POST } = await import('@/app/api/monetization/admin/route');
    const response = await POST(new Request(`${ORIGIN}/api/monetization/admin`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer an-admin-token-that-is-long-enough-32',
      },
      body: JSON.stringify({ action: 'delete-consent-records', leadId: 'ld_1' }),
    }));
    expect(response.status).toBe(400);
  });
});
