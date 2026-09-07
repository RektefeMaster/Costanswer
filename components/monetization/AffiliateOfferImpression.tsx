'use client';

import { useEffect, useRef } from 'react';
import type { AffiliateOffer } from '@/lib/monetization/affiliate/types';
import type { MonetizationContext } from '@/lib/monetization/context';
import { emitMonetizationEvent } from '@/lib/monetization/events';

/**
 * One offer's impression, so click-through can be computed per offer.
 *
 * A module-level impression cannot answer "which of these three did people
 * ignore", which is the question that decides what to keep.
 */
export function AffiliateOfferImpression({
  offer,
  context,
}: {
  offer: AffiliateOffer;
  context: MonetizationContext;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    emitMonetizationEvent('affiliate_offer_impression', {
      pageId: context.pageId,
      calculatorId: context.calculatorId,
      locale: context.locale,
      vertical: context.vertical,
      merchantId: offer.merchantId,
      offerId: offer.offerId,
      productCategory: offer.category,
      placement: 'after-result',
    });
  }, [offer, context]);

  return null;
}
