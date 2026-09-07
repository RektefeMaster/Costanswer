/**
 * How a configured network actually gets onto the page.
 *
 * `provider.ts` says which network is approved and what its origins are.
 * Nothing said what to render, so `AdScript` was never imported by anything
 * and `AdSlot` emitted a reserved box with no network markup inside it: with
 * `AD_PROVIDER=adsense` and a real client id set, the site still served zero
 * ads and there was nothing in the HTML to explain why. This module is the
 * missing half — the script URL, and the per-placement unit markup.
 *
 * Two rules hold it to the same posture as the rest of the layer:
 *
 *   - With no network configured every function here returns `null`, so the
 *     HTML is byte-for-byte what the site ships today.
 *   - A placement with no unit id configured stays a reserved empty box. A
 *     network is never handed a slot whose identifier had to be guessed.
 */
import { activeAdProvider, type AdNetworkId, type AdProviderDescriptor } from './provider';
import type { AdPlacement } from './slots';

export type AdEmbed = {
  readonly networkId: AdNetworkId;
  readonly scriptUrl: string;
  readonly clientId: string;
  readonly consentRequirement: AdProviderDescriptor['consentRequirement'];
};

/**
 * AdSense addresses each unit by its own id, issued per placement in the
 * AdSense console. There is no derivable default: an invented `data-ad-slot`
 * is an invalid request, not an empty one, so an unset placement renders no
 * unit at all.
 */
const ADSENSE_SLOT_ENV: Readonly<Record<AdPlacement, string>> = Object.freeze({
  'header-leaderboard': 'ADSENSE_SLOT_HEADER_LEADERBOARD',
  'desktop-rail': 'ADSENSE_SLOT_DESKTOP_RAIL',
  'in-content': 'ADSENSE_SLOT_IN_CONTENT',
  'below-content': 'ADSENSE_SLOT_BELOW_CONTENT',
});

function value(environment: Record<string, string | undefined>, key: string): string | null {
  const raw = environment[key]?.trim();
  return raw && raw.length > 0 ? raw : null;
}

/** The single third-party script this site is allowed to load, or nothing. */
export function adEmbed(
  environment: Record<string, string | undefined> = process.env,
): AdEmbed | null {
  const provider = activeAdProvider(environment);
  if (!provider) return null;

  if (provider.networkId === 'adsense') {
    const clientId = value(environment, 'ADSENSE_CLIENT_ID');
    if (!clientId) return null;
    return {
      networkId: 'adsense',
      scriptUrl: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`,
      clientId,
      consentRequirement: provider.consentRequirement,
    };
  }

  /*
   * Journey and Raptive issue their script host at approval, and neither is
   * reachable to a site with no traffic yet. Guessing a hostname here would
   * put an origin in the CSP that no one has verified, so the honest answer
   * until one of them is approved is that there is no embed.
   */
  return null;
}

export type AdUnit = {
  readonly networkId: AdNetworkId;
  readonly clientId: string;
  readonly unitId: string;
};

/** The unit markup for one placement, or `null` if that placement is unsold. */
export function adUnitFor(
  placement: AdPlacement,
  environment: Record<string, string | undefined> = process.env,
): AdUnit | null {
  const embed = adEmbed(environment);
  if (!embed) return null;
  if (embed.networkId !== 'adsense') return null;
  const unitId = value(environment, ADSENSE_SLOT_ENV[placement]);
  if (!unitId) return null;
  return { networkId: embed.networkId, clientId: embed.clientId, unitId };
}

export const ADSENSE_SLOT_ENV_KEYS = ADSENSE_SLOT_ENV;
