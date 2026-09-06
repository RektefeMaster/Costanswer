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

export type MonetizationSurface = {
  readonly offers: readonly AffiliateOffer[];
  readonly overrides: FlagOverrides;
  /** Whether the hire/DIY question is worth asking on this page. */
  readonly showIntentSwitch: boolean;
};

export const EMPTY_SURFACE: MonetizationSurface = Object.freeze({
  offers: [],
  overrides: {},
  showIntentSwitch: false,
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

    const affiliateAllowed = context.affiliateEligible
      && policy.affiliate.enabled
      && !affiliateForbidden(context)
      && resolveFlag('affiliate.enabled', process.env, overrides);

    if (!affiliateAllowed) return { offers: [], overrides, showIntentSwitch };

    const categories = relevantCategories(context).map((entry) => entry.categoryId);
    const offers = await offersForCategories(store.database, categories, context.locale);
    return { offers, overrides, showIntentSwitch };
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
