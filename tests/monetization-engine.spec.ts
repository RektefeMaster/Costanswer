import { describe, expect, it } from 'vitest';
import { FakeD1 } from './support/fake-d1';
import { money, moneyFromDecimalString, revenuePerThousand, sumMoney } from '@/lib/monetization/money';
import { generateId, isId } from '@/lib/monetization/ids';
import { normalizeEmail, normalizePhone, pepperedHash, timingSafeEqual, verifyHmacSignature } from '@/lib/monetization/hash';
import { assertPlainData, toCalculationFacts } from '@/lib/monetization/boundary';
import { createMonetizationContext } from '@/lib/monetization/context';
import { JOB_IDS } from '@/lib/job/catalog';
import { assertPoliciesAreUnique, getMonetizationPolicy, MONETIZATION_POLICIES } from '@/lib/monetization/policy';
import { tools } from '@/lib/tool-registry';
import { resolveFlag } from '@/lib/monetization/flags';
import { activeConsentVersion, assertConsentVersionsAreComplete, renderConsent } from '@/lib/monetization/consent/versions';
import { hasCoverage, requiredFieldsFor, routeLead, scoreLeadQuality } from '@/lib/monetization/leads/routing';
import type { LeadCampaign } from '@/lib/monetization/leads/campaigns';
import { campaignCoversLocation } from '@/lib/monetization/leads/campaigns';
import { assertDeliveryTransition, assertLeadTransition, isTerminalDeliveryStatus } from '@/lib/monetization/leads/types';
import { attemptDelivery, dispositionFor, mayAttemptFallback, nextAttemptDelayMs } from '@/lib/monetization/leads/delivery';
import { MockLeadProvider } from '@/lib/monetization/leads/providers/mock';
import { AngiLeadProvider, HomeServicesLeadGroupProvider, LeadBankProvider } from '@/lib/monetization/leads/providers/networks';
import { assertAllowedEndpoint, GenericServerPostProvider } from '@/lib/monetization/leads/providers/generic-post';
import { checkDuplicate, hashContact } from '@/lib/monetization/leads/dedupe';
import { once, providerIdempotencyKey } from '@/lib/monetization/leads/idempotency';
import { silentRejectionFor, leadSubmissionSchema } from '@/lib/monetization/leads/schema';
import { assertRevenueTransition, reversalOf, totalRevenue } from '@/lib/monetization/revenue/ledger';
import { stateForZip } from '@/lib/monetization/leads/location';
import { AdSlot } from '@/components/monetization/AdSlot';
import { parseMonetizationEvent, FORBIDDEN_ANALYTICS_FIELDS } from '@/lib/monetization/events';
import { affiliateForbidden, relevantCategories } from '@/lib/monetization/affiliate/relevance';
import { selectOffers } from '@/lib/monetization/affiliate/commercial';
import { AFFILIATE_MERCHANTS, assertCatalogCoversPolicies, isMerchantLinkable } from '@/lib/monetization/affiliate/catalog';
import { buildAffiliateLink, AFFILIATE_REL, priceDisplayMode } from '@/lib/monetization/affiliate/links';
import { AMAZON_REQUIRED_STATEMENT, disclosureText, getDisclosure } from '@/lib/monetization/affiliate/disclosure';
import { activeAdProvider, adCspSources } from '@/lib/monetization/ads/provider';
import { assertPlacementOrder, TOOL_PAGE_ORDER } from '@/lib/monetization/ads/slots';
import { isCallCampaignLive, isWithinCallHours, liveCallCampaign } from '@/lib/monetization/calls/types';
import { monetizationStore, setMonetizationDatabase } from '@/lib/monetization/store/d1';
import { recordConsent, assertDeliveryConsent } from '@/lib/monetization/store/repositories/consents';
import { createDelivery, markDeliveryProcessing, recordProviderEvent, settleDelivery } from '@/lib/monetization/store/repositories/deliveries';
import { saveLeadContact, saveLeadRequest, purgeLeadContact, loadLeadContactForDelivery } from '@/lib/monetization/store/repositories/leads';
import { addSuppression, isSuppressed, loadFlagOverrides, recordConfigChange, recentConfigChanges, setKillSwitch } from '@/lib/monetization/store/repositories/governance';
import { d1IdempotencyStore } from '@/lib/monetization/store/repositories/idempotency';
import { incrementEventCounter, recordRevenue } from '@/lib/monetization/store/repositories/revenue';

const PEPPER = 'test-pepper-that-is-at-least-32-characters-long';

function campaign(overrides: Partial<LeadCampaign> = {}): LeadCampaign {
  return {
    campaignId: 'camp-a', providerId: 'mock', vertical: 'roofing', displayName: 'Roofing A',
    active: true, exclusive: true, allowsFallback: false, priority: 100,
    payoutModel: 'per_lead', expectedPayoutMinor: 6_500,
    stateCoverage: [], zipCoverage: [], excludedStates: [],
    requiredFields: ['phone', 'zip'], consentScope: ['contact_about_this_request'],
    disclosedPartnerName: 'Partner A', qualityFloor: 0,
    ...overrides,
  };
}

function routingInput(overrides: Partial<Parameters<typeof routeLead>[0]> = {}) {
  return {
    vertical: 'roofing',
    location: { state: 'TX', zip: '75201' },
    qualification: {},
    qualityScore: 0.8,
    campaigns: [campaign()],
    health: new Map(),
    usage: new Map(),
    enabledProviderIds: new Set(['mock']),
    disclosedPartnerNames: new Set(['Partner A']),
    ...overrides,
  } as Parameters<typeof routeLead>[0];
}

const ALL_FIELDS = new Set(['phone', 'email', 'zip', 'first_name', 'last_name', 'homeowner', 'property_type', 'timeframe', 'work_type', 'address_line1', 'city']);

describe('money', () => {
  it('refuses fractional minor units', () => {
    expect(() => money(12.5)).toThrow(/whole minor units/);
  });

  it('parses a provider decimal without a float artefact', () => {
    expect(moneyFromDecimalString('0.07').minorUnits).toBe(7);
    expect(moneyFromDecimalString('1234.56').minorUnits).toBe(123_456);
    expect(moneyFromDecimalString('-12.30').minorUnits).toBe(-1230);
  });

  it('rejects more precision than the currency holds', () => {
    expect(() => moneyFromDecimalString('1.005')).toThrow(/precision/);
    expect(moneyFromDecimalString('1.500').minorUnits).toBe(150);
  });

  it('sums exactly where floats would drift', () => {
    const cents = Array.from({ length: 10 }, () => moneyFromDecimalString('0.07'));
    expect(sumMoney(cents).minorUnits).toBe(70);
  });

  it('distinguishes no sessions from zero revenue', () => {
    expect(revenuePerThousand(money(500), 0)).toBeNull();
    expect(revenuePerThousand(money(500), 250)?.minorUnits).toBe(2000);
  });
});

