/**
 * What a page should actually render, resolved on the server.
 *
 * The components were correct and unreachable: `NextActionModule` defaulted to
 * an empty offer list and nothing ever supplied one, so the affiliate channel
 * could not render whatever was configured. This is the missing half — it reads
 * the policy, the flags, the stored kill switches and the offer rows, and hands
 * a page one finished answer.
 *
 * It runs on the server and returns inert data, so no database handle, offer
 * query or flag lookup reaches the browser.
 */
import type { AffiliateOffer } from './affiliate/types';
import { relevantCategories, affiliateForbidden } from './affiliate/relevance';
import type { MonetizationContext } from './context';
import { resolveFlag, type FlagOverrides } from './flags';
import { getMonetizationPolicy } from './policy';
import { monetizationStore } from './store/d1';
import { loadFlagOverrides } from './store/repositories/governance';
import { offersForCategories } from './store/repositories/affiliate';
import { activeCallCampaigns } from './store/repositories/calls';
import { liveCallCampaign } from './calls/types';
import type { CallCampaign } from './calls/types';

export type MonetizationSurface = {
  readonly offers: readonly AffiliateOffer[];
  readonly overrides: FlagOverrides;
  /** Whether the hire/DIY question is worth asking on this page. */
  readonly showIntentSwitch: boolean;
  /** A tracked number that is live, in coverage, and answered right now. */
  readonly callCampaign: CallCampaign | null;
};

export const EMPTY_SURFACE: MonetizationSurface = Object.freeze({
  offers: [],
  overrides: {},
  showIntentSwitch: false,
  callCampaign: null,
});

/**
 * Never throws.
 *
 * A page render must not fail because the monetization database is missing, a
 * query is slow, or a table has not been migrated yet. The worst outcome here
 * is a page with no commercial module, which is the state the site launches in
 * anyway.
 */
export async function resolveMonetizationSurface(
  context: MonetizationContext,
  env?: Record<string, unknown>,
): Promise<MonetizationSurface> {
  const policy = getMonetizationPolicy(context.pageId);
  const store = monetizationStore(env);
  if (!store.available) {
    return { ...EMPTY_SURFACE, showIntentSwitch: intentSwitchVisible(context, {}) };
  }

  try {
    const overrides = await loadFlagOverrides(store.database);
    const showIntentSwitch = intentSwitchVisible(context, overrides);

    /*
     * A tracked number is only offered when its campaign is live, covers the
     * caller, and its buyer is actually open. Sending a motivated caller to
     * voicemail burns the intent that produced the click.
     */
    const callsAllowed = policy.lead.enabled
      && policy.lead.vertical !== undefined
      && resolveFlag('calls.enabled', process.env, overrides);
    const callCampaign = callsAllowed && policy.lead.vertical
      ? liveCallCampaign({
          vertical: policy.lead.vertical,
          state: context.location?.state,
          asOf: new Date().toISOString().slice(0, 10),
          at: new Date(),
          campaigns: await activeCallCampaigns(store.database, policy.lead.vertical),
        })
      : null;

    const affiliateAllowed = context.affiliateEligible
      && policy.affiliate.enabled
      && !affiliateForbidden(context)
      && resolveFlag('affiliate.enabled', process.env, overrides);

    if (!affiliateAllowed) return { offers: [], overrides, showIntentSwitch, callCampaign };

    const categories = relevantCategories(context).map((entry) => entry.categoryId);
    const offers = await offersForCategories(store.database, categories, context.locale);
    return { offers, overrides, showIntentSwitch, callCampaign };
  } catch {
    return { ...EMPTY_SURFACE, showIntentSwitch: intentSwitchVisible(context, {}) };
  }
}

/**
 * The hire/DIY question is only worth asking where both answers lead somewhere.
 *
 * On a page with materials but no trade to hire — or a trade but nothing to buy
 * — it is a question with a wrong answer, so the policy row gates it and both
 * channels have to be live for it to appear.
 */
function intentSwitchVisible(context: MonetizationContext, overrides: FlagOverrides): boolean {
  const policy = getMonetizationPolicy(context.pageId);
  if (!policy.intentSwitch) return false;
  if (context.riskClass === 'restricted') return false;
  const leadLive = policy.lead.enabled && resolveFlag('leads.enabled', process.env, overrides);
  const affiliateLive = policy.affiliate.enabled
    && !affiliateForbidden(context)
    && resolveFlag('affiliate.enabled', process.env, overrides);
  return leadLive && affiliateLive;
}
