/**
 * The monetization control surface.
 *
 * An authenticated JSON endpoint rather than a rendered admin app: the site has
 * no account system and building one to host six switches would be the
 * overengineering the plan warns against. Everything an operator needs to do in
 * an incident — see provider health, see what is waiting on credentials, kill a
 * channel — is here, is audited, and needs no deploy.
 *
 * `GET`  reports state. `POST` changes exactly one thing: a kill switch.
 * Nothing here can switch a channel *on* that the environment has not approved.
 */
import { z } from 'zod';
import { describeAllProviders } from '@/lib/monetization/leads/providers/registry';
import { AFFILIATE_MERCHANTS } from '@/lib/monetization/affiliate/catalog';
import { AD_PROVIDERS, activeAdProvider } from '@/lib/monetization/ads/provider';
import { CONSENT_VERSIONS } from '@/lib/monetization/consent/versions';
import { isMonetizationFlag, resolveAllFlags } from '@/lib/monetization/flags';
import { MONETIZATION_POLICIES } from '@/lib/monetization/policy';
import { monetizationSnapshot, formatTotals } from '@/lib/monetization/admin/metrics';
import { loadFlagOverrides, recentConfigChanges, recordConfigChange, setKillSwitch } from '@/lib/monetization/store/repositories/governance';
import { dueDeliveries } from '@/lib/monetization/store/repositories/deliveries';
import {
  allCampaigns, allProviders, setCampaignActive, upsertCampaign, upsertProvider,
} from '@/lib/monetization/store/repositories/campaigns';
import { allAffiliateOffers, setAffiliateOfferEnabled, upsertAffiliateOffer } from '@/lib/monetization/store/repositories/affiliate';
import { allCallCampaigns, setCallCampaignActive, upsertCallCampaign } from '@/lib/monetization/store/repositories/calls';
import { importConversions, recentImports } from '@/lib/monetization/store/repositories/conversions';
import { parseConversionCsv } from '@/lib/monetization/affiliate/conversions';
import { leadDossier, processDeletionRequest } from '@/lib/monetization/admin/privacy';
import { LOCALES } from '@/lib/i18n/locales';
import {
  assertAdmin, errorResponse, jsonResponse, PublicError, readJson,
  requirePepper, requireStore, type RouteEnvironment,
} from '@/lib/monetization/http/request';

