/**
 * The operator half: attribution, configuration, imports, calls and privacy.
 *
 * These are the surfaces that decide whether the business can be run without a
 * deploy, and whether a person who writes in asking about their data gets a
 * real answer. They are as worth testing as the money paths.
 */
import { describe, expect, it } from 'vitest';
import { FakeD1 } from './support/fake-d1';
import { classifyReferrer, sanitizeAttribution } from '@/lib/monetization/attribution/types';
import { parseConversionCsv } from '@/lib/monetization/affiliate/conversions';
import { importConversions, recentImports } from '@/lib/monetization/store/repositories/conversions';
import { revenueBetween } from '@/lib/monetization/store/repositories/revenue';
import { totalRevenue } from '@/lib/monetization/revenue/ledger';
import { upsertCallCampaign, activeCallCampaigns, setCallCampaignActive } from '@/lib/monetization/store/repositories/calls';
import { upsertCampaign, setCampaignActive, allCampaigns } from '@/lib/monetization/store/repositories/campaigns';
import { leadDossier, findLeadsForSubject, processDeletionRequest } from '@/lib/monetization/admin/privacy';
import { saveLeadContact, saveLeadRequest, loadLeadContactForDelivery } from '@/lib/monetization/store/repositories/leads';
import { recordConsent } from '@/lib/monetization/store/repositories/consents';
import { hashContact } from '@/lib/monetization/leads/dedupe';
import { isSuppressed } from '@/lib/monetization/store/repositories/governance';
import { mayLoadAdScript, mayPersonalise, parseAdConsent, DEFAULT_AD_CONSENT } from '@/lib/monetization/ads/consent';
import type { LeadCampaign } from '@/lib/monetization/leads/campaigns';

const PEPPER = 'operations-pepper-at-least-thirty-two-chars';

describe('attribution', () => {
  it('records a source without recording a person', () => {
    const clean = sanitizeAttribution({
      landingPath: '/cost/hvac-replacement?utm_source=google&secret=hunter2',
      referrerCategory: 'organic_search',
      referrerHost: 'WWW.GOOGLE.COM',
      utmSource: 'google',
      sessionId: 'abc123',
    });
    // The query string is discarded, not trimmed: it is where a search term or
    // a personal value would sit.
    expect(clean.landingPath).toBe('/cost/hvac-replacement');
    expect(clean.referrerHost).toBe('www.google.com');
    expect(JSON.stringify(clean)).not.toContain('hunter2');
  });

  it('bounds and strips anything a browser sends', () => {
    const clean = sanitizeAttribution({
      landingPath: 'javascript:alert(1)',
      utmSource: '<script>alert(1)</script>',
      referrerCategory: 'not-a-category',
      sessionId: 'x'.repeat(500),
    });
    expect(clean.landingPath).toBeUndefined();
    expect(clean.utmSource).not.toContain('<');
    expect(clean.referrerCategory).toBeUndefined();
    expect((clean.sessionId ?? '').length).toBeLessThanOrEqual(80);
  });

  it('does not guess that search traffic was paid', () => {
    expect(classifyReferrer('https://www.google.com/', 'costanswer.com').category).toBe('organic_search');
    expect(classifyReferrer('https://www.google.com/', 'costanswer.com', 'cpc').category).toBe('paid_search');
    expect(classifyReferrer(undefined, 'costanswer.com').category).toBe('direct');
    expect(classifyReferrer('https://costanswer.com/x', 'costanswer.com').category).toBe('internal');
    expect(classifyReferrer('not a url', 'costanswer.com').category).toBe('unknown');
  });

  it('reduces a referrer to a host, never a full URL', () => {
    const result = classifyReferrer('https://forum.example.com/thread/private-topic?q=me', 'costanswer.com');
    expect(result.host).toBe('forum.example.com');
    expect(JSON.stringify(result)).not.toContain('private-topic');
  });
});