describe('ids', () => {
  it('produces prefixed, sortable, kind-checked ids', () => {
    const early = generateId('lead', 1_000_000_000_000);
    const later = generateId('lead', 2_000_000_000_000);
    expect(early < later).toBe(true);
    expect(isId(early, 'lead')).toBe(true);
    expect(isId(early, 'consent')).toBe(false);
  });
});

describe('hashing', () => {
  it('refuses a short pepper', async () => {
    await expect(pepperedHash('x', 'short')).rejects.toThrow(/pepper/);
  });

  it('is stable and pepper-dependent', async () => {
    const a = await pepperedHash('phone:2145551234', PEPPER);
    const b = await pepperedHash('phone:2145551234', PEPPER);
    const c = await pepperedHash('phone:2145551234', `${PEPPER}-different`);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('compares in constant time and still compares correctly', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });

  it('verifies an HMAC webhook signature and rejects a forged one', async () => {
    const secret = 'webhook-secret';
    const payload = '{"event":"lead_accepted"}';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
    const hex = [...signed].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    expect(await verifyHmacSignature({ payload, signature: hex, secret })).toBe(true);
    expect(await verifyHmacSignature({ payload, signature: 'deadbeef', secret })).toBe(false);
  });

  it('normalizes phone numbers and rejects impossible ones', () => {
    expect(normalizePhone('(214) 555-1234')).toBe('2145551234');
    expect(normalizePhone('+1 214 555 1234')).toBe('2145551234');
    expect(normalizePhone('014-555-1234')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizeEmail(' Person@Example.COM ')).toBe('person@example.com');
    expect(normalizeEmail('not-an-email')).toBeNull();
  });
});

describe('the calculation/monetization boundary', () => {
  it('lets a finished calculation cross', () => {
    const facts = toCalculationFacts({ calculationVersion: 'concrete-v1' }, { estimateLow: 100, estimateHigh: 200 });
    expect(facts.estimateLow).toBe(100);
    expect(Object.isFrozen(facts)).toBe(true);
  });

  it('refuses commercial vocabulary crossing into a calculation fact', () => {
    for (const key of ['payout', 'commission', 'advertiser', 'merchant', 'campaign', 'bid']) {
      expect(() => toCalculationFacts({ calculationVersion: 'v1' }, { [key]: 1 } as never)).toThrow(/commercial vocabulary/);
    }
  });

  it('refuses a live wire back into the calculation layer', () => {
    expect(() => assertPlainData({ recompute: () => 1 }, 'ctx')).toThrow(/function/);
    expect(() => assertPlainData({ when: new Date() }, 'ctx')).toThrow(/class instance/);
    const withGetter = {};
    Object.defineProperty(withGetter, 'live', { get: () => 1, enumerable: true });
    expect(() => assertPlainData(withGetter, 'ctx')).toThrow(/getter/);
  });

  it('clears every eligibility flag on a restricted page, whatever the caller passed', () => {
    const context = createMonetizationContext({
      pageId: 'bmi', locale: 'en-US', vertical: 'health', riskClass: 'restricted',
      leadEligible: true, affiliateEligible: true, adsEligible: true,
    });
    expect(context.leadEligible).toBe(false);
    expect(context.affiliateEligible).toBe(false);
    expect(context.adsEligible).toBe(false);
  });

  it('drops a malformed ZIP rather than carrying it into a coverage lookup', () => {
    const context = createMonetizationContext({
      pageId: 'concrete', locale: 'en-US', vertical: 'diy', riskClass: 'low',
      leadEligible: false, affiliateEligible: true, adsEligible: true,
      location: { zip: '752', state: 'tx' },
    });
    expect(context.location?.zip).toBeUndefined();
    expect(context.location?.state).toBeUndefined();
  });
});

describe('policy defaults', () => {
  it('has no duplicate entries', () => {
    expect(() => assertPoliciesAreUnique()).not.toThrow();
  });

  it('defaults an unknown page to ads only', () => {
    const policy = getMonetizationPolicy('a-page-nobody-configured');
    expect(policy.pageId).toBe('__default__');
    expect(policy.ads.enabled).toBe(true);
    expect(policy.affiliate.enabled).toBe(false);
    expect(policy.lead.enabled).toBe(false);
  });

  it('gives every shipped calculator its own policy, not the default', () => {
    const missing = tools
      .map((tool) => tool.id)
      .filter((id) => getMonetizationPolicy(id).pageId !== id);
    expect(missing, 'A calculator with no policy entry silently inherits __default__').toEqual([]);
  });

  it('gives every published job page its own policy and drops removed jobs', () => {
    expect(getMonetizationPolicy('job-cost-hub').pageId).toBe('job-cost-hub');
    expect(getMonetizationPolicy('job-cost-estimate').pageId).toBe('job-cost-estimate');
    expect(getMonetizationPolicy('job-quote-check').pageId).toBe('job-quote-check');
    for (const jobId of JOB_IDS) {
      expect(getMonetizationPolicy(`job-${jobId}`).pageId).toBe(`job-${jobId}`);
    }
    expect(getMonetizationPolicy('job-roof-replacement').pageId).toBe('__default__');
  });

  it('never enables lead generation on a financial, insurance or health page', () => {
    for (const policy of MONETIZATION_POLICIES) {
      if (['financial', 'insurance', 'health'].includes(policy.vertical)) {
        expect(policy.lead.enabled, `${policy.pageId} must not run lead generation`).toBe(false);
        expect(policy.affiliate.enabled, `${policy.pageId} must not run affiliate offers`).toBe(false);
      }
    }
  });

  it('runs no commercial module at all on a restricted page', () => {
    for (const policy of MONETIZATION_POLICIES.filter((entry) => entry.riskClass === 'restricted')) {
      expect(policy.ads.enabled).toBe(false);
      expect(policy.affiliate.enabled).toBe(false);
      expect(policy.lead.enabled).toBe(false);
    }
  });

  it('ships every declared lead campaign switched off', () => {
    for (const policy of MONETIZATION_POLICIES) {
      expect(policy.lead.enabled, `${policy.pageId} ships with lead capture on`).toBe(false);
    }
  });

  it('references only affiliate categories the catalog defines', () => {
    const categories = MONETIZATION_POLICIES.flatMap((policy) => policy.affiliate.categories);
    expect(() => assertCatalogCoversPolicies(categories)).not.toThrow();
  });
});

describe('feature flags', () => {
  const base = {
    MONETIZATION_ENABLED: 'true',
    NEXT_PUBLIC_ADVERTISING_ENABLED: 'true',
    NEXT_PUBLIC_AFFILIATES_ENABLED: 'true',
    LEADS_ENABLED: 'true',
    LEADS_MOCK_ENABLED: 'true',
    NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE: '2026-09-06',
    NEXT_PUBLIC_CONTACT_EMAIL: 'privacy@example.com',
    NEXT_PUBLIC_PRIVACY_POLICY_VERSION: '1',
    NODE_ENV: 'test',
  };

  it('turns a child off when its parent is off', () => {
    expect(resolveFlag('leads.mock.enabled', base)).toBe(true);
    expect(resolveFlag('leads.mock.enabled', { ...base, LEADS_ENABLED: 'false' })).toBe(false);
    expect(resolveFlag('leads.mock.enabled', { ...base, MONETIZATION_ENABLED: 'false' })).toBe(false);
  });

  it('lets a stored override turn something off but never on', () => {
    expect(resolveFlag('leads.enabled', base, { 'leads.enabled': false })).toBe(false);
    expect(resolveFlag('leads.enabled', { ...base, LEADS_ENABLED: 'false' }, {})).toBe(false);
  });

  it('refuses the mock provider in production', () => {
    expect(resolveFlag('leads.mock.enabled', { ...base, NODE_ENV: 'production' })).toBe(false);
    expect(resolveFlag('leads.mock.enabled', { ...base, NODE_ENV: 'production', MONETIZATION_ALLOW_MOCKS: 'true' })).toBe(true);
  });
});

describe('consent', () => {
  it('has complete, unique, partner-naming text in both locales', () => {
    expect(() => assertConsentVersionsAreComplete()).not.toThrow();
  });

  it('names the partner in the rendered text and hashes what was shown', () => {
    const version = activeConsentVersion('2026-09-06');
    const rendered = renderConsent(version, 'en-US', 'Partner A');
    expect(rendered.checkboxLabel).toContain('Partner A');
    expect(rendered.checkboxLabel).not.toContain('{{PARTNER}}');
    const other = renderConsent(version, 'en-US', 'Partner B');
    expect(other.sha256).not.toBe(rendered.sha256);
  });

  it('produces different Spanish text, not the English string', () => {
    const version = activeConsentVersion('2026-09-06');
    const english = renderConsent(version, 'en-US', 'Partner A');
    const spanish = renderConsent(version, 'es-US', 'Partner A');
    expect(spanish.checkboxLabel).not.toBe(english.checkboxLabel);
    expect(spanish.checkboxLabel).toContain('Partner A');
  });
});

describe('lead routing', () => {
  it('selects one campaign, not a list to blast', () => {
    const decision = routeLead(routingInput({
      campaigns: [campaign(), campaign({ campaignId: 'camp-b', expectedPayoutMinor: 9_000 })],
    }), ALL_FIELDS);
    expect(decision.outcome).toBe('routed');
    if (decision.outcome !== 'routed') return;
    expect(decision.primary.campaignId).toBe('camp-b');
    expect(decision.fallback).toBeUndefined();
  });

  it('refuses a campaign the consent text did not name, whatever it pays', () => {
    const decision = routeLead(routingInput({
      campaigns: [campaign({ campaignId: 'rich', expectedPayoutMinor: 99_000, disclosedPartnerName: 'Undisclosed' })],
    }), ALL_FIELDS);
    expect(decision.outcome).toBe('no_route');
    if (decision.outcome !== 'no_route') return;
    expect(decision.reason).toContain('partner_not_disclosed');
  });

  it('does not pick a higher-paying campaign that is out of coverage', () => {
    const decision = routeLead(routingInput({
      campaigns: [
        campaign({ campaignId: 'rich', expectedPayoutMinor: 99_000, stateCoverage: ['CA'] }),
        campaign({ campaignId: 'poor', expectedPayoutMinor: 1_000 }),
      ],
    }), ALL_FIELDS);
    expect(decision.outcome).toBe('routed');
    if (decision.outcome !== 'routed') return;
    expect(decision.primary.campaignId).toBe('poor');
  });

  it('discounts a campaign the buyer keeps rejecting', () => {
    const usage = new Map([
      ['rich', { campaignId: 'rich', acceptedToday: 0, acceptedThisHour: 0, recentRejectionRate: 0.9 }],
      ['steady', { campaignId: 'steady', acceptedToday: 0, acceptedThisHour: 0, recentRejectionRate: 0 }],
    ]);
    const decision = routeLead(routingInput({
      campaigns: [
        campaign({ campaignId: 'rich', expectedPayoutMinor: 9_000 }),
        campaign({ campaignId: 'steady', expectedPayoutMinor: 6_000 }),
      ],
      usage,
    }), ALL_FIELDS);
    if (decision.outcome !== 'routed') throw new Error('expected a route');
    expect(decision.primary.campaignId).toBe('steady');
  });

  it('honours daily and hourly caps', () => {
    const capped = campaign({ dailyCap: 5 });
    const usage = new Map([['camp-a', { campaignId: 'camp-a', acceptedToday: 5, acceptedThisHour: 0, recentRejectionRate: 0 }]]);
    const decision = routeLead(routingInput({ campaigns: [capped], usage }), ALL_FIELDS);
    expect(decision.outcome).toBe('no_route');
  });

  it('treats a down provider as ineligible', () => {
    const health = new Map([['mock', { providerId: 'mock', state: 'down' as const, consecutiveFailures: 3 }]]);
    expect(routeLead(routingInput({ health }), ALL_FIELDS).outcome).toBe('no_route');
  });

  it('rejects a lead below the campaign quality floor', () => {
    const decision = routeLead(routingInput({ campaigns: [campaign({ qualityFloor: 0.9 })], qualityScore: 0.5 }), ALL_FIELDS);
    expect(decision.outcome).toBe('no_route');
  });

  it('only offers a fallback at a different provider when the primary permits one', () => {
    const withFallback = routeLead(routingInput({
      campaigns: [
        campaign({ campaignId: 'a', allowsFallback: true, priority: 200 }),
        campaign({ campaignId: 'b', providerId: 'hslg' }),
      ],
      enabledProviderIds: new Set(['mock', 'hslg']),
    }), ALL_FIELDS);
    if (withFallback.outcome !== 'routed') throw new Error('expected a route');
    expect(withFallback.fallback?.campaignId).toBe('b');

    const sameProvider = routeLead(routingInput({
      campaigns: [
        campaign({ campaignId: 'a', allowsFallback: true, priority: 200 }),
        campaign({ campaignId: 'b' }),
      ],
    }), ALL_FIELDS);
    if (sameProvider.outcome !== 'routed') throw new Error('expected a route');
    expect(sameProvider.fallback).toBeUndefined();
  });

  it('answers coverage without needing the fields the form has not asked for yet', () => {
    const input = routingInput({ campaigns: [campaign({ requiredFields: ['phone', 'first_name'] })] });
    expect(hasCoverage(input)).toBe(true);
    expect(routeLead(input, new Set(['zip'])).outcome).toBe('no_route');
  });

  it('asks only for fields the calculator does not already know', () => {
    const needed = requiredFieldsFor([campaign({ requiredFields: ['phone', 'zip', 'timeframe'] })], new Set(['zip']));
    expect(needed).toEqual(['phone', 'timeframe']);
  });

  it('treats empty coverage as national and an exclusion as decisive', () => {
    expect(campaignCoversLocation(campaign(), { state: 'TX' })).toBe(true);
    expect(campaignCoversLocation(campaign({ excludedStates: ['TX'] }), { state: 'TX' })).toBe(false);
    expect(campaignCoversLocation(campaign({ stateCoverage: ['CA'], excludedStates: ['CA'] }), { state: 'CA' })).toBe(false);
  });

  it('scores an owner replacing something now above a renter who is planning', () => {
    const strong = scoreLeadQuality({ qualification: { homeowner: true, timeframe: 'immediately', workType: 'replacement' }, project: { size: 30 }, zip: '75201' });
    const weak = scoreLeadQuality({ qualification: { homeowner: false, timeframe: 'planning' }, project: {}, zip: undefined });
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeLessThanOrEqual(1);
    expect(weak).toBeGreaterThanOrEqual(0);
  });
});

describe('state machines', () => {
  it('refuses an impossible lead transition', () => {
    expect(() => assertLeadTransition('created', 'accepted')).toThrow();
    expect(() => assertLeadTransition('accepted', 'routing')).toThrow();
    expect(() => assertLeadTransition('created', 'validated')).not.toThrow();
  });

  it('refuses an impossible delivery transition and knows what is terminal', () => {
    expect(() => assertDeliveryTransition('accepted', 'processing')).toThrow();
    expect(isTerminalDeliveryStatus('accepted')).toBe(true);
    expect(isTerminalDeliveryStatus('retryable_failure')).toBe(false);
  });

  it('refuses an impossible revenue transition', () => {
    expect(() => assertRevenueTransition('paid', 'estimated')).toThrow();
    expect(() => assertRevenueTransition('reversed', 'paid')).toThrow();
    expect(() => assertRevenueTransition('confirmed', 'paid')).not.toThrow();
  });
});

describe('delivery', () => {
  const payload = {
    lead: { leadId: 'ld_1', vertical: 'roofing', pageId: 'job-hvac-replacement', locale: 'en-US', zip: '75201', project: {}, qualification: {} },
    contact: { leadId: 'ld_1', phone: '2145551234' },
    campaign: campaign(),
    locale: 'en-US' as const,
    idempotencyKey: 'key-1',
    consent: { consentId: 'cs_1', version: 'v1', textSha256: 'abc', acceptedAt: '2026-09-06T00:00:00Z', disclosedPartners: ['Partner A'] },
  } as never;

  it('refuses to re-attempt an accepted delivery', async () => {
    await expect(attemptDelivery({
      provider: new MockLeadProvider({}, { NODE_ENV: 'test' }),
      payload,
      delivery: { status: 'accepted', attemptCount: 1, maxAttempts: 5 },
    })).rejects.toThrow(/duplicate-billing guard/);
  });

  it('treats a timeout as retryable, never as a rejection', async () => {
    const outcome = await attemptDelivery({
      provider: new MockLeadProvider({ behaviour: 'timeout' }, { NODE_ENV: 'test' }),
      payload,
      delivery: { status: 'pending', attemptCount: 0, maxAttempts: 5 },
    });
    expect(outcome.status).toBe('retryable_failure');
    expect(outcome.nextAttemptAt).toBeDefined();
    expect(dispositionFor(outcome.status)).toBe('pending');
  });

  it('enforces its own timeout when the adapter hangs', async () => {
    const hanging = {
      describe: () => new MockLeadProvider({}, { NODE_ENV: 'test' }).describe(),
      submitLead: () => new Promise<never>(() => {}),
    };
    const outcome = await attemptDelivery({
      provider: hanging as never,
      payload,
      delivery: { status: 'pending', attemptCount: 0, maxAttempts: 5 },
      timeoutMs: 20,
    });
    expect(outcome.status).toBe('retryable_failure');
    expect(outcome.failureReason).toMatch(/did not respond/);
  });

  it('gives up after the attempt budget rather than retrying forever', async () => {
    const outcome = await attemptDelivery({
      provider: new MockLeadProvider({ behaviour: 'server_error' }, { NODE_ENV: 'test' }),
      payload,
      delivery: { status: 'retryable_failure', attemptCount: 4, maxAttempts: 5 },
    });
    expect(outcome.status).toBe('permanent_failure');
    expect(outcome.nextAttemptAt).toBeUndefined();
  });

  it('returns the same acceptance for a repeated idempotency key', async () => {
    const provider = new MockLeadProvider({}, { NODE_ENV: 'test' });
    const first = await provider.submitLead(payload);
    const second = await provider.submitLead(payload);
    expect(first.outcome).toBe('accepted');
    expect(second.outcome).toBe('accepted');
    if (second.outcome !== 'accepted') return;
    expect(second.rawStatus).toBe('duplicate_of_prior_submission');
    expect(second.payoutMinor).toBe(0);
    expect(provider.submissions).toHaveLength(1);
  });

  it('backs off with jitter and a ceiling', () => {
    expect(nextAttemptDelayMs(1, () => 0.5)).toBe(30_000);
    expect(nextAttemptDelayMs(20, () => 0.5)).toBe(15 * 60_000);
    expect(nextAttemptDelayMs(1, () => 0)).toBeLessThan(nextAttemptDelayMs(1, () => 1));
  });

  it('never falls back after a rejection, only after a hard failure', () => {
    expect(mayAttemptFallback({ primaryStatus: 'rejected', primaryAllowsFallback: true, consentNamedFallbackPartner: true })).toBe(false);
    expect(mayAttemptFallback({ primaryStatus: 'permanent_failure', primaryAllowsFallback: true, consentNamedFallbackPartner: true })).toBe(true);
    expect(mayAttemptFallback({ primaryStatus: 'permanent_failure', primaryAllowsFallback: true, consentNamedFallbackPartner: false })).toBe(false);
  });
});

describe('provider adapters', () => {
  it('reports the three networks as configuration-required with a named dependency', () => {
    for (const provider of [new AngiLeadProvider(), new LeadBankProvider(), new HomeServicesLeadGroupProvider()]) {
      const descriptor = provider.describe();
      expect(descriptor.status).toBe('configuration_required');
      expect(descriptor.outstandingDependency).toBeTruthy();
      expect(descriptor.requiredEnv.length).toBeGreaterThan(0);
    }
  });

  it('refuses to submit while unconfigured, permanently rather than retryably', async () => {
    const result = await new AngiLeadProvider().submitLead();
    expect(result.outcome).toBe('permanent_failure');
  });

  it('refuses a lead destination that is not on the compiled allowlist', () => {
    expect(() => assertAllowedEndpoint('https://attacker.example.com/collect')).toThrow(/allowlist/);
  });

  it('refuses to post through an unregistered generic endpoint', async () => {
    const result = await new GenericServerPostProvider('nope').submitLead({} as never);
    expect(result.outcome).toBe('permanent_failure');
  });

  it('cannot be constructed as a mock in production', () => {
    expect(() => new MockLeadProvider({}, { NODE_ENV: 'production' })).toThrow(/production/);
    expect(() => new MockLeadProvider({}, { NODE_ENV: 'production', MONETIZATION_ALLOW_MOCKS: 'true' })).not.toThrow();
  });
});

describe('duplicate and idempotency protection', () => {
  it('suppresses the same person in the same vertical inside the window', async () => {
    const hashes = await hashContact({ phone: '214-555-1234' }, PEPPER);
    const verdict = await checkDuplicate({
      hashes, vertical: 'roofing', now: Date.now(), leadId: 'ld_current',
      lookup: async () => ({ leadId: 'ld_prior', createdAt: '2026-09-05T00:00:00Z' }),
    });
    expect(verdict.state).toBe('suppressed');
  });

  it('lets the same person start a different project', async () => {
    const hashes = await hashContact({ phone: '214-555-1234' }, PEPPER);
    const verdict = await checkDuplicate({
      hashes, vertical: 'plumbing', now: Date.now(), leadId: 'ld_current', lookup: async () => null,
    });
    expect(verdict.state).toBe('none');
  });

  it('can be configured to flag rather than suppress', async () => {
    const hashes = await hashContact({ email: 'a@b.com' }, PEPPER);
    const verdict = await checkDuplicate({
      hashes, vertical: 'roofing', now: Date.now(), leadId: 'ld_current',
      policy: { windowHours: 72, action: 'allow_flagged' },
      lookup: async () => ({ leadId: 'ld_prior', createdAt: '2026-09-05T00:00:00Z' }),
    });
    expect(verdict.state).toBe('allowed');
  });

  it('never treats a lead as a duplicate of itself', async () => {
    // The contact row carrying the hashes is written before this check runs, so
    // without an explicit exclusion every lead matches itself and is suppressed.
    const hashes = await hashContact({ phone: '214-555-1234' }, PEPPER);
    const verdict = await checkDuplicate({
      hashes, vertical: 'roofing', now: Date.now(), leadId: 'ld_self',
      lookup: async () => ({ leadId: 'ld_self', createdAt: '2026-09-06T00:00:00Z' }),
    });
    expect(verdict.state).toBe('none');
  });

  it('derives a stable provider key so a retry is not a second lead', async () => {
    const first = await providerIdempotencyKey({ leadId: 'ld_1', campaignId: 'camp-a' }, PEPPER);
    const second = await providerIdempotencyKey({ leadId: 'ld_1', campaignId: 'camp-a' }, PEPPER);
    const other = await providerIdempotencyKey({ leadId: 'ld_2', campaignId: 'camp-a' }, PEPPER);
    expect(first).toBe(second);
    expect(first).not.toBe(other);
  });

  it('replays the first result instead of running the operation twice', async () => {
    const database = new FakeD1();
    const store = d1IdempotencyStore(database);
    let calls = 0;
    const operation = async () => { calls += 1; return { id: `ld_${calls}` }; };
    const load = async (id: string) => ({ id });

    const first = await once({ store, scope: 'lead', key: 'client-key-0123456789', operation, load });
    const second = await once({ store, scope: 'lead', key: 'client-key-0123456789', operation, load });
    expect(calls).toBe(1);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.result.id).toBe('ld_1');
  });
});

