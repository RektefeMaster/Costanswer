/**
 * Lead-gen / affiliate offer architecture.
 *
 * Partner names below are examples of the kind of marketplace that might sit
 * next to a result (LendingTree, Rocket Mortgage, SoFi). They are not live
 * partnerships. Do not invent click-tracking IDs. A card only becomes a link
 * when its env URL is set and affiliates are enabled in integration-config.
 */
import { integrationConfig } from './integration-config';

export const AFFILIATE_PLACEMENT = 'after-result' as const;

export const AFFILIATE_PARTNER_IDS = ['lendingtree', 'rocket-mortgage', 'sofi', 'bankrate'] as const;
export type AffiliatePartnerId = (typeof AFFILIATE_PARTNER_IDS)[number];

export type AffiliatePartner = {
  id: AffiliatePartnerId;
  name: string;
  categoryLabel: string;
  /** Example only — replace with a real program URL via env when a contract exists. */
  envUrlKey: string;
};

export const AFFILIATE_PARTNERS: Record<AffiliatePartnerId, AffiliatePartner> = {
  lendingtree: {
    id: 'lendingtree',
    name: 'LendingTree',
    categoryLabel: 'Mortgage marketplace (example partner)',
    envUrlKey: 'NEXT_PUBLIC_AFFILIATE_LENDINGTREE_URL',
  },
  'rocket-mortgage': {
    id: 'rocket-mortgage',
    name: 'Rocket Mortgage',
    categoryLabel: 'Direct mortgage lender (example partner)',
    envUrlKey: 'NEXT_PUBLIC_AFFILIATE_ROCKET_MORTGAGE_URL',
  },
  sofi: {
    id: 'sofi',
    name: 'SoFi',
    categoryLabel: 'Personal loans and cash (example partner)',
    envUrlKey: 'NEXT_PUBLIC_AFFILIATE_SOFI_URL',
  },
  bankrate: {
    id: 'bankrate',
    name: 'Bankrate',
    categoryLabel: 'Rate comparison (example partner)',
    envUrlKey: 'NEXT_PUBLIC_AFFILIATE_BANKRATE_URL',
  },
};

export type AffiliateOffer = {
  id: string;
  partnerId: AffiliatePartnerId;
  toolIds: readonly string[];
  headline: string;
  body: string;
  cta: string;
};

/**
 * Contextual CTAs keyed to calculator intents. Copy never claims the partner
 * is CostAnswer’s answer or that a result is a pre-approval.
 */
export const AFFILIATE_OFFERS: readonly AffiliateOffer[] = [
  {
    id: 'mortgage-marketplace',
    partnerId: 'lendingtree',
    toolIds: ['mortgage-payment', 'home-affordability', 'refinance', 'mortgage-payoff'],
    headline: 'Compare current mortgage offers',
    body: 'The payment on this page is an estimate from the rate you used, not a lender quote. A marketplace can show live offers. That is advertising, not CostAnswer’s answer, and not financial advice.',
    cta: 'See lender options',
  },
  {
    id: 'mortgage-direct',
    partnerId: 'rocket-mortgage',
    toolIds: ['mortgage-payment', 'home-affordability', 'refinance'],
    headline: 'Get a mortgage quote from a lender',
    body: 'If you already have a house price in mind, a lender can price your credit and property. CostAnswer does not underwrite loans and does not see those details.',
    cta: 'Start a quote',
  },
  {
    id: 'auto-loan-compare',
    partnerId: 'bankrate',
    toolIds: ['car-loan', 'car-affordability', 'loan'],
    headline: 'Compare auto and personal loan rates',
    body: 'The monthly figure here is amortization math on the numbers you typed. Shopping a rate can change the payment. Offers are from advertisers, not from this calculator.',
    cta: 'Compare loan rates',
  },
  {
    id: 'sofi-debt',
    partnerId: 'sofi',
    toolIds: ['debt-payoff', 'credit-card-payoff'],
    headline: 'See personal-loan options',
    body: 'The payoff date on this page is loan math on the balances and rates you typed. A personal-loan offer, if one appears, is advertising, not a recommendation to refinance the card.',
    cta: 'View partner options',
  },
];

export const EXAMPLE_PARTNER_NAMES = AFFILIATE_PARTNER_IDS.map((id) => AFFILIATE_PARTNERS[id].name);

export function examplePartnerNames(): string[] {
  return [...EXAMPLE_PARTNER_NAMES];
}

export const AFFILIATE_DISCLOSURE =
  'Some links on this page may be advertisements or affiliate partnerships. CostAnswer may be compensated if you click or apply. That does not change the formula or the official data on the page, and it is not an endorsement or financial advice.';

export function affiliateUrl(partnerId: AffiliatePartnerId, environment: Record<string, string | undefined> = process.env): string | undefined {
  const key = AFFILIATE_PARTNERS[partnerId].envUrlKey;
  const value = environment[key]?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function offersForTool(toolId: string): AffiliateOffer[] {
  return AFFILIATE_OFFERS.filter((offer) => offer.toolIds.includes(toolId));
}

export function isAffiliateEligible(toolId: string): boolean {
  return offersForTool(toolId).length > 0;
}

export type AffiliateSlotModel = {
  toolId: string;
  eligible: boolean;
  enabled: boolean;
  disclosure: string;
  offers: Array<AffiliateOffer & { partnerName: string; categoryLabel: string; href?: string }>;
};

export function affiliateSlotForTool(toolId: string): AffiliateSlotModel {
  const eligible = isAffiliateEligible(toolId);
  const enabled = integrationConfig.affiliatesEnabled && eligible;
  const offers = offersForTool(toolId).map((offer) => {
    const partner = AFFILIATE_PARTNERS[offer.partnerId];
    return {
      ...offer,
      partnerName: partner.name,
      categoryLabel: partner.categoryLabel,
      href: enabled ? affiliateUrl(offer.partnerId) : undefined,
    };
  });
  return {
    toolId,
    eligible,
    enabled,
    disclosure: AFFILIATE_DISCLOSURE,
    offers,
  };
}