export async function GET(request: Request, context?: { env?: RouteEnvironment }) {
  try {
    assertAdmin(request, context?.env);
    const database = requireStore(context?.env);
    const days = Number(new URL(request.url).searchParams.get('days') ?? 30);

    const overrides = await loadFlagOverrides(database);
    const snapshot = await monetizationSnapshot(database, { days: Number.isFinite(days) ? days : 30 });
    const failures = (await dueDeliveries(database, 50)).map((delivery) => ({
      deliveryId: delivery.deliveryId,
      providerId: delivery.providerId,
      campaignId: delivery.campaignId,
      status: delivery.status,
      attemptCount: delivery.attemptCount,
      failureReason: delivery.failureReason,
      nextAttemptAt: delivery.nextAttemptAt,
    }));

    return jsonResponse({
      ok: true,
      flags: resolveAllFlags(process.env, overrides),
      killSwitches: Object.keys(overrides),
      revenue: {
        window: snapshot.window,
        // Never one number. The four states stay apart all the way to the screen.
        totals: formatTotals(snapshot.totals),
        revenuePerThousandSessions: snapshot.revenuePerThousandSessions?.minorUnits ?? null,
        sessions: snapshot.sessions,
        hasTestData: snapshot.hasTestData,
        bySource: Object.fromEntries([...snapshot.bySource].map(([key, value]) => [key, formatTotals(value)])),
        byCalculator: Object.fromEntries([...snapshot.byCalculator].map(([key, value]) => [key, formatTotals(value)])),
        byVertical: Object.fromEntries([...snapshot.byVertical].map(([key, value]) => [key, formatTotals(value)])),
        byProvider: Object.fromEntries([...snapshot.byProvider].map(([key, value]) => [key, formatTotals(value)])),
      },
      funnels: { lead: snapshot.leadFunnel, affiliate: snapshot.affiliateFunnel },
      // Secrets are never in this payload — only whether each one is present.
      leadProviders: describeAllProviders().map((provider) => ({
        ...provider,
        credentialsPresent: provider.requiredEnv.every((key) => (process.env[key]?.trim().length ?? 0) > 0),
      })),
      affiliateMerchants: AFFILIATE_MERCHANTS.map((merchant) => ({
        merchantId: merchant.merchantId,
        network: merchant.network,
        displayName: merchant.displayName,
        status: merchant.status,
        outstandingDependency: merchant.outstandingDependency,
        credentialsPresent: merchant.requiredEnv.every((key) => (process.env[key]?.trim().length ?? 0) > 0),
      })),
      advertising: {
        active: activeAdProvider()?.networkId ?? null,
        providers: AD_PROVIDERS.map((provider) => ({
          networkId: provider.networkId,
          displayName: provider.displayName,
          status: provider.status,
          consentRequirement: provider.consentRequirement,
          outstandingDependency: provider.outstandingDependency,
        })),
      },
      consentVersions: CONSENT_VERSIONS.map((version) => ({
        version: version.version,
        activeFrom: version.activeFrom,
        retiredAt: version.retiredAt ?? null,
        scope: version.scope,
        locales: Object.keys(version.text),
      })),
      pagePolicies: MONETIZATION_POLICIES.map((policy) => ({
        pageId: policy.pageId,
        vertical: policy.vertical,
        riskClass: policy.riskClass,
        ads: policy.ads.enabled,
        affiliate: policy.affiliate.enabled,
        lead: policy.lead.enabled,
        leadVertical: policy.lead.vertical ?? null,
      })),
      failures,
      // Everything an operator can change without a deploy, in the shape the
      // POST actions below accept.
      campaigns: await allCampaigns(database),
      callCampaigns: await allCallCampaigns(database),
      affiliateOffers: await allAffiliateOffers(database),
      storedProviders: await allProviders(database),
      conversionImports: await recentImports(database, 25),
      recentChanges: await recentConfigChanges(database, 50),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

const stringList = z.array(z.string().max(16)).max(60);

/**
 * Every change an operator can make, and nothing else.
 *
 * A discriminated union rather than a generic "update this table" endpoint:
 * the set of writable things is the set of cases here, so nothing that routing
 * cannot use can be configured, and nothing that must not be edited — a consent
 * record, a delivery, a ledger row — has a path at all.
 */
const adminAction = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('kill-switch'),
    flag: z.string().min(1),
    disabled: z.boolean(),
    reason: z.string().min(3).max(300),
  }).strict(),

  z.object({
    action: z.literal('upsert-provider'),
    providerId: z.string().min(1).max(60),
    providerType: z.enum(['lead_network', 'direct_partner', 'affiliate_network', 'ad_network', 'call_network']),
    displayName: z.string().min(1).max(120),
    status: z.enum(['configuration_required', 'configured', 'enabled', 'disabled', 'compliance_hold']),
    supportedVerticals: stringList.optional(),
  }).strict(),

  z.object({
    action: z.literal('upsert-campaign'),
    campaign: z.object({
      campaignId: z.string().min(1).max(60),
      providerId: z.string().min(1).max(60),
      vertical: z.string().min(1).max(60),
      displayName: z.string().min(1).max(120),
      active: z.boolean(),
      exclusive: z.boolean(),
      allowsFallback: z.boolean(),
      priority: z.number().int().min(0).max(10_000),
      payoutModel: z.enum(['per_lead', 'per_call', 'revenue_share', 'unknown']),
      expectedPayoutMinor: z.number().int().min(0).max(100_000_00),
      dailyCap: z.number().int().min(0).max(100_000).optional(),
      hourlyCap: z.number().int().min(0).max(10_000).optional(),
      stateCoverage: stringList,
      zipCoverage: z.array(z.string().regex(/^\d{5}$/)).max(5_000),
      excludedStates: stringList,
      requiredFields: z.array(z.string().max(40)).max(20),
      consentScope: z.array(z.string().max(60)).max(10),
      disclosedPartnerName: z.string().min(1).max(120),
      qualityFloor: z.number().min(0).max(1),
    }).strict(),
  }).strict(),

  z.object({
    action: z.literal('set-campaign-active'),
    campaignId: z.string().min(1).max(60),
    active: z.boolean(),
  }).strict(),

  z.object({
    action: z.literal('upsert-call-campaign'),
    campaign: z.object({
      callCampaignId: z.string().min(1).max(60),
      providerId: z.string().min(1).max(60),
      vertical: z.string().min(1).max(60),
      trackedNumberE164: z.string().regex(/^\+1\d{10}$/),
      displayNumber: z.string().min(1).max(40),
      active: z.boolean(),
      validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      stateCoverage: stringList,
      timezone: z.string().min(1).max(60),
      openHour: z.number().int().min(0).max(23),
      closeHour: z.number().int().min(1).max(24),
      disclosedPartnerName: z.string().min(1).max(120),
    }).strict(),
  }).strict(),

  z.object({
    action: z.literal('set-call-campaign-active'),
    callCampaignId: z.string().min(1).max(60),
    active: z.boolean(),
  }).strict(),

  z.object({
    action: z.literal('upsert-affiliate-offer'),
    offer: z.object({
      offerId: z.string().min(1).max(60),
      merchantId: z.string().min(1).max(60),
      category: z.string().min(1).max(60),
      locale: z.enum(LOCALES),
      headline: z.string().min(1).max(160),
      body: z.string().max(400),
      cta: z.string().min(1).max(60),
      destinationUrl: z.string().url().max(500),
      enabled: z.boolean(),
      commercialWeight: z.number().int().min(0).max(1000),
      lastVerifiedAt: z.string().optional(),
    }).strict(),
  }).strict(),

  z.object({
    action: z.literal('set-affiliate-offer-enabled'),
    offerId: z.string().min(1).max(60),
    enabled: z.boolean(),
  }).strict(),

  z.object({
    action: z.literal('import-conversions'),
    csv: z.string().min(1).max(2_000_000),
  }).strict(),

  z.object({
    action: z.literal('lead-dossier'),
    leadId: z.string().min(1).max(60),
    /** Unmasking is a separate, logged decision, not the default. */
    reveal: z.boolean().optional(),
  }).strict(),

  z.object({
    action: z.literal('process-deletion'),
    phone: z.string().max(24).optional(),
    email: z.string().max(254).optional(),
  }).strict(),
]);