describe('submission validation', () => {
  const valid = {
    vertical: 'roofing', pageId: 'job-hvac-replacement', locale: 'en-US' as const,
    zip: '75201', project: {}, qualification: {},
    contact: { phone: '2145551234' },
    consent: { version: '2026-09-06.1', accepted: true as const, partnerName: 'Partner A' },
  };

  it('accepts a well-formed submission', () => {
    expect(leadSubmissionSchema.safeParse(valid).success).toBe(true);
  });

  it('requires a way to reach the person', () => {
    const result = leadSubmissionSchema.safeParse({ ...valid, contact: {} });
    expect(result.success).toBe(false);
  });

  it('requires consent to be explicitly true', () => {
    const result = leadSubmissionSchema.safeParse({ ...valid, consent: { ...valid.consent, accepted: false } });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown field rather than forwarding it', () => {
    const result = leadSubmissionSchema.safeParse({ ...valid, ssn: '123-45-6789' });
    expect(result.success).toBe(false);
  });

  it('catches the honeypot and an impossibly fast form without telling the sender', () => {
    expect(silentRejectionFor({ ...valid, website: 'http://spam' } as never)).toBe('honeypot');
    expect(silentRejectionFor({ ...valid, elapsedMs: 200 } as never)).toBe('too_fast');
    expect(silentRejectionFor({ ...valid, elapsedMs: 9_000 } as never)).toBeNull();
  });
});

