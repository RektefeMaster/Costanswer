'use client';

import { useId, useState } from 'react';
import type { UserIntent } from '@/lib/monetization/context';
import { emitMonetizationEvent } from '@/lib/monetization/events';
import { UI_STRINGS } from '@/lib/monetization/ui/strings';
import type { Locale } from '@/lib/i18n/locales';

/**
 * "What are you planning to do?"
 *
 * Shown only where both answers lead somewhere genuinely different — a page
 * with materials to buy *and* a trade to hire. On a page where one branch is
 * empty this is a question with a wrong answer, so `policy.intentSwitch` gates
 * it and most pages never render it.
 *
 * Answering is optional and skipping it is a real choice, not a dead end: the
 * unanswered state still shows the modules the page would have shown anyway.
 */
export function IntentSwitch({
  locale,
  pageId,
  vertical,
  onChange,
}: {
  locale: Locale;
  pageId: string;
  vertical: string;
  onChange?: (intent: UserIntent) => void;
}) {
  const groupId = useId();
  const [selected, setSelected] = useState<UserIntent>('unknown');

  const choose = (intent: UserIntent) => {
    setSelected(intent);
    onChange?.(intent);
    emitMonetizationEvent('intent_selected', {
      pageId, locale, vertical,
      intent: intent === 'unknown' ? undefined : intent,
    });
  };

  const options: Array<{ intent: UserIntent; label: string }> = [
    { intent: 'hire_professional', label: UI_STRINGS.intentHire[locale] },
    { intent: 'diy', label: UI_STRINGS.intentDiy[locale] },
    { intent: 'researching', label: UI_STRINGS.intentResearch[locale] },
  ];

  return (
    <fieldset className="intent-switch" aria-describedby={`${groupId}-legend`}>
      <legend id={`${groupId}-legend`}>{UI_STRINGS.intentQuestion[locale]}</legend>
      <div className="intent-options" role="group">
        {options.map((option) => (
          <button
            key={option.intent}
            type="button"
            className="intent-option"
            aria-pressed={selected === option.intent}
            onClick={() => choose(option.intent)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