describe('affiliate conversion import', () => {
  const csv = [
    'line_reference,merchant_id,occurred_on,amount,status',
    'L1,amazon,2026-09-01,12.34,confirmed',
    'L2,amazon,2026-09-02,4.00,paid',
    'L3,amazon,2026-09-03,12.34,reversed',
  ].join('\n');

  it('parses a statement without guessing at a bad row', () => {
    const bad = parseConversionCsv([
      'line_reference,merchant_id,occurred_on,amount,status',
      'L1,amazon,not-a-date,1.00,confirmed',
      'L2,amazon,2026-09-02,abc,confirmed',
      'L3,amazon,2026-09-03,1.00,invented_status',
    ].join('\n'));
    expect(bad.lines).toHaveLength(0);
    // Three reported problems, not three silently skipped rows.
    expect(bad.problems).toHaveLength(3);
  });

  it('refuses a file missing a required column', () => {
    const result = parseConversionCsv('line_reference,merchant_id\nL1,amazon');
    expect(result.lines).toHaveLength(0);
    expect(result.problems[0].reason).toMatch(/Missing columns/);
  });

  it('forces a reversal negative even when the statement reports it positive', () => {
    const parsed = parseConversionCsv(csv);
    const reversal = parsed.lines.find((line) => line.status === 'reversed');
    expect(reversal?.amount.minorUnits).toBe(-1234);
  });

  it('imports once and nets to the right figure', async () => {
    const database = new FakeD1();
    const parsed = parseConversionCsv(csv);
    const first = await importConversions(database, parsed.lines, 'admin@example.com');

    expect(first.imported).toBe(3);
    expect(first.duplicates).toBe(0);
    // 12.34 confirmed + 4.00 paid - 12.34 reversed
    const totals = totalRevenue(await revenueBetween(database, '2000-01-01T00:00:00Z', '2100-01-01T00:00:00Z'));
    expect(totals.realized.minorUnits).toBe(400);
  });

  it('treats a re-imported statement as a no-op, not a doubled month', async () => {
    const database = new FakeD1();
    const parsed = parseConversionCsv(csv);
    await importConversions(database, parsed.lines, 'admin@example.com');
    const second = await importConversions(database, parsed.lines, 'admin@example.com');

    expect(second.imported).toBe(0);
    expect(second.duplicates).toBe(3);
    expect(database.select('revenue_ledger')).toHaveLength(3);
    expect(await recentImports(database)).toHaveLength(3);
  });
});

describe('configuration without a deploy', () => {
  function campaign(overrides: Partial<LeadCampaign> = {}): LeadCampaign {
    return {
      campaignId: 'c1', providerId: 'mock', vertical: 'roofing', displayName: 'R',
      active: true, exclusive: true, allowsFallback: false, priority: 100,
      payoutModel: 'per_lead', expectedPayoutMinor: 6_500,
      stateCoverage: ['TX'], zipCoverage: [], excludedStates: [],
      requiredFields: ['phone'], consentScope: [], disclosedPartnerName: 'P1',
      qualityFloor: 0, ...overrides,
    };
  }

  it('writes a campaign and can pause it', async () => {
    const database = new FakeD1();
    await upsertCampaign(database, campaign());
    expect(await allCampaigns(database)).toHaveLength(1);

    await setCampaignActive(database, 'c1', false);
    expect(database.select('lead_campaigns')[0].active).toBe(0);
  });

  it('refuses a campaign with no disclosed partner name', async () => {
    const database = new FakeD1();
    // Without one, consent could never name it, so it could never be delivered
    // to — a campaign that exists and can never receive anything is a trap.
    await expect(upsertCampaign(database, campaign({ disclosedPartnerName: '  ' })))
      .rejects.toThrow(/partner name/);
  });

  it('refuses a quality floor outside a fraction', async () => {
    const database = new FakeD1();
    await expect(upsertCampaign(database, campaign({ qualityFloor: 7 }))).rejects.toThrow(/fraction/);
  });
});

describe('call campaigns', () => {
  const base = {
    callCampaignId: 'call-1', providerId: 'hslg', vertical: 'roofing' as const,
    trackedNumberE164: '+18005551234', displayNumber: '(800) 555-1234',
    active: true, validFrom: '2026-01-01', stateCoverage: ['TX'],
    timezone: 'America/Chicago', openHour: 8, closeHour: 18,
    disclosedPartnerName: 'Partner A',
  };

  it('stores a provisioned number and reads it back', async () => {
    const database = new FakeD1();
    await upsertCallCampaign(database, base);
    const live = await activeCallCampaigns(database, 'roofing');
    expect(live).toHaveLength(1);
    expect(live[0].trackedNumberE164).toBe('+18005551234');
  });

  it('refuses a number that is not E.164', async () => {
    const database = new FakeD1();
    // A mistyped number must fail where somebody can fix it, not vanish
    // silently from a live page.
    await expect(upsertCallCampaign(database, { ...base, trackedNumberE164: '8005551234' }))
      .rejects.toThrow(/E.164/);
  });

  it('refuses an impossible answering window', async () => {
    const database = new FakeD1();
    await expect(upsertCallCampaign(database, { ...base, openHour: 18, closeHour: 8 }))
      .rejects.toThrow(/real window/);
  });

  it('can be paused', async () => {
    const database = new FakeD1();
    await upsertCallCampaign(database, base);
    await setCallCampaignActive(database, 'call-1', false);
    expect(await activeCallCampaigns(database, 'roofing')).toHaveLength(0);
  });
});

