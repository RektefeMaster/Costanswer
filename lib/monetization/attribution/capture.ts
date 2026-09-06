'use client';

/**
 * Capturing attribution in the browser, without a cookie.
 *
 * `sessionStorage` rather than a cookie or `localStorage`: it is per-origin and
 * per-tab, it is never attached to a request automatically, and it is gone when
 * the tab closes. That keeps the privacy page's "no tracking cookies" promise
 * literally true while still answering "which traffic produces revenue".
 *
 * Captured once per tab, on the first page of the visit, because the landing
 * page and referrer of a session are properties of its first page — overwriting
 * them on every navigation would record the last internal page instead.
 */
import { classifyReferrer, type Attribution } from './types';

const KEY = 'costanswer:attribution';

function readStore(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    // Private mode, storage disabled, or a quota error. Attribution is a
    // business nicety; nothing about the product may depend on it.
    return null;
  }
}

function randomSessionId(): string {
  try {
    return crypto.randomUUID().replaceAll('-', '').slice(0, 24);
  } catch {
    return `s${Date.now().toString(36)}`;
  }
}

/** Capture on first load of a tab, then return the same record for the rest of it. */
export function captureAttribution(): Attribution {
  if (typeof window === 'undefined') return {};

  const existing = readStore();
  if (existing) return existing;

  let captured: Attribution = {};
  try {
    const url = new URL(window.location.href);
    const utmMedium = url.searchParams.get('utm_medium') ?? undefined;
    const referrer = classifyReferrer(document.referrer || undefined, url.hostname, utmMedium);

    captured = {
      landingPath: url.pathname,
      referrerCategory: referrer.category,
      referrerHost: referrer.host,
      utmSource: url.searchParams.get('utm_source') ?? undefined,
      utmMedium,
      utmCampaign: url.searchParams.get('utm_campaign') ?? undefined,
      sessionId: randomSessionId(),
    };
    sessionStorage.setItem(KEY, JSON.stringify(captured));
  } catch {
    return {};
  }

  return captured;
}

/** Read what was captured, without capturing. Safe to call anywhere. */
export function currentAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  return readStore() ?? {};
}
