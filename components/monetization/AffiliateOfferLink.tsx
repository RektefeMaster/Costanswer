'use client';

import { buildAffiliateLink, priceDisplayMode } from '@/lib/monetization/affiliate/links';
import type { AffiliateMerchant, AffiliateOffer } from '@/lib/monetization/affiliate/types';
import type { MonetizationContext } from '@/lib/monetization/context';
import { UI_STRINGS } from '@/lib/monetization/ui/strings';

/**
 * One outbound link.
 *
 * A real anchor to the merchant's own URL. No internal redirect stands between
 * the reader and the destination: the status bar tells them where they are
 * going, which is both required by these programmes and the honest thing to do.
 *
 * The click is reported with `sendBeacon`, which the browser fires without the
 * page waiting for it. If the beacon fails the link still works. Navigation is
 * never allowed to depend on analytics succeeding.
 */
export function AffiliateOfferLink({
  offer,
  merchant,
  context,
}: {
  offer: AffiliateOffer;
  merchant: AffiliateMerchant;
  context: MonetizationContext;
}) {
  // Only NEXT_PUBLIC_ values are readable here; a server-only tracking id is
  // absent in the browser, so an unapproved merchant renders no link at all.
  const link = buildAffiliateLink(offer, merchant, {
    AFFILIATE_AMAZON_TRACKING_ID: process.env.NEXT_PUBLIC_AFFILIATE_AMAZON_TRACKING_ID,
  });
  if (!link) return null;

  const label = priceDisplayMode(merchant) === 'check-on-site'
    ? `${UI_STRINGS.checkPrice[context.locale]} · ${merchant.displayName}`
    : offer.cta;

  const reportClick = () => {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;
    try {
      navigator.sendBeacon(
        '/api/monetization/affiliate-click',
        new Blob([JSON.stringify({
          offerId: offer.offerId,
          merchantId: offer.merchantId,
          category: offer.category,
          pageId: context.pageId,
          calculatorId: context.calculatorId,
          locale: context.locale,
          vertical: context.vertical,
          placement: 'after-result',
        })], { type: 'application/json' }),
      );
    } catch {
      // A failed beacon must never interrupt the reader leaving.
    }
  };

  return (
    <a
      className="affiliate-offer-link"
      href={link.href}
      rel={link.rel}
      target={link.target}
      onClick={reportClick}
      onAuxClick={reportClick}
    >
      {label}
      <span className="sr-only"> (opens {merchant.displayName} in a new tab)</span>
    </a>
  );
}
