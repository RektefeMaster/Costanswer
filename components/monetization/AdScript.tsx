'use client';

import { useEffect } from 'react';
import type { AdNetworkId } from '@/lib/monetization/ads/provider';
import {
  AD_CONSENT_STORAGE_KEY, DEFAULT_AD_CONSENT, mayLoadAdScript, mayPersonalise,
  parseAdConsent, type ConsentRequirement,
} from '@/lib/monetization/ads/consent';
import { emitMonetizationEvent } from '@/lib/monetization/events';

/**
 * Loads the configured ad network's script, once, after consent allows it.
 *
 * Four properties matter here and each is a way this usually goes wrong:
 *
 *   - It is the only place a third-party script is injected, so "which vendors
 *     run on this site" has one answer that can be read.
 *   - It waits for the consent signal rather than loading and hoping. A script
 *     already running cannot be un-run by a later refusal.
 *   - It is `async` and appended after mount, so it is never in the critical
 *     path of the answer the reader came for.
 *   - It cannot break a calculator. Every failure path here ends in "no ads",
 *     never in an exception that reaches the page.
 */
export function AdScript({
  networkId,
  scriptUrl,
  clientId,
  consentRequirement,
}: {
  networkId: AdNetworkId;
  scriptUrl: string;
  clientId: string;
  consentRequirement: ConsentRequirement;
}) {
  useEffect(() => {
    const marker = `data-costanswer-ad-${networkId}`;
    if (document.querySelector(`script[${marker}]`)) return;

    let consent = DEFAULT_AD_CONSENT;
    try {
      const raw = localStorage.getItem(AD_CONSENT_STORAGE_KEY);
      consent = parseAdConsent(raw ? JSON.parse(raw) : null);
    } catch {
      // Storage unavailable. Falls through to the default, which for a
      // consent-required regime means the script does not load.
    }

    if (!mayLoadAdScript(consentRequirement, consent)) return;

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute(marker, clientId);
    // Contextual-only when personalisation was refused or a sale opt-out is on.
    script.setAttribute('data-npa', mayPersonalise(consent) ? '0' : '1');

    script.addEventListener('load', () => {
      emitMonetizationEvent('ad_slot_rendered', {
        pageId: 'document', locale: 'en-US', vertical: 'general',
        placement: 'in-content', networkId,
      });
    });
    // A network that fails to load is a network that is not there. Nothing on
    // the page depends on it, so there is nothing to recover.
    script.addEventListener('error', () => script.remove());

    document.head.appendChild(script);
  }, [networkId, scriptUrl, clientId, consentRequirement]);

  return null;
}
