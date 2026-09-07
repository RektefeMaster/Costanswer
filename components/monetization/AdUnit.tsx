'use client';

import { useEffect, useRef } from 'react';
import {
  AD_CONSENT_STORAGE_KEY, DEFAULT_AD_CONSENT, mayLoadAdScript,
  parseAdConsent, type ConsentRequirement,
} from '@/lib/monetization/ads/consent';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One AdSense unit inside a slot that has already reserved its box.
 *
 * The `<ins>` is server-rendered so the reserved region is not empty markup
 * waiting on hydration; the push happens once, on mount, and only when consent
 * allows the script to run at all. Pushing for a unit whose script was refused
 * would queue a request that never fires and log an error the operator would
 * read as a broken integration.
 *
 * Every failure path ends in an unfilled box. Nothing here may throw into a
 * calculator page.
 */
export function AdUnit({
  clientId,
  unitId,
  consentRequirement,
  reservedHeight,
}: {
  clientId: string;
  unitId: string;
  consentRequirement: ConsentRequirement;
  reservedHeight: number;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;

    let consent = DEFAULT_AD_CONSENT;
    try {
      const raw = localStorage.getItem(AD_CONSENT_STORAGE_KEY);
      consent = parseAdConsent(raw ? JSON.parse(raw) : null);
    } catch {
      // Storage unavailable. The default is refusal wherever consent is required.
    }
    if (!mayLoadAdScript(consentRequirement, consent)) return;

    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
      pushed.current = true;
    } catch {
      // A network that will not take the unit is a network that is not there.
    }
  }, [consentRequirement, unitId]);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', minHeight: reservedHeight }}
      data-ad-client={clientId}
      data-ad-slot={unitId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
