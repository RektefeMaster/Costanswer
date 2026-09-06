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
import { loadFlagOverrides, recentConfigChanges, setKillSwitch } from '@/lib/monetization/store/repositories/governance';
import { dueDeliveries } from '@/lib/monetization/store/repositories/deliveries';
import {
  assertAdmin, errorResponse, jsonResponse, PublicError, readJson,
  requireStore, type RouteEnvironment,
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
      recentChanges: await recentConfigChanges(database, 50),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

const killSwitchSchema = z.object({
  action: z.literal('kill-switch'),
  flag: z.string().min(1),
  disabled: z.boolean(),
  reason: z.string().min(3).max(300),
}).strict();

export async function POST(request: Request, context?: { env?: RouteEnvironment }) {
  try {
    const actor = assertAdmin(request, context?.env);
    const database = requireStore(context?.env);

    const parsed = killSwitchSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new PublicError('Unsupported admin action.', 400);
    if (!isMonetizationFlag(parsed.data.flag)) throw new PublicError('Unknown flag.', 400);

    await setKillSwitch(database, parsed.data.flag, parsed.data.disabled, actor, parsed.data.reason);
    const overrides = await loadFlagOverrides(database);
    return jsonResponse({ ok: true, flags: resolveAllFlags(process.env, overrides) });
  } catch (error) {
    return errorResponse(error);
  }
}
