'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import {
  AD_CONSENT_STORAGE_KEY, DEFAULT_AD_CONSENT, parseAdConsent, type AdConsentState,
} from '@/lib/monetization/ads/consent';
import { localized, type Locale } from '@/lib/i18n/locales';

/**
 * The reader's own advertising and sharing choices.
 *
 * Stored in this browser and nowhere else — there is no account to attach a
 * preference to, and inventing one to remember a refusal would be worse than
 * the thing being refused. That means the choice does not follow someone across
 * devices, and the copy says so rather than implying otherwise.
 *
 * The opt-out is presented plainly and starts off. Section 40 asks for a "Do
 * Not Sell or Share" mechanism where applicable; this is that control, and it
 * gates personalisation in `AdScript` whether or not a network is live.
 */
const COPY = {
  heading: localized({
    'en-US': 'Your advertising choices',
    'es-US': 'Sus opciones de publicidad',
  }),
  intro: localized({
    'en-US': 'These settings are stored in this browser only. There is no account, so they do not follow you to another device or another browser.',
    'es-US': 'Estas opciones se guardan solo en este navegador. No hay cuenta, así que no lo acompañan a otro dispositivo ni a otro navegador.',
  }),
  optOutLabel: localized({
    'en-US': 'Do not sell or share my personal information for advertising',
    'es-US': 'No vender ni compartir mi información personal con fines publicitarios',
  }),
  optOutHelp: localized({
    'en-US': 'Advertising can still appear. It will be chosen from what is on the page rather than from anything about you.',
    'es-US': 'La publicidad puede seguir apareciendo. Se elegirá según el contenido de la página y no según información sobre usted.',
  }),
  personaliseLabel: localized({
    'en-US': 'Allow personalised advertising',
    'es-US': 'Permitir publicidad personalizada',
  }),
  saved: localized({ 'en-US': 'Saved.', 'es-US': 'Guardado.' }),
  unavailable: localized({
    'en-US': 'Your browser is not storing site settings, so these choices cannot be saved here. Nothing is being personalised.',
    'es-US': 'Su navegador no guarda configuraciones del sitio, así que estas opciones no se pueden guardar aquí. No se está personalizando nada.',
  }),
};

/*
 * Read through an external store rather than a state-setting effect.
 *
 * Setting state in an effect to mirror `localStorage` causes a render, a second
 * render, and a lint error saying exactly that. `useSyncExternalStore` is the
 * sanctioned way to read something the browser owns, gives a correct server
 * snapshot for the first paint, and picks up a change made in another tab for
 * free — which matters for a privacy choice more than for most settings.
 */
let cachedRaw: string | null = null;
let cachedState: AdConsentState = DEFAULT_AD_CONSENT;

function readConsent(): AdConsentState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(AD_CONSENT_STORAGE_KEY);
  } catch {
    return DEFAULT_AD_CONSENT;
  }
  // The snapshot has to be referentially stable or the store re-renders forever.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedState = parseAdConsent(raw ? JSON.parse(raw) : null);
    } catch {
      cachedState = DEFAULT_AD_CONSENT;
    }
  }
  return cachedState;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener('costanswer:ad-consent', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('costanswer:ad-consent', onChange);
  };
}

/**
 * Whether this control is actually working yet.
 *
 * Server-rendered HTML gives a checkbox that looks ready before its handler
 * exists, so a click in that window is accepted by the browser, discarded by
 * React's next render, and silently lost. For an ordinary setting that is a
 * shrug; for a privacy choice it is someone believing they opted out when they
 * did not. The inputs stay disabled until the handler is real.
 *
 * `useSyncExternalStore` gives this without setting state in an effect.
 */
const neverChanges = () => () => {};

function storageAvailable(): boolean {
  try {
    localStorage.getItem(AD_CONSENT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function PrivacyChoices({ locale }: { locale: Locale }) {
  const state = useSyncExternalStore(subscribe, readConsent, () => DEFAULT_AD_CONSENT);
  const hydrated = useSyncExternalStore(neverChanges, () => true, () => false);
  const [available, setAvailable] = useState(true);
  const [saved, setSaved] = useState(false);

  const persist = useCallback((next: AdConsentState) => {
    if (!storageAvailable()) {
      setAvailable(false);
      return;
    }
    try {
      localStorage.setItem(AD_CONSENT_STORAGE_KEY, JSON.stringify(next));
      // `storage` does not fire in the tab that wrote it, so this is what makes
      // the control update itself.
      window.dispatchEvent(new Event('costanswer:ad-consent'));
      setSaved(true);
    } catch {
      setAvailable(false);
    }
  }, []);

  if (!available) {
    return <p className="privacy-choices-note">{COPY.unavailable[locale]}</p>;
  }

  return (
    <section className="privacy-choices" aria-labelledby="privacy-choices-title">
      <h2 id="privacy-choices-title">{COPY.heading[locale]}</h2>
      <p>{COPY.intro[locale]}</p>

      <div className="privacy-choice">
        <input
          id="do-not-sell"
          type="checkbox"
          disabled={!hydrated}
          checked={state.saleOptOut}
          onChange={(event) => persist({
            ...state,
            saleOptOut: event.target.checked,
            // Opting out of sharing necessarily withdraws personalisation;
            // leaving them independent would let the two contradict each other.
            personalisation: event.target.checked ? 'denied' : state.personalisation,
          })}
          aria-describedby="do-not-sell-help"
        />
        <label htmlFor="do-not-sell">{COPY.optOutLabel[locale]}</label>
      </div>
      <p id="do-not-sell-help" className="privacy-choices-note">{COPY.optOutHelp[locale]}</p>

      <div className="privacy-choice">
        <input
          id="personalised-ads"
          type="checkbox"
          checked={state.personalisation === 'granted'}
          disabled={!hydrated || state.saleOptOut}
          onChange={(event) => persist({
            ...state,
            personalisation: event.target.checked ? 'granted' : 'denied',
            script: event.target.checked ? 'granted' : state.script,
          })}
        />
        <label htmlFor="personalised-ads">{COPY.personaliseLabel[locale]}</label>
      </div>

      <p className="privacy-choices-note" role="status" aria-live="polite">
        {saved ? COPY.saved[locale] : ''}
      </p>
    </section>
  );
}
