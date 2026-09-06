'use client';

import type { CallCtaModel } from '@/lib/monetization/calls/types';
import { emitMonetizationEvent } from '@/lib/monetization/events';
import { UI_STRINGS } from '@/lib/monetization/ui/strings';
import type { MonetizationContext } from '@/lib/monetization/context';

/**
 * The tracked-number call option.
 *
 * Rendered only when a live campaign supplied a number and its buyer is
 * actually open — a motivated caller sent to voicemail is worse than no call
 * option, because they conclude nobody is there.
 */
export function CallCta({ model, context }: { model: CallCtaModel; context: MonetizationContext }) {
  const locale = context.locale;
  return (
    <div className="call-cta">
      <p className="call-cta-heading">{UI_STRINGS.callHeading[locale]}</p>
      <p>{UI_STRINGS.callBody[locale]}</p>
      <a
        href={model.telHref}
        className="call-cta-number"
        onClick={() => emitMonetizationEvent('call_cta_click', {
          pageId: context.pageId,
          calculatorId: context.calculatorId,
          locale,
          vertical: context.vertical,
        })}
      >
        {model.displayNumber}
      </a>
      <p className="call-cta-partner">{model.partnerName}</p>
    </div>
  );
}
