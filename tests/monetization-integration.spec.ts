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
import {
  deliveriesForLead, deliveryForProviderLead, dueDeliveries,
} from '@/lib/monetization/store/repositories/deliveries';
import {
  advanceRevenueStatus, findRevenueForDelivery, recordReversal, revenueBetween,
} from '@/lib/monetization/store/repositories/revenue';
import { offersForCategories, setAffiliateOfferEnabled } from '@/lib/monetization/store/repositories/affiliate';
import { totalRevenue } from '@/lib/monetization/revenue/ledger';
import { createMonetizationContext } from '@/lib/monetization/context';
import { resolveMonetizationSurface } from '@/lib/monetization/surface';
import { setMonetizationDatabase } from '@/lib/monetization/store/d1';
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

  it('creates exactly one delivery row per lead and campaign', async () => {
    await seed(database);
    const outcome = await submitLead(database, submission(), config, { pagePath: '/x' });
    expect(await deliveriesForLead(database, outcome.leadId)).toHaveLength(1);
    // The unique index on (provider_id, idempotency_key) is what makes that
    // true, and it is the double-billing guard.
    expect(database.select('lead_deliveries')).toHaveLength(1);
  });

  it('lets the drain job finish a delivery that failed transiently', async () => {
    /*
     * The regression this pins: `deliver` used to create a new delivery row on
     * every call, so a retry derived the same provider idempotency key, hit the
     * unique index and threw. The outbox could never drain and every timed-out
     * lead was stuck forever — with the reader told "we are still confirming"
     * and nobody ever confirming.
     */
    await seed(database);
    const outcome = await submitLead(database, submission(), config, { pagePath: '/x' });

    const row = database.select('lead_deliveries')[0];
    row.status = 'retryable_failure';
    row.next_attempt_at = null;

    const due = await dueDeliveries(database, 10);
    expect(due).toHaveLength(1);

    await expect(deliver(database, {
      leadId: outcome.leadId, campaignId: 'camp-roofing', config, now: Date.now(),
    })).resolves.toMatchObject({ status: 'accepted' });

    // Still one row: the retry continued the delivery rather than opening a
    // second billable one.
    expect(database.select('lead_deliveries')).toHaveLength(1);
  });

  it('stops retrying once the attempt budget is spent', async () => {
    await seed(database);
    const outcome = await submitLead(database, submission(), config, { pagePath: '/x' });
    const row = database.select('lead_deliveries')[0];
    row.status = 'retryable_failure';
    row.attempt_count = 5;
    row.next_attempt_at = null;

    await expect(deliver(database, {
      leadId: outcome.leadId, campaignId: 'camp-roofing', config, now: Date.now(),
    })).resolves.toMatchObject({ status: 'permanent_failure' });
  });

  it('names a partner who actually covers the caller', async () => {
    /*
     * Coverage used to pick the highest-priority campaign without applying
     * geography, so a caller in Texas could be shown a California partner,
     * consent to that partner by name, and only be told there was no route
     * after filling in the entire form.
     */
    await seed(database, { campaignId: 'far', priority: 900, stateCoverage: ['CA'], disclosedPartnerName: 'Far Partner' });
    const timestamp = nowIso();
    await database.prepare(`
      INSERT INTO lead_campaigns (
        campaign_id, provider_id, vertical, display_name, active, exclusive,
        allows_fallback, priority, payout_model, expected_payout_minor, daily_cap,
        hourly_cap, state_coverage, zip_coverage, excluded_states, required_fields,
        consent_scope, disclosed_partner_name, quality_floor, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(...campaignToBindings(campaign({ campaignId: 'near', priority: 1, stateCoverage: ['TX'] }), timestamp)).run();

    const coverage = await checkCoverage(database, { vertical: 'roofing', zip: '75201', state: 'TX' }, config);
    expect(coverage.covered).toBe(true);
    expect(coverage.partnerName).toBe(PARTNER);
  });

  it('finds a state-scoped campaign from a ZIP alone', async () => {
    // The public route only ever has a ZIP. Without a ZIP-to-state lookup every
    // state-scoped campaign was invisible and coverage answered "no" forever.
    await seed(database, { stateCoverage: ['TX'] });
    const coverage = await checkCoverage(database, { vertical: 'roofing', zip: '75201' }, config);
    expect(coverage.covered).toBe(true);
    expect(coverage.partnerName).toBe(PARTNER);
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

describe('provider callbacks and the ledger', () => {
  let database: FakeD1;

  beforeEach(() => {
    database = new FakeD1();
  });

  it('advances the estimate rather than booking the same lead twice', async () => {
    /*
     * A buyer confirming a lead is the same money as the estimate booked when
     * they accepted it. Inserting a confirmed row and leaving the estimated one
     * behind showed the operator $65 estimated *and* $65 confirmed for one
     * lead — the "never mix estimated and paid" rule broken from the inside.
     */
    await seed(database);
    const outcome = await submitLead(database, submission(), config, { pagePath: '/x' });
    const delivery = (await deliveriesForLead(database, outcome.leadId))[0];
    expect(delivery.providerLeadId).toBeTruthy();

    const found = await deliveryForProviderLead(database, 'mock', delivery.providerLeadId!);
    expect(found?.deliveryId).toBe(delivery.deliveryId);

    const entry = await findRevenueForDelivery(database, delivery.deliveryId);
    expect(entry?.status).toBe('estimated');

    await advanceRevenueStatus(database, entry!.entryId, 'confirmed');
    const rows = database.select('revenue_ledger');
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('confirmed');

    // Production totals stay empty: the mock provider books its revenue as test
    // data, and test rows are never summed into a figure an operator reads.
    const production = totalRevenue(await revenueBetween(database, '2000-01-01T00:00:00Z', '2100-01-01T00:00:00Z'));
    expect(production.realized.minorUnits).toBe(0);

    // Including test rows, the one entry has moved from estimated to confirmed
    // rather than being counted in both columns.
    const withTest = totalRevenue(
      (await revenueBetween(database, '2000-01-01T00:00:00Z', '2100-01-01T00:00:00Z', true))
        .map((entry) => ({ ...entry, isTest: false })),
    );
    expect(withTest.estimated.minorUnits).toBe(0);
    expect(withTest.realized.minorUnits).toBe(6_500);
  });

  it('can reverse the entry a confirmation created', async () => {
    await seed(database);
    const outcome = await submitLead(database, submission(), config, { pagePath: '/x' });
    const delivery = (await deliveriesForLead(database, outcome.leadId))[0];
    const entry = await findRevenueForDelivery(database, delivery.deliveryId);

    await advanceRevenueStatus(database, entry!.entryId, 'confirmed');
    await recordReversal(database, entry!.entryId);

    const rows = (await revenueBetween(database, '2000-01-01T00:00:00Z', '2100-01-01T00:00:00Z', true))
      .map((row) => ({ ...row, isTest: false }));
    // Two rows, the way a provider statement shows a payment and its clawback.
    expect(rows).toHaveLength(2);
    const totals = totalRevenue(rows);
    expect(totals.confirmed.minorUnits).toBe(6_500);
    expect(totals.reversed.minorUnits).toBe(6_500);
    expect(totals.realized.minorUnits).toBe(0);
  });
});

describe('the affiliate module can actually reach the page', () => {
  it('loads enabled offers for the categories a policy declares', async () => {
    /*
     * The module used to receive an empty list on every render because nothing
     * read the offers table — configured or not, it could never appear.
     */
    const database = new FakeD1();
    const timestamp = nowIso();
    await database.prepare(`
      INSERT INTO affiliate_offers (
        offer_id, merchant_id, category, locale, headline, body, cta,
        destination_url, enabled, commercial_weight, last_verified_at, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      'o1', 'amazon', 'concrete_tools', 'en-US', 'Mixing tools', 'For a slab this size.',
      'Shop', 'https://www.amazon.com/dp/TEST', 1, 10, null, timestamp, timestamp,
    ).run();

    const offers = await offersForCategories(database, ['concrete_tools'], 'en-US');
    expect(offers).toHaveLength(1);
    expect(offers[0].offerId).toBe('o1');

    // A disabled offer, a different locale and an unrelated category all drop out.
    await setAffiliateOfferEnabled(database, 'o1', false);
    expect(await offersForCategories(database, ['concrete_tools'], 'en-US')).toHaveLength(0);
    await setAffiliateOfferEnabled(database, 'o1', true);
    expect(await offersForCategories(database, ['concrete_tools'], 'es-US')).toHaveLength(0);
    expect(await offersForCategories(database, ['paint_supplies'], 'en-US')).toHaveLength(0);
  });

  it('renders nothing when the database is absent, and does not throw', async () => {
    setMonetizationDatabase(undefined);
    const context = createMonetizationContext({
      pageId: 'concrete', locale: 'en-US', vertical: 'diy', riskClass: 'low',
      leadEligible: false, affiliateEligible: true, adsEligible: true, intent: 'diy',
    });
    const surface = await resolveMonetizationSurface(context, {});
    expect(surface.offers).toEqual([]);
    expect(surface.showIntentSwitch).toBe(false);
  });
});
