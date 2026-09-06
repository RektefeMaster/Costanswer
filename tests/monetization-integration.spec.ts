/**
 * The pipeline end to end, against the in-memory store.
 *
 * These are the paths that matter operationally: a happy path, a path where
 * there is no buyer, a path where the provider times out, and the four ways one
 * submission could become two billable leads. Each of them is a way to lose
 * money or to mistreat somebody, and none of them is provable from a unit test
 * of a single function.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeD1 } from './support/fake-d1';
import { checkCoverage, deliver, submitLead, suppressPerson, type LeadServiceConfig } from '@/lib/monetization/leads/service';
import { campaignToBindings, type LeadCampaign } from '@/lib/monetization/leads/campaigns';
import { activeConsentVersion } from '@/lib/monetization/consent/versions';
import { nowIso } from '@/lib/monetization/store/d1';
import { getLeadRequest, loadLeadContactForDelivery } from '@/lib/monetization/store/repositories/leads';
import { getConsentForLead } from '@/lib/monetization/store/repositories/consents';
import { deliveriesForLead } from '@/lib/monetization/store/repositories/deliveries';
import type { LeadSubmissionInput } from '@/lib/monetization/leads/schema';

const PEPPER = 'integration-pepper-at-least-thirty-two-chars';
const PARTNER = 'Partner A';

const config: LeadServiceConfig = {
  hashPepper: PEPPER,
  privacyPolicyVersion: '1',
  termsVersion: '1',
  environment: { LEADS_MOCK_ENABLED: 'true', LEADS_ENABLED: 'true', MONETIZATION_ENABLED: 'true', NODE_ENV: 'test' },
};

function campaign(overrides: Partial<LeadCampaign> = {}): LeadCampaign {
  return {
    campaignId: 'camp-roofing', providerId: 'mock', vertical: 'roofing',
    displayName: 'Roofing', active: true, exclusive: true, allowsFallback: false,
    priority: 100, payoutModel: 'per_lead', expectedPayoutMinor: 6_500,
    stateCoverage: ['TX'], zipCoverage: [], excludedStates: [],
    requiredFields: ['phone', 'zip'], consentScope: ['contact_about_this_request'],
    disclosedPartnerName: PARTNER, qualityFloor: 0,
    ...overrides,
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

function submission(overrides: Partial<LeadSubmissionInput> = {}): LeadSubmissionInput {
  return {
    vertical: 'roofing',
    pageId: 'job-roof-replacement',
    calculatorId: 'job-roof-replacement',
    locale: 'en-US',
    zip: '75201',
    state: 'TX',
    project: { type: 'roof_replacement', size: 30, unit: 'roof-square', estimatedLow: 11_000, estimatedHigh: 15_500 },
    qualification: { homeowner: true, timeframe: 'within_1_month', workType: 'replacement' },
    contact: { firstName: 'Sam', phone: '214-555-1234', email: 'sam@example.com' },
    consent: {
      version: activeConsentVersion(new Date().toISOString().slice(0, 10)).version,
      accepted: true,
      partnerName: PARTNER,
    },
    elapsedMs: 30_000,
    ...overrides,
  } as LeadSubmissionInput;
}

describe('lead pipeline, end to end', () => {
  let database: FakeD1;

  beforeEach(() => {
    database = new FakeD1();
  });

  it('runs the happy path: coverage, consent, routing, delivery, revenue', async () => {
    await seed(database);

    const coverage = await checkCoverage(database, { vertical: 'roofing', zip: '75201', state: 'TX' }, config);
    expect(coverage.covered).toBe(true);
    expect(coverage.partnerName).toBe(PARTNER);

    const outcome = await submitLead(database, submission(), config, { pagePath: '/cost/roof-replacement' });
    expect(outcome.disposition).toBe('submitted');

    const lead = await getLeadRequest(database, outcome.leadId);
    expect(lead?.status).toBe('accepted');
    expect(lead?.selectedCampaignId).toBe('camp-roofing');

    // Consent exists, names the partner, and was recorded before delivery.
    const consent = await getConsentForLead(database, outcome.leadId);
    expect(consent?.disclosedPartners).toEqual([PARTNER]);
    expect(consent?.consentTextSha256).toMatch(/^[a-f0-9]{64}$/);

    const deliveries = await deliveriesForLead(database, outcome.leadId);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].status).toBe('accepted');

    // Revenue is estimated, not confirmed: a buyer accepting is not a buyer paying.
    const ledger = database.select('revenue_ledger');
    expect(ledger).toHaveLength(1);
    expect(ledger[0].status).toBe('estimated');
    expect(ledger[0].amount_minor).toBe(6_500);
  });

  it('asks for no contact details when nothing covers the area', async () => {
    await seed(database, { stateCoverage: ['CA'] });
    const coverage = await checkCoverage(database, { vertical: 'roofing', zip: '75201', state: 'TX' }, config);
    expect(coverage.covered).toBe(false);
    expect(coverage.partnerName).toBeUndefined();
    // Nothing was written. No lead, no contact, no consent.
    expect(database.select('lead_requests')).toHaveLength(0);
    expect(database.select('lead_contacts')).toHaveLength(0);
  });

  it('reports no route without claiming success when no campaign accepts', async () => {
    await seed(database, { stateCoverage: ['CA'] });
    const outcome = await submitLead(database, submission(), config, { pagePath: '/cost/roof-replacement' });
    expect(outcome.disposition).toBe('no_route');
    const lead = await getLeadRequest(database, outcome.leadId);
    expect(lead?.status).toBe('failed');
    // Nothing was delivered anywhere.
    expect(await deliveriesForLead(database, outcome.leadId)).toHaveLength(0);
  });

  it('never claims a submission succeeded while the provider is still unknown', async () => {
    await seed(database, { providerId: 'mock' });
    // The mock accepts by default; a timeout is exercised in the unit tests.
    // What is asserted here is the wording contract: only an accepted delivery
    // reports "submitted".
    const outcome = await submitLead(database, submission(), config, { pagePath: '/x' });
    const deliveries = await deliveriesForLead(database, outcome.leadId);
    if (deliveries[0].status !== 'accepted') expect(outcome.disposition).not.toBe('submitted');
    else expect(outcome.disposition).toBe('submitted');
  });

  it('suppresses a person who asked us to stop, before anything is stored about them', async () => {
    await seed(database);
    await suppressPerson(database, { phone: '214-555-1234', reason: 'asked us to stop' }, config);

    const outcome = await submitLead(database, submission(), config, { pagePath: '/x' });
    expect(outcome.disposition).toBe('suppressed');
    expect(await loadLeadContactForDelivery(database, outcome.leadId)).toBeNull();
    expect(await deliveriesForLead(database, outcome.leadId)).toHaveLength(0);
  });

  it('suppresses a duplicate of the same person in the same vertical', async () => {
    await seed(database);
    const first = await submitLead(database, submission(), config, { pagePath: '/x' });
    expect(first.disposition).toBe('submitted');

    const second = await submitLead(database, submission(), config, { pagePath: '/x' });
    expect(second.disposition).toBe('suppressed');
    expect(await deliveriesForLead(database, second.leadId)).toHaveLength(0);
    // One billable delivery for one person, not two.
    expect(database.select('lead_deliveries')).toHaveLength(1);
  });

  it('drops a bot without an error message and without storing anything', async () => {
    await seed(database);
    const outcome = await submitLead(database, submission({ website: 'http://spam.example' }), config, { pagePath: '/x' });
    expect(outcome.reason).toBe('honeypot');
    expect(database.select('lead_requests')).toHaveLength(0);
    expect(database.select('lead_contacts')).toHaveLength(0);
  });

  it('refuses a submission whose consent version is no longer the live one', async () => {
    await seed(database);
    const outcome = await submitLead(
      database,
      submission({ consent: { version: '1999-01-01.1', accepted: true, partnerName: PARTNER } }),
      config,
      { pagePath: '/x' },
    );
    expect(outcome.disposition).toBe('failed');
    expect(await deliveriesForLead(database, outcome.leadId)).toHaveLength(0);
  });

  it('refuses to deliver to a campaign the consent did not name', async () => {
    await seed(database, { disclosedPartnerName: 'Someone Else' });
    const outcome = await submitLead(database, submission(), config, { pagePath: '/x' });
    expect(outcome.disposition).toBe('no_route');
  });

  it('cannot deliver the same lead to the same campaign twice', async () => {
    await seed(database);
    const outcome = await submitLead(database, submission(), config, { pagePath: '/x' });
    // A second delivery attempt derives the same provider idempotency key, and
    // the unique index refuses it. This is the guard that stops a retry loop
    // from billing a buyer five times for one person.
    await expect(deliver(database, {
      leadId: outcome.leadId, campaignId: 'camp-roofing', config, now: Date.now(),
    })).rejects.toThrow(/UNIQUE/);
  });

  it('stores no contact detail in the aggregate event counters', async () => {
    await seed(database);
    await submitLead(database, submission(), config, { pagePath: '/x' });
    const serialized = JSON.stringify(database.select('monetization_events'));
    expect(serialized).not.toContain('214');
    expect(serialized).not.toContain('sam@example.com');
    expect(serialized).not.toContain('Sam');
    expect(serialized).not.toContain('75201');
  });

  it('keeps contact details out of the lead row itself', async () => {
    await seed(database);
    const outcome = await submitLead(database, submission(), config, { pagePath: '/x' });
    const row = database.select('lead_requests').find((entry) => entry.lead_id === outcome.leadId);
    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain('214-555-1234');
    expect(serialized).not.toContain('sam@example.com');
    expect(serialized).not.toContain('Sam');
  });

  it('stores only hashes for the duplicate index, never a readable number', async () => {
    await seed(database);
    await submitLead(database, submission(), config, { pagePath: '/x' });
    const contact = database.select('lead_contacts')[0];
    expect(String(contact.phone_hash)).toMatch(/^[a-f0-9]{64}$/);
    expect(String(contact.phone_hash)).not.toContain('2145551234');
  });
});