describe('revenue ledger', () => {
  const entry = (overrides: Partial<Parameters<typeof totalRevenue>[0][number]> = {}) => ({
    entryId: 'rv_1', sourceType: 'lead' as const, providerId: 'mock',
    amount: money(6_500), status: 'estimated' as const, isTest: false,
    occurredAt: '2026-09-06T00:00:00Z', ...overrides,
  });

  it('never counts estimated money as revenue', () => {
    const totals = totalRevenue([entry(), entry({ entryId: 'rv_2', status: 'confirmed' })]);
    expect(totals.estimated.minorUnits).toBe(6_500);
    expect(totals.realized.minorUnits).toBe(6_500);
  });

  it('subtracts reversals from realized revenue', () => {
    const totals = totalRevenue([
      entry({ entryId: 'rv_1', status: 'paid' }),
      entry({ entryId: 'rv_2', status: 'reversed', amount: money(-6_500) }),
    ]);
    expect(totals.paid.minorUnits).toBe(6_500);
    expect(totals.realized.minorUnits).toBe(0);
  });

  it('excludes test rows from every production figure', () => {
    const totals = totalRevenue([entry({ status: 'paid', isTest: true })]);
    expect(totals.paid.minorUnits).toBe(0);
    expect(totals.realized.minorUnits).toBe(0);
  });

  it('records a reversal as a new row rather than editing the original', () => {
    const original = entry({ status: 'paid' });
    const reversal = reversalOf(original, 'rv_9', '2026-09-20T00:00:00Z');
    expect(reversal.entryId).toBe('rv_9');
    expect(reversal.amount.minorUnits).toBe(-6_500);
    expect(original.status).toBe('paid');
  });
});

