'use client';

import { useEffect, useRef } from 'react';
import type { MonetizationContext } from '@/lib/monetization/context';
import { emitMonetizationEvent } from '@/lib/monetization/events';

/**
 * Records that a commercial module was actually seen.
 *
 * These are the denominators every funnel divides by, and they were missing:
 * clicks were counted and impressions were not, so a click-through rate would
 * have been computed against nothing. A rate with a missing base is worse than
 * no rate, because it looks like a measurement.
 *
 * Fired on visibility rather than on render, because a module below the fold
 * that nobody scrolled to was not an impression. It fires once per mount; the
 * ref is what stops a re-render from inflating the count.
 */
export function MonetizationImpressions({
  context,
  lead,
  affiliate,
  offerCount,
}: {
  context: MonetizationContext;
  lead: boolean;
  affiliate: boolean;
  offerCount: number;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const element = anchor.current;
    if (!element || fired.current) return;

    const record = () => {
      if (fired.current) return;
      fired.current = true;
      if (lead) {
        emitMonetizationEvent('lead_cta_impression', {
          pageId: context.pageId,
          calculatorId: context.calculatorId,
          locale: context.locale,
          vertical: context.vertical,
          state: context.location?.state,
        });
      }
      if (affiliate) {
        emitMonetizationEvent('affiliate_module_impression', {
          pageId: context.pageId,
          calculatorId: context.calculatorId,
          locale: context.locale,
          vertical: context.vertical,
          offerCount,
        });
      }
    };

    // No IntersectionObserver (older browser, or a test environment) means we
    // cannot know whether it was seen. Counting it is the lesser error: an
    // undercounted denominator overstates every rate above it.
    if (typeof IntersectionObserver === 'undefined') {
      record();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        record();
        observer.disconnect();
      }
    }, { threshold: 0.5 });

    observer.observe(element);
    return () => observer.disconnect();
  }, [context, lead, affiliate, offerCount]);

  return <span ref={anchor} aria-hidden="true" className="impression-anchor" />;
}
