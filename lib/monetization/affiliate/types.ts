/**
 * The affiliate domain.
 *
 * Two scores, never one. `relevance` answers "does this reader actually need
 * this thing", and it is computed from the calculator and nothing else — no
 * merchant, no commission, no availability. `commercialScore` answers "among
 * the things they need, which approved merchant should we link to", and it only
 * ever runs on offers that already cleared relevance.
 *
 * Collapsing them into one number is how a site ends up recommending a paint
 * sprayer under a roofing calculator: the sprayer paid more, the combined score
 * won, and no single line of code decided to do it.
 */
import type { Locale } from '@/lib/i18n/locales';
import type { AffiliateCategoryId } from '../policy';

export type MerchantStatus =
  | 'configuration_required' | 'configured' | 'approved' | 'enabled' | 'disabled' | 'compliance_hold';

export type AffiliateNetwork = 'amazon' | 'homedepot' | 'cj' | 'direct';

export type AffiliateMerchant = {
  readonly merchantId: string;
  readonly network: AffiliateNetwork;
  readonly displayName: string;
  readonly status: MerchantStatus;
  /** Which disclosure block this merchant's programme requires. */
  readonly disclosureId: string;
  readonly requiredEnv: readonly string[];
  readonly outstandingDependency?: string;
  /**
   * Whether the programme permits showing a price we hold ourselves.
   *
   * False for Amazon: their agreement governs how price and availability may be
   * displayed and how long it may be cached, so we link out with "check current
   * price" rather than storing a number that goes stale and becomes a lie.
   */
  readonly mayDisplayStoredPrice: boolean;
  readonly documentationCheckedAt: string;
};

export type ProductCategory = {
  readonly categoryId: AffiliateCategoryId;
  /** What the reader is actually shopping for, in their words. */
  readonly label: Readonly<Record<Locale, string>>;
  readonly description: Readonly<Record<Locale, string>>;
};

export type AffiliateOffer = {
  readonly offerId: string;
  readonly merchantId: string;
  readonly category: AffiliateCategoryId;
  readonly locale: Locale;
  readonly headline: string;
  readonly body: string;
  readonly cta: string;
  /** The merchant's own destination. No internal cloaking redirect. */
  readonly destinationUrl: string;
  readonly enabled: boolean;
  /**
   * Tie-break weight among equally relevant offers.
   *
   * Not a commission rate. Programme rates change without notice and encoding
   * one here would make a stale number into a ranking decision; this is an
   * operator-set integer that can be re-tuned from the admin screen.
   */
  readonly commercialWeight: number;
  readonly lastVerifiedAt?: string;
};

export type ScoredOffer = {
  readonly offer: AffiliateOffer;
  readonly relevance: number;
  readonly commercialScore: number;
};

export type AffiliateModuleModel = {
  readonly placement: 'after-result';
  readonly categories: readonly ProductCategory[];
  readonly offers: readonly ScoredOffer[];
  readonly disclosureIds: readonly string[];
  /** True when commercialScore changed the order of equally relevant offers. */
  readonly compensationInfluencedOrder: boolean;
};