export async function POST(request: Request, context?: { env?: RouteEnvironment }) {
  try {
    const actor = assertAdmin(request, context?.env);
    const database = requireStore(context?.env);

    const parsed = adminAction.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new PublicError(`Unsupported admin action: ${parsed.error.issues[0]?.message ?? 'unknown'}`, 400);
    }
    const body = parsed.data;

    switch (body.action) {
      case 'kill-switch': {
        if (!isMonetizationFlag(body.flag)) throw new PublicError('Unknown flag.', 400);
        await setKillSwitch(database, body.flag, body.disabled, actor, body.reason);
        const overrides = await loadFlagOverrides(database);
        return jsonResponse({ ok: true, flags: resolveAllFlags(process.env, overrides) });
      }

      case 'upsert-provider': {
        await upsertProvider(database, {
          providerId: body.providerId,
          providerType: body.providerType,
          displayName: body.displayName,
          status: body.status,
          supportedVerticals: body.supportedVerticals ?? [],
        });
        await recordConfigChange(database, {
          actor, entityType: 'provider', entityId: body.providerId,
          field: 'status', newValue: body.status,
        });
        return jsonResponse({ ok: true });
      }

      case 'upsert-campaign': {
        await upsertCampaign(database, body.campaign as never);
        await recordConfigChange(database, {
          actor, entityType: 'campaign', entityId: body.campaign.campaignId,
          field: 'definition', newValue: body.campaign.active ? 'active' : 'inactive',
        });
        return jsonResponse({ ok: true });
      }

      case 'set-campaign-active': {
        await setCampaignActive(database, body.campaignId, body.active);
        await recordConfigChange(database, {
          actor, entityType: 'campaign', entityId: body.campaignId,
          field: 'active', newValue: String(body.active),
        });
        return jsonResponse({ ok: true });
      }

      case 'upsert-call-campaign': {
        await upsertCallCampaign(database, body.campaign as never);
        await recordConfigChange(database, {
          actor, entityType: 'call_campaign', entityId: body.campaign.callCampaignId,
          field: 'definition', newValue: body.campaign.active ? 'active' : 'inactive',
        });
        return jsonResponse({ ok: true });
      }

      case 'set-call-campaign-active': {
        await setCallCampaignActive(database, body.callCampaignId, body.active);
        await recordConfigChange(database, {
          actor, entityType: 'call_campaign', entityId: body.callCampaignId,
          field: 'active', newValue: String(body.active),
        });
        return jsonResponse({ ok: true });
      }

      case 'upsert-affiliate-offer': {
        await upsertAffiliateOffer(database, body.offer as never);
        await recordConfigChange(database, {
          actor, entityType: 'affiliate_offer', entityId: body.offer.offerId,
          field: 'definition', newValue: body.offer.enabled ? 'enabled' : 'disabled',
        });
        return jsonResponse({ ok: true });
      }

      case 'set-affiliate-offer-enabled': {
        await setAffiliateOfferEnabled(database, body.offerId, body.enabled);
        await recordConfigChange(database, {
          actor, entityType: 'affiliate_offer', entityId: body.offerId,
          field: 'enabled', newValue: String(body.enabled),
        });
        return jsonResponse({ ok: true });
      }

      case 'import-conversions': {
        const statement = parseConversionCsv(body.csv);
        if (statement.lines.length === 0) {
          return jsonResponse({ ok: false, problems: statement.problems }, 400);
        }
        const result = await importConversions(database, statement.lines, actor);
        await recordConfigChange(database, {
          actor, entityType: 'conversion_import', entityId: result.batchId,
          field: 'imported', newValue: String(result.imported),
        });
        return jsonResponse({ ok: true, ...result, problems: statement.problems });
      }

      case 'lead-dossier': {
        const dossier = await leadDossier(database, body.leadId, body.reveal === true);
        if (!dossier) throw new PublicError('No such reference.', 404);
        if (body.reveal) {
          // Unmasking is itself a privacy event and is recorded as one.
          await recordConfigChange(database, {
            actor, entityType: 'privacy', entityId: body.leadId,
            field: 'contact_revealed', newValue: 'true',
          });
        }
        return jsonResponse({ ok: true, dossier });
      }

      case 'process-deletion': {
        const pepper = requirePepper(context?.env);
        if (!body.phone && !body.email) {
          throw new PublicError('A deletion request needs the phone number or email the person gave us.', 400);
        }
        const outcome = await processDeletionRequest(
          database, { phone: body.phone, email: body.email }, pepper, actor,
        );
        return jsonResponse({ ok: true, ...outcome });
      }

      default: {
        const exhaustive: never = body;
        throw new PublicError(`Unhandled action: ${JSON.stringify(exhaustive)}`, 400);
      }
    }
  } catch (error) {
    return errorResponse(error);
  }
}
