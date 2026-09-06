'use client';

import { useState, type ReactNode } from 'react';
import type { Locale } from '@/lib/i18n/locales';
import type { UserIntent } from '@/lib/monetization/context';
import { emitMonetizationEvent } from '@/lib/monetization/events';
import { UI_STRINGS } from '@/lib/monetization/ui/strings';

/**
 * The hire / do-it-myself / researching choice, and what it actually does.
 *
 * The switch existed and changed nothing: someone answered "do it myself" and
 * the page stayed exactly as it was. A control that does not do what it says is
 * worse than no control, because it spends the reader's trust for nothing.
 *
 * Both branches are rendered on the server — the affiliate links need the
 * programme credential, which never reaches the browser — and this only decides
 * which of them is on screen. Answering is optional: until someone does, both
 * are shown, which is what the page would have done anyway.
 */
export function NextActionChoice({
  locale,
  pageId,
  vertical,
  hire,
  diy,
}: {
  locale: Locale;
  pageId: string;
  vertical: string;
  hire: ReactNode;
  diy: ReactNode;
}) {
  const [intent, setIntent] = useState<UserIntent>('unknown');

  const choose = (next: UserIntent) => {
    // Choosing the same answer twice clears it, so a mis-tap is recoverable
    // without hunting for a "show me everything again" control.
    const resolved = next === intent ? 'unknown' : next;
    setIntent(resolved);
    emitMonetizationEvent('intent_selected', {
      pageId, locale, vertical,
      intent: resolved === 'unknown' ? undefined : resolved,
    });
  };

  const options: Array<{ value: UserIntent; label: string }> = [
    { value: 'hire_professional', label: UI_STRINGS.intentHire[locale] },
    { value: 'diy', label: UI_STRINGS.intentDiy[locale] },
    { value: 'researching', label: UI_STRINGS.intentResearch[locale] },
  ];

  const showHire = intent === 'unknown' || intent === 'hire_professional';
  const showDiy = intent === 'unknown' || intent === 'diy';

  return (
    <>
      <fieldset className="intent-switch">
        <legend>{UI_STRINGS.intentQuestion[locale]}</legend>
        <div className="intent-options" role="group">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="intent-option"
              aria-pressed={intent === option.value}
              onClick={() => choose(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/*
        `hidden` rather than unmounting: the branches were rendered on the
        server, and tearing one down would throw away a part-filled lead form
        the moment someone changed their mind.
      */}
      <div hidden={!showHire}>{hire}</div>
      <div hidden={!showDiy}>{diy}</div>
    </>
  );
}
