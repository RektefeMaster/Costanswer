import { AdScript } from '@/components/monetization/AdScript';
import { adEmbed } from '@/lib/monetization/ads/embed';
import { resolveFlag } from '@/lib/monetization/flags';

/**
 * The one place a third-party advertising script can enter the document.
 *
 * Server-side, so the decision is made where the environment is readable and
 * the browser is never sent a decision it has to re-derive. With no network
 * configured — the state the site ships in — this renders `null` and the
 * document is unchanged, which is what keeps "advertising off" a real product
 * rather than a fallback.
 *
 * Consent is still the client's call: `AdScript` reads the stored signal
 * before it appends anything, so a page can render this and still load no
 * script at all.
 */
export function AdvertisingScript() {
  if (!resolveFlag('ads.enabled', process.env)) return null;
  const embed = adEmbed();
  if (!embed) return null;
  return (
    <AdScript
      networkId={embed.networkId}
      scriptUrl={embed.scriptUrl}
      clientId={embed.clientId}
      consentRequirement={embed.consentRequirement}
    />
  );
}