describe('analytics boundary', () => {
  it('accepts a well-formed monetization event', () => {
    const event = parseMonetizationEvent('lead_cta_click', {
      pageId: 'job-hvac-replacement', calculatorId: undefined, locale: 'en-US',
      vertical: 'home_services', leadId: 'ld_1', state: 'TX',
    });
    expect(event).not.toBeNull();
  });

  it('rejects every field that could identify a person', () => {
    for (const field of ['phone', 'email', 'firstName', 'lastName', 'address', 'zip', 'ip', 'amount']) {
      const event = parseMonetizationEvent('lead_cta_click', {
        pageId: 'p', locale: 'en-US', vertical: 'home_services', [field]: 'x',
      });
      expect(event, `${field} must not be accepted`).toBeNull();
    }
  });

  it('rejects an unknown field rather than forwarding it', () => {
    expect(parseMonetizationEvent('lead_submit', {
      pageId: 'p', locale: 'en-US', vertical: 'home_services', surprise: 1,
    })).toBeNull();
  });

  it('rejects a missing required field so a funnel cannot lose its denominator', () => {
    expect(parseMonetizationEvent('lead_submit', { locale: 'en-US', vertical: 'home_services' })).toBeNull();
  });

  it('keeps location at state granularity', () => {
    expect(parseMonetizationEvent('lead_cta_click', {
      pageId: 'p', locale: 'en-US', vertical: 'home_services', state: '75201',
    })).toBeNull();
    expect(FORBIDDEN_ANALYTICS_FIELDS).toContain('zip');
  });
});

