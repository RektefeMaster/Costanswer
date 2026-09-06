'use client';

import { useState } from 'react';
import type { MonetizationContext } from '@/lib/monetization/context';
import type { LeadVerticalId } from '@/lib/monetization/policy';
import { emitMonetizationEvent } from '@/lib/monetization/events';
import { disclosureText } from '@/lib/monetization/affiliate/disclosure';
import { UI_STRINGS } from '@/lib/monetization/ui/strings';
import { LeadForm } from './LeadForm';

/**
 * The hire-a-professional call to action.
 *
 * Closed by default. Opening it is what starts the form, so the reader who came
 * for a number gets the number and nothing else unless they ask — which is the
 * whole monetization principle in one interaction.
 *
 * The compensation disclosure sits on the CTA itself, before any click, not
 * behind it.
 */
export function LeadCta({
  context,
  vertical,
  known,
}: {
  context: MonetizationContext;
  vertical: LeadVerticalId;
  known?: { zip?: string; size?: number; unit?: string; qualityTier?: string };
}) {
  const [open, setOpen] = useState(false);
  const locale = context.locale;

  return (
    <section className="lead-cta" aria-labelledby="lead-cta-title">
      <h2 id="lead-cta-title">{UI_STRINGS.leadHeading[locale]}</h2>
      <p>{UI_STRINGS.leadBody[locale]}</p>

      {!open && (
        <button
          type="button"
          className="lead-cta-button"
          onClick={() => {
            setOpen(true);
            emitMonetizationEvent('lead_cta_click', {
              pageId: context.pageId,
              calculatorId: context.calculatorId,
              locale,
              vertical: context.vertical,
            });
          }}
        >
          {UI_STRINGS.leadCta[locale]}
        </button>
      )}

      {open && <LeadForm context={context} vertical={vertical} known={known} />}

      <p className="commercial-disclosure">{disclosureText('lead-referral', locale)}</p>
    </section>
  );
}
