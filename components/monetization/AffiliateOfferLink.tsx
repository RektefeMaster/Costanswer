'use client';

import type { MonetizationContext } from '@/lib/monetization/context';

/**
 * One outbound link.
 *
 * The href is built on the server and handed down. It used to be built here,
 * which meant the server decided a merchant was linkable using its own
 * credential while the browser tried to rebuild the URL from a `NEXT_PUBLIC_`
 * copy of it. Set only the server-side one — the ordinary case — and the offer
 * card rendered with a headline, a body and no link at all.
 *
 * What is left here is the one thing that genuinely needs the browser: the
 * click beacon. It is `sendBeacon`, which the browser sends without the page
 * waiting for it, so a failed beacon can never delay or block someone leaving.
 */
export function AffiliateOfferLink({
  href,
  rel,
  label,
  merchantName,
  offerId,
  merchantId,
  category,
  context,
}: {
  href: string;
  rel: string;
  label: string;
  merchantName: string;
  offerId: string;
  merchantId: string;
  category: string;
  context: MonetizationContext;
}) {
  const reportClick = () => {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;
    try {
      navigator.sendBeacon(
        '/api/monetization/affiliate-click',
        new Blob([JSON.stringify({
          offerId,
          merchantId,
          category,
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
      href={href}
      rel={rel}
      target="_blank"
      onClick={reportClick}
      onAuxClick={reportClick}
    >
      {label}
      <span className="sr-only"> (opens {merchantName} in a new tab)</span>
    </a>
  );
}