describe('affiliate relevance and commerce', () => {
  const diyContext = createMonetizationContext({
    pageId: 'concrete', locale: 'en-US', vertical: 'diy', riskClass: 'low',
    leadEligible: false, affiliateEligible: true, adsEligible: true, intent: 'diy',
  });

  it('derives categories from the page, not from a merchant', () => {
    const categories = relevantCategories(diyContext);
    expect(categories.map((entry) => entry.categoryId)).toContain('concrete_tools');
  });

  it('shows nothing to someone who just said they will hire a professional', () => {
    const hiring = createMonetizationContext({
      pageId: 'concrete', locale: 'en-US', vertical: 'diy', riskClass: 'low',
      leadEligible: false, affiliateEligible: true, adsEligible: true, intent: 'hire_professional',
    });
    expect(relevantCategories(hiring)).toHaveLength(0);
  });

  it('narrows to the primary category for a reader who is only researching', () => {
    const researching = createMonetizationContext({
      pageId: 'concrete', locale: 'en-US', vertical: 'diy', riskClass: 'low',
      leadEligible: false, affiliateEligible: true, adsEligible: true, intent: 'researching',
    });
    expect(relevantCategories(researching)).toHaveLength(1);
  });

  it('forbids product recommendations on health and insurance pages', () => {
    for (const vertical of ['health', 'insurance'] as const) {
      const context = createMonetizationContext({
        pageId: 'x', locale: 'en-US', vertical, riskClass: 'high',
        leadEligible: false, affiliateEligible: true, adsEligible: true,
      });
      expect(affiliateForbidden(context)).toBe(true);
    }
  });

  it('cannot introduce a product the reader had no reason to see', () => {
    const selection = selectOffers({
      categories: [{ categoryId: 'concrete_tools', relevance: 0.9, reason: 'primary' }],
      offers: [{
        offerId: 'paint-1', merchantId: 'amazon', category: 'paint_supplies', locale: 'en-US',
        headline: 'Paint', body: '', cta: 'Shop', destinationUrl: 'https://example.com',
        enabled: true, commercialWeight: 999,
      }],
      locale: 'en-US',
    });
    expect(selection.offers).toHaveLength(0);
  });

  it('sorts by relevance first and uses commercial weight only to break a tie', () => {
    const offers = [
      { offerId: 'a', merchantId: 'direct-test', category: 'concrete_tools' as const, locale: 'en-US' as const, headline: '', body: '', cta: '', destinationUrl: 'https://example.com', enabled: true, commercialWeight: 1 },
      { offerId: 'b', merchantId: 'direct-test', category: 'concrete_tools' as const, locale: 'en-US' as const, headline: '', body: '', cta: '', destinationUrl: 'https://example.com', enabled: true, commercialWeight: 99 },
    ];
    const selection = selectOffers({
      categories: [{ categoryId: 'concrete_tools', relevance: 0.9, reason: 'primary' }],
      offers,
      locale: 'en-US',
    });
    // The test merchant is not in the catalog, so nothing is linkable. That is
    // the point: an unapproved merchant renders no monetized link at all.
    expect(selection.offers).toHaveLength(0);
  });

  it('renders no monetized link from an unapproved programme', () => {
    for (const merchant of AFFILIATE_MERCHANTS) {
      expect(merchant.status).toBe('configuration_required');
      expect(isMerchantLinkable(merchant, { AFFILIATE_AMAZON_TRACKING_ID: 'x' })).toBe(false);
    }
  });

  it('will not build an Amazon link without a tracking id', () => {
    const amazon = AFFILIATE_MERCHANTS.find((entry) => entry.merchantId === 'amazon')!;
    const offer = { offerId: 'o', merchantId: 'amazon', category: 'concrete_tools' as const, locale: 'en-US' as const, headline: '', body: '', cta: '', destinationUrl: 'https://www.amazon.com/dp/TEST', enabled: true, commercialWeight: 0 };
    expect(buildAffiliateLink(offer, amazon, {})).toBeNull();
    const link = buildAffiliateLink(offer, amazon, { AFFILIATE_AMAZON_TRACKING_ID: 'costanswer-20' });
    expect(link?.href).toContain('tag=costanswer-20');
    expect(link?.rel).toBe(AFFILIATE_REL);
  });

  it('refuses a non-https destination', () => {
    const amazon = AFFILIATE_MERCHANTS[0];
    const offer = { offerId: 'o', merchantId: 'amazon', category: 'concrete_tools' as const, locale: 'en-US' as const, headline: '', body: '', cta: '', destinationUrl: 'http://insecure.example.com', enabled: true, commercialWeight: 0 };
    expect(buildAffiliateLink(offer, amazon, { AFFILIATE_AMAZON_TRACKING_ID: 'x' })).toBeNull();
  });

  it('never stores an Amazon price', () => {
    const amazon = AFFILIATE_MERCHANTS.find((entry) => entry.merchantId === 'amazon')!;
    expect(amazon.mayDisplayStoredPrice).toBe(false);
    expect(priceDisplayMode(amazon)).toBe('check-on-site');
  });

  it('marks commercial links sponsored and nofollow', () => {
    expect(AFFILIATE_REL).toContain('sponsored');
    expect(AFFILIATE_REL).toContain('nofollow');
    expect(AFFILIATE_REL).toContain('noopener');
  });

  it('keeps the Amazon identification statement verbatim in both locales', () => {
    const disclosure = getDisclosure('amazon-associate');
    expect(disclosure.verbatimRequired).toBe(true);
    expect(disclosureText('amazon-associate', 'en-US')).toBe(AMAZON_REQUIRED_STATEMENT);
    expect(disclosureText('amazon-associate', 'es-US')).toBe(AMAZON_REQUIRED_STATEMENT);
  });

  it('has a Spanish disclosure that is actually Spanish', () => {
    expect(disclosureText('generic-affiliate', 'es-US')).not.toBe(disclosureText('generic-affiliate', 'en-US'));
    expect(disclosureText('lead-referral', 'es-US')).toContain('CostAnswer');
  });
});

