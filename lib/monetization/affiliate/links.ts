/**
 * Building the outbound link.
 *
 * Three rules, each of which exists because the alternative is a policy
 * violation rather than a style preference:
 *
 *   - The href is the merchant's own URL. There is no internal redirect that
 *     hides where the reader is going. Cloaking a destination is against every
 *     one of these programmes' terms and is also just dishonest — the reader
 *     should be able to read the status bar and know they are leaving.
 *   - `rel="sponsored nofollow noopener noreferrer"`. Sponsored because it is
 *     paid, and a followed paid link is link-selling.
 *   - The click is recorded with a beacon that navigation does not wait on. An
 *     analytics call must never be able to delay or break a reader leaving.
 */
import type { AffiliateMerchant, AffiliateOffer } from './types';

export const AFFILIATE_REL = 'sponsored nofollow noopener noreferrer';

export type AffiliateLink = {
  readonly href: string;
  readonly rel: string;
  readonly target: '_blank';
  readonly merchantName: string;
};

/**
 * Attach the tracking identifier the programme requires.
 *
 * Done by explicit parameter name per network rather than a generic "append
 * whatever is configured", so a misconfigured value cannot rewrite an unrelated
 * query parameter on the merchant's own URL.
 */
export function buildAffiliateLink(
  offer: AffiliateOffer,
  merchant: AffiliateMerchant,
  environment: Record<string, string | undefined> = process.env,
): AffiliateLink | null {
  let url: URL;
  try {
    url = new URL(offer.destinationUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  switch (merchant.network) {
    case 'amazon': {
      const tag = environment.AFFILIATE_AMAZON_TRACKING_ID?.trim();
      if (!tag) return null;
      url.searchParams.set('tag', tag);
      break;
    }
    case 'homedepot':
      // The tracking parameter name is issued by the programme at approval.
      // Guessing one would produce links that look monetized and pay nothing,
      // so the merchant stays unlinkable until the real format is recorded.
      return null;
    case 'cj':
      // CJ link format is per-advertiser and issued at acceptance, so there is
      // no single format to build here yet.
      return null;
    case 'direct':
      break;
    default: {
      const exhaustive: never = merchant.network;
      throw new Error(`Unhandled affiliate network: ${exhaustive}`);
    }
  }

  return {
    href: url.toString(),
    rel: AFFILIATE_REL,
    target: '_blank',
    merchantName: merchant.displayName,
  };
}

/**
 * Whether a stored price may be shown for this merchant.
 *
 * Amazon's terms govern price display and caching, so we do not hold one. The
 * honest alternative is on the button: "Check current price on Amazon". A
 * number we cached last month is worse than no number, because the reader
 * believes it.
 */
export function priceDisplayMode(merchant: AffiliateMerchant): 'stored' | 'check-on-site' {
  return merchant.mayDisplayStoredPrice ? 'stored' : 'check-on-site';
}
