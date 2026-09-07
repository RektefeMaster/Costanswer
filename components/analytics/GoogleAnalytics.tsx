'use client';

import { useEffect } from 'react';
import type { AnalyticsEvent } from '@/lib/analytics';
import {
  AD_CONSENT_STORAGE_KEY, DEFAULT_AD_CONSENT, mayPersonalise, parseAdConsent,
} from '@/lib/monetization/ads/consent';

type GtagArgs = [command: string, ...rest: unknown[]];

declare global {
  interface Window {
    dataLayer?: GtagArgs[];
    gtag?: (...args: GtagArgs) => void;
  }
}

/**
 * GA4, attached to the site's own event bus rather than sprinkled through it.
 *
 * `emitAnalyticsEvent` already validates every event against a closed list and
 * a per-field allowlist, then dispatches it as a DOM event. Forwarding from
 * there — instead of calling `gtag` at each call site — is what keeps the
 * guarantee that nothing unvalidated can reach a vendor: there is one listener,
 * and it can only ever see events that survived the boundary.
 *
 * Three things this does not do. It does not run unless analytics is enabled
 * and a measurement id is configured. It does not send advertising signals when
 * the reader has used the sale/share opt-out on the privacy page. And it never
 * throws into a page: a blocked or failed tag is a site with no measurement,
 * not a site with a broken calculator.
 */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  useEffect(() => {
    const marker = 'data-costanswer-ga4';
    if (document.querySelector(`script[${marker}]`)) return;

    let consent = DEFAULT_AD_CONSENT;
    try {
      const raw = localStorage.getItem(AD_CONSENT_STORAGE_KEY);
      consent = parseAdConsent(raw ? JSON.parse(raw) : null);
    } catch {
      // Storage unavailable. The default denies advertising signals.
    }
    const advertising = mayPersonalise(consent) ? 'granted' : 'denied';

    window.dataLayer = window.dataLayer ?? [];
    const gtag: (...args: GtagArgs) => void = (...args) => { window.dataLayer?.push(args); };
    window.gtag = gtag;

    /*
     * Consent defaults are pushed before the tag loads, which is the only
     * ordering Google honours. Measurement itself is first-party counting and
     * is what the privacy page says is on; the advertising signals follow the
     * reader's opt-out.
     */
    gtag('consent', 'default', {
      ad_storage: advertising,
      ad_user_data: advertising,
      ad_personalization: advertising,
      analytics_storage: 'granted',
    });
    gtag('js', new Date());
    // IP anonymisation is the GA4 default; `send_page_view` stays on so the
    // property has traffic without every route re-implementing a pageview.
    gtag('config', measurementId);

    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.async = true;
    script.setAttribute(marker, measurementId);
    script.addEventListener('error', () => script.remove());
    document.head.appendChild(script);
  }, [measurementId]);

  useEffect(() => {
    const forward = (event: Event) => {
      const detail = (event as CustomEvent<AnalyticsEvent>).detail;
      if (!detail || typeof detail.name !== 'string') return;
      try {
        window.gtag?.('event', detail.name, { ...detail.payload });
      } catch {
        // A tag that will not take the event is a tag that is not there.
      }
    };
    window.addEventListener('costanswer:analytics', forward);
    return () => window.removeEventListener('costanswer:analytics', forward);
  }, []);

  return null;
}