describe('advertising', () => {
  it('activates no provider without configuration', () => {
    expect(activeAdProvider({})).toBeNull();
    expect(activeAdProvider({ AD_PROVIDER: 'adsense' })).toBeNull();
    expect(activeAdProvider({ AD_PROVIDER: 'adsense', ADSENSE_CLIENT_ID: 'ca-pub-x' })?.networkId).toBe('adsense');
  });

  it('refuses an unknown ad provider rather than silently loading nothing', () => {
    expect(() => activeAdProvider({ AD_PROVIDER: 'not-a-network' })).toThrow(/AD_PROVIDER/);
  });

  it('rejects any layout with an ad between the input and the answer', () => {
    expect(() => assertPlacementOrder([...TOOL_PAGE_ORDER])).not.toThrow();
    expect(() => assertPlacementOrder(['calculator-input', 'in-content', 'answer'])).toThrow(/between the calculator input and the answer/);
    expect(() => assertPlacementOrder(['calculator-input', 'desktop-rail', 'answer'])).toThrow();
  });
});

describe('pay per call', () => {
  const base = {
    callCampaignId: 'call-1', providerId: 'hslg', vertical: 'roofing' as const,
    trackedNumberE164: '+18005551234', displayNumber: '(800) 555-1234',
    active: true, validFrom: '2026-01-01', stateCoverage: ['TX'],
    timezone: 'America/Chicago', openHour: 8, closeHour: 18,
    disclosedPartnerName: 'Partner A',
  };

  it('will not show an expired or inactive number', () => {
    expect(isCallCampaignLive(base, '2026-09-06')).toBe(true);
    expect(isCallCampaignLive({ ...base, active: false }, '2026-09-06')).toBe(false);
    expect(isCallCampaignLive({ ...base, validUntil: '2026-08-01' }, '2026-09-06')).toBe(false);
  });

  it('will not show a malformed number', () => {
    expect(isCallCampaignLive({ ...base, trackedNumberE164: '8005551234' }, '2026-09-06')).toBe(false);
  });

  it('does not send a motivated caller to voicemail', () => {
    const middleOfNight = new Date('2026-09-06T07:00:00Z'); // 2am Chicago
    const midday = new Date('2026-09-06T17:00:00Z'); // noon Chicago
    expect(isWithinCallHours(base, middleOfNight)).toBe(false);
    expect(isWithinCallHours(base, midday)).toBe(true);
  });

  it('offers nothing when no campaign is configured', () => {
    expect(liveCallCampaign({ vertical: 'roofing', state: 'TX', asOf: '2026-09-06', at: new Date() })).toBeNull();
  });
});

describe('storage, fail closed', () => {
  it('reports unavailable rather than throwing when the binding is absent', () => {
    setMonetizationDatabase(undefined);
    const status = monetizationStore({});
    expect(status.available).toBe(false);
  });

  it('records and re-reads a lead without ever joining the contact in', async () => {
    const database = new FakeD1();
    await saveLeadRequest(database, {
      leadId: 'ld_1', vertical: 'roofing', pageId: 'job-hvac-replacement', locale: 'en-US',
      zip: '75201', project: {}, qualification: {}, attribution: {}, purgeAfter: '2030-01-01T00:00:00Z',
    });
    await saveLeadContact(database, { leadId: 'ld_1', phone: '2145551234', phoneHash: 'h' }, '2027-01-01T00:00:00Z');

    const leadRow = database.select('lead_requests')[0];
    expect(Object.keys(leadRow)).not.toContain('phone');
    expect(await loadLeadContactForDelivery(database, 'ld_1')).toMatchObject({ phone: '2145551234' });
  });

  it('erases the person on a deletion request and keeps the business record', async () => {
    const database = new FakeD1();
    await saveLeadRequest(database, {
      leadId: 'ld_1', vertical: 'roofing', pageId: 'p', locale: 'en-US',
      zip: '75201', project: {}, qualification: {}, attribution: {}, purgeAfter: '2030-01-01T00:00:00Z',
    });
    await saveLeadContact(database, { leadId: 'ld_1', phone: '2145551234' }, '2027-01-01T00:00:00Z');
    await purgeLeadContact(database, 'ld_1');

    expect(await loadLeadContactForDelivery(database, 'ld_1')).toBeNull();
    expect(database.select('lead_requests')).toHaveLength(1);
  });

  it('refuses to deliver to a partner the consent did not name', async () => {
    const database = new FakeD1();
    await recordConsent(database, {
      leadId: 'ld_1', consentVersion: 'v1', consentTextId: 't', consentTextSha256: 'abc',
      locale: 'en-US', pagePath: '/', serviceRequested: 'roofing',
      disclosedPartners: ['Partner A'], communicationScope: ['contact_about_this_request'],
      privacyPolicyVersion: '1', termsVersion: '1', acceptedAt: '2026-09-06T00:00:00Z',
    });
    await expect(assertDeliveryConsent(database, 'ld_1', 'Partner B')).rejects.toThrow(/was not named in the consent/);
    await expect(assertDeliveryConsent(database, 'ld_1', 'Partner A')).resolves.toBeTruthy();
  });

  it('refuses to deliver a lead with no consent at all', async () => {
    const database = new FakeD1();
    await expect(assertDeliveryConsent(database, 'ld_missing', 'Partner A')).rejects.toThrow(/no consent record/);
  });

  it('treats a replayed webhook as a no-op instead of a second payment', async () => {
    const database = new FakeD1();
    const event = {
      providerId: 'mock', providerEventId: 'evt-1', normalizedEvent: 'lead_billable' as const,
      signatureVerified: true, payloadDigest: 'abc',
    };
    expect(await recordProviderEvent(database, event)).toBe(true);
    expect(await recordProviderEvent(database, event)).toBe(false);
    expect(database.select('lead_provider_events')).toHaveLength(1);
  });

  it('refuses a second delivery with the same provider idempotency key', async () => {
    const database = new FakeD1();
    await createDelivery(database, { leadId: 'ld_1', campaignId: 'c', providerId: 'mock', idempotencyKey: 'k1' });
    await expect(createDelivery(database, { leadId: 'ld_1', campaignId: 'c', providerId: 'mock', idempotencyKey: 'k1' }))
      .rejects.toThrow(/UNIQUE/);
  });

  it('walks a delivery through its states and refuses to reopen a settled one', async () => {
    const database = new FakeD1();
    const delivery = await createDelivery(database, { leadId: 'ld_1', campaignId: 'c', providerId: 'mock', idempotencyKey: 'k2' });
    await markDeliveryProcessing(database, delivery.deliveryId);
    await settleDelivery(database, delivery.deliveryId, { status: 'accepted', latencyMs: 12 });
    await expect(markDeliveryProcessing(database, delivery.deliveryId)).rejects.toThrow();
  });

  it('honours a suppression request by hash', async () => {
    const database = new FakeD1();
    const hashes = await hashContact({ phone: '2145551234' }, PEPPER);
    expect(await isSuppressed(database, hashes)).toBe(false);
    await addSuppression(database, { ...hashes, scope: 'all_internal', reason: 'asked us to stop' });
    expect(await isSuppressed(database, hashes)).toBe(true);
  });

  it('lets an operator kill a channel and never switch one on', async () => {
    const database = new FakeD1();
    await setKillSwitch(database, 'leads.enabled', true, 'admin@example.com', 'provider misbehaving');
    const overrides = await loadFlagOverrides(database);
    expect(overrides['leads.enabled']).toBe(false);
    expect(Object.values(overrides).every((value) => value === false)).toBe(true);
  });

  it('redacts secrets from the configuration audit trail', async () => {
    const database = new FakeD1();
    await recordConfigChange(database, {
      actor: 'admin', entityType: 'provider', entityId: 'angi',
      field: 'api_key', oldValue: 'old-secret', newValue: 'new-secret',
    });
    const changes = await recentConfigChanges(database);
    expect(changes[0].newValue).toBe('[redacted]');
    expect(JSON.stringify(changes)).not.toContain('new-secret');
  });

  it('counts events without keeping a row per person', async () => {
    const database = new FakeD1();
    await incrementEventCounter(database, { eventName: 'lead_cta_impression', pageId: 'p', vertical: 'home_services' });
    await incrementEventCounter(database, { eventName: 'lead_cta_impression', pageId: 'p', vertical: 'home_services' });
    expect(database.select('monetization_events')).toHaveLength(1);
    expect(database.select('monetization_events')[0].count).toBe(2);
  });

  it('will not import the same provider payout twice', async () => {
    const database = new FakeD1();
    const entry = {
      sourceType: 'lead' as const, providerId: 'mock', providerReference: 'stmt-1',
      amount: money(6_500), status: 'confirmed' as const, isTest: false,
      occurredAt: '2026-09-06T00:00:00Z',
    };
    expect(await recordRevenue(database, entry)).not.toBeNull();
    expect(await recordRevenue(database, entry)).toBeNull();
    expect(database.select('revenue_ledger')).toHaveLength(1);
  });
});