describe('privacy tooling', () => {
  async function seedLead(database: FakeD1) {
    await saveLeadRequest(database, {
      leadId: 'ld_1', vertical: 'roofing', pageId: 'p', locale: 'en-US',
      zip: '75201', project: {}, qualification: {}, attribution: {},
      purgeAfter: '2030-01-01T00:00:00Z',
    });
    const hashes = await hashContact({ phone: '214-555-1234', email: 'sam@example.com' }, PEPPER);
    await saveLeadContact(database, {
      leadId: 'ld_1', firstName: 'Sam', lastName: 'Rivera',
      phone: '2145551234', email: 'sam@example.com', ...hashes,
    }, '2027-01-01T00:00:00Z');
    await recordConsent(database, {
      leadId: 'ld_1', consentVersion: 'v1', consentTextId: 't', consentTextSha256: 'abc',
      locale: 'en-US', pagePath: '/', serviceRequested: 'roofing',
      disclosedPartners: ['Partner A'], communicationScope: [],
      privacyPolicyVersion: '1', termsVersion: '1', acceptedAt: '2026-09-06T00:00:00Z',
    });
  }

  it('masks contact details by default', async () => {
    const database = new FakeD1();
    await seedLead(database);
    const dossier = await leadDossier(database, 'ld_1');

    expect(dossier?.contact.phone).toMatch(/^•+1234$/);
    expect(dossier?.contact.email).toMatch(/^s•+@example\.com$/);
    expect(JSON.stringify(dossier)).not.toContain('2145551234');
    expect(JSON.stringify(dossier)).not.toContain('sam@example.com');
  });

  it('reveals only when explicitly asked', async () => {
    const database = new FakeD1();
    await seedLead(database);
    const dossier = await leadDossier(database, 'ld_1', true);
    expect(dossier?.contact.phone).toBe('2145551234');
  });

  it('answers the four questions a privacy request actually asks', async () => {
    const database = new FakeD1();
    await seedLead(database);
    const dossier = await leadDossier(database, 'ld_1');

    expect(dossier?.consent?.disclosedPartners).toEqual(['Partner A']);
    expect(dossier?.contactRetainedUntil).toBe('2027-01-01T00:00:00Z');
    expect(dossier?.contactPurged).toBe(false);
    expect(dossier?.deliveries).toEqual([]);
  });

  it('cannot be used to browse: a match needs details already known', async () => {
    const database = new FakeD1();
    await seedLead(database);
    expect(await findLeadsForSubject(database, { phone: '214-555-1234' }, PEPPER)).toEqual(['ld_1']);
    expect(await findLeadsForSubject(database, { phone: '999-555-0000' }, PEPPER)).toEqual([]);
    expect(await findLeadsForSubject(database, {}, PEPPER)).toEqual([]);
  });

  it('erases the person, keeps the record, and suppresses future use', async () => {
    const database = new FakeD1();
    await seedLead(database);

    const outcome = await processDeletionRequest(
      database, { phone: '214-555-1234' }, PEPPER, 'admin@example.com',
    );

    expect(outcome.leadsErased).toBe(1);
    expect(outcome.suppressed).toBe(true);
    expect(await loadLeadContactForDelivery(database, 'ld_1')).toBeNull();
    // The business record and the consent evidence stay on their own clocks.
    expect(database.select('lead_requests')).toHaveLength(1);
    expect(database.select('lead_consents')).toHaveLength(1);

    const hashes = await hashContact({ phone: '214-555-1234' }, PEPPER);
    expect(await isSuppressed(database, hashes)).toBe(true);
  });

  it('does not claim to reach into a partner it already sent to', async () => {
    const database = new FakeD1();
    await seedLead(database);
    const outcome = await processDeletionRequest(
      database, { phone: '214-555-1234' }, PEPPER, 'admin@example.com',
    );
    expect(outcome.notice).toMatch(/controls it independently/);
    expect(outcome.notice).not.toMatch(/deleted everywhere|fully erased/i);
  });

  it('logs the request against a hash, never a contact detail', async () => {
    const database = new FakeD1();
    await seedLead(database);
    await processDeletionRequest(database, { phone: '214-555-1234' }, PEPPER, 'admin@example.com');
    const logged = JSON.stringify(database.select('privacy_requests'));
    expect(logged).not.toContain('2145551234');
    expect(logged).not.toContain('214-555-1234');
  });
});

describe('advertising consent', () => {
  it('treats an unanswered opt-in regime as "wait", not "yes"', () => {
    expect(mayLoadAdScript('tcf_v2', DEFAULT_AD_CONSENT)).toBe(false);
    expect(mayLoadAdScript('tcf_v2', { ...DEFAULT_AD_CONSENT, script: 'granted' })).toBe(true);
  });

  it('treats an unanswered opt-out regime as "proceed"', () => {
    // Encoding the two regimes the same way is either a compliance failure or
    // revenue thrown away, depending on which way you get it wrong.
    expect(mayLoadAdScript('us_state_optout', DEFAULT_AD_CONSENT)).toBe(true);
    expect(mayLoadAdScript('us_state_optout', { ...DEFAULT_AD_CONSENT, script: 'denied' })).toBe(false);
  });

  it('lets a sale opt-out force contextual advertising', () => {
    expect(mayPersonalise({ script: 'granted', personalisation: 'granted', saleOptOut: true })).toBe(false);
    expect(mayPersonalise({ script: 'granted', personalisation: 'granted', saleOptOut: false })).toBe(true);
    expect(mayPersonalise(DEFAULT_AD_CONSENT)).toBe(false);
  });

  it('reads a malformed stored preference as no preference', () => {
    expect(parseAdConsent('nonsense')).toEqual(DEFAULT_AD_CONSENT);
    expect(parseAdConsent({ script: 'maybe' })).toEqual(DEFAULT_AD_CONSENT);
  });
});
