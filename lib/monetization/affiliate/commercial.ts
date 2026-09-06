/**
 * Choosing between merchants, after relevance has already decided what.
 *
 * Everything commercial lives in this file. It receives categories that are
 * already known to be relevant and never adds one: `selectOffers` can reorder
 * and it can return fewer, but there is no code path by which a payout
 * introduces a product the reader had no reason to see.
 */
import type { Locale } from '@/lib/i18n/locales';
import { getMerchant, isMerchantLinkable } from './catalog';
import type { AffiliateOffer, ScoredOffer } from './types';
import type { RelevantCategory } from './relevance';

export type OfferSelectionInput = {
  readonly categories: readonly RelevantCategory[];
  readonly offers: readonly AffiliateOffer[];
  readonly locale: Locale;
  readonly maxOffers?: number;
  readonly environment?: Record<string, string | undefined>;
};

export type OfferSelection = {
  readonly offers: readonly ScoredOffer[];
  readonly compensationInfluencedOrder: boolean;
  readonly disclosureIds: readonly string[];
};

export const DEFAULT_MAX_OFFERS = 3;

export function selectOffers(input: OfferSelectionInput): OfferSelection {
  const environment = input.environment ?? process.env;
  const relevanceByCategory = new Map(input.categories.map((entry) => [entry.categoryId, entry.relevance]));

  const candidates: ScoredOffer[] = [];
  for (const offer of input.offers) {
    if (!offer.enabled) continue;
    if (offer.locale !== input.locale) continue;
    const relevance = relevanceByCategory.get(offer.category as never);
    if (relevance === undefined) continue;

    const merchant = getMerchant(offer.merchantId);
    if (!merchant || !isMerchantLinkable(merchant, environment)) continue;

    candidates.push({ offer, relevance, commercialScore: offer.commercialWeight });
  }

  // Relevance first, always. Commercial weight is only ever a tie-break between
  // offers the reader has equal reason to see, and "equal" is a real equality
  // check rather than a tolerance that quietly widens over time.
  const sorted = [...candidates].sort((left, right) => {
    if (right.relevance !== left.relevance) return right.relevance - left.relevance;
    return right.commercialScore - left.commercialScore;
  });

  const byRelevanceOnly = [...candidates].sort((left, right) => right.relevance - left.relevance);
  const compensationInfluencedOrder = sorted.some(
    (entry, index) => byRelevanceOnly[index]?.offer.offerId !== entry.offer.offerId,
  );

  const selected = sorted.slice(0, input.maxOffers ?? DEFAULT_MAX_OFFERS);
  const disclosureIds = [...new Set(
    selected.map((entry) => getMerchant(entry.offer.merchantId)?.disclosureId).filter((id): id is string => Boolean(id)),
  )];

  return { offers: selected, compensationInfluencedOrder, disclosureIds };
}