describe('regressions found in review', () => {
  it('nets a confirmed payment and its reversal to zero', () => {
    /*
     * The ledger carried two incompatible reversal models: an in-place status
     * flip and a separate signed row. The aggregate subtracted the magnitude of
     * anything marked reversed, so a single confirmed-then-flipped entry summed
     * to minus the amount instead of zero — it subtracted a reversal it had
     * never added. Reversal is now always a signed row and never a transition.
     */
    const base = {
      entryId: 'rv_1', sourceType: 'lead' as const, providerId: 'p',
      amount: money(6_500), status: 'confirmed' as const, isTest: false,
      occurredAt: '2026-09-06T00:00:00Z',
    };
    const reversal = reversalOf(base, 'rv_2', '2026-09-20T00:00:00Z');
    const totals = totalRevenue([base, reversal]);

    expect(totals.confirmed.minorUnits).toBe(6_500);
    // Shown as a magnitude; "Reversed: -$65" reads as a double negative.
    expect(totals.reversed.minorUnits).toBe(6_500);
    expect(totals.realized.minorUnits).toBe(0);
  });

  it('refuses to treat reversal as a status transition', () => {
    expect(() => assertRevenueTransition('confirmed', 'reversed' as never)).toThrow();
    expect(() => assertRevenueTransition('paid', 'reversed' as never)).toThrow();
    expect(() => assertRevenueTransition('confirmed', 'paid')).not.toThrow();
  });

  it('will not reverse something already reversed', () => {
    const reversed = {
      entryId: 'rv_1', sourceType: 'lead' as const, providerId: 'p',
      amount: money(-6_500), status: 'reversed' as const, isTest: false,
      occurredAt: '2026-09-06T00:00:00Z',
    };
    expect(() => reversalOf(reversed, 'rv_2', '2026-09-20T00:00:00Z')).toThrow(/cannot be reversed/);
  });

  it('an empty ad slot is a silent spacer, not a named landmark', () => {
    // Three regions per page called "Reserved leaderboard advertising space" is
    // three pieces of furniture a screen-reader user walks past to reach a
    // calculator that has no advertising in it.
    const empty = AdSlot({ placement: 'in-content' }) as { props: Record<string, unknown> };
    expect(empty.props.role).toBe('presentation');
    expect(empty.props['aria-label']).toBeUndefined();
    expect(empty.props['data-ad-status']).toBe('empty');
  });

  it('resolves a state from a ZIP so state-scoped campaigns are reachable', () => {
    expect(stateForZip('75201')).toBe('TX');
    expect(stateForZip('10001')).toBe('NY');
    expect(stateForZip('00000')).toBeUndefined();
    expect(stateForZip('not-a-zip')).toBeUndefined();
  });
});

describe('content security policy follows the ad configuration', () => {
  it('adds nothing when no network is configured', () => {
    const sources = adCspSources({});
    expect(sources.script).toEqual([]);
    expect(sources.frame).toEqual([]);
  });

  it('opens exactly the configured network origins and no wildcard', () => {
    const sources = adCspSources({ AD_PROVIDER: 'adsense', ADSENSE_CLIENT_ID: 'ca-pub-x' });
    expect(sources.script.length).toBeGreaterThan(0);
    for (const list of Object.values(sources)) {
      for (const origin of list) {
        expect(origin.startsWith('https://')).toBe(true);
        expect(origin).not.toContain('*');
      }
    }
  });

  it('adds nothing for a network whose credentials are missing', () => {
    // A half-configured network must not widen the policy: the script would be
    // allowed and would still have nothing to load.
    expect(adCspSources({ AD_PROVIDER: 'adsense' }).script).toEqual([]);
  });
});

describe('the honeypot stays silent', () => {
  const valid = {
    vertical: 'roofing', pageId: 'job-hvac-replacement', locale: 'en-US' as const,
    zip: '75201', project: {}, qualification: {},
    contact: { phone: '2145551234' },
    consent: { version: '2026-09-06.1', accepted: true as const, partnerName: 'Partner A' },
  };

  it('accepts a filled honeypot at the schema and judges it later', () => {
    /*
     * Rejecting it in the schema returned a validation error naming the field,
     * which tells a bot exactly which input to stop filling. The whole value of
     * a honeypot is that tripping it looks like success.
     */
    const parsed = leadSubmissionSchema.safeParse({ ...valid, website: 'http://spam.example' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(silentRejectionFor(parsed.data)).toBe('honeypot');
  });
});
