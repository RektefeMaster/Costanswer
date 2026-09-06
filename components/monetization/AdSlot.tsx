import { activeAdProvider } from '@/lib/monetization/ads/provider';
import { PLACEMENT_SPECS, type AdPlacement } from '@/lib/monetization/ads/slots';
import { resolveFlag, type FlagOverrides } from '@/lib/monetization/flags';
import { getMonetizationPolicy } from '@/lib/monetization/policy';

export { AD_PLACEMENTS } from '@/lib/monetization/ads/slots';
export type { AdPlacement } from '@/lib/monetization/ads/slots';

function adSlotLabel(placement: AdPlacement): string {
  switch (placement) {
    case 'header-leaderboard': return 'Reserved leaderboard advertising space';
    case 'desktop-rail': return 'Reserved sidebar advertising space';
    case 'in-content': return 'Reserved in-content advertising space';
    case 'below-content': return 'Reserved advertising space below the article';
    default: {
      const exhaustive: never = placement;
      throw new Error(`Unhandled ad placement: ${exhaustive}`);
    }
  }
}

/**
 * A reserved advertising region.
 *
 * Reserves its box whether or not it fills, which is what keeps a network
 * arriving late from pushing the answer down the page. Nothing is loaded here:
 * the slot declares itself, and the provider script — when there is one, and
 * when consent allows it — attaches to the marked element. A calculator page
 * with advertising off renders exactly the same layout with quiet empty space,
 * which is what makes the ads-off state a real product rather than a fallback.
 *
 * The `pageId` gate matters: a restricted page renders no slot at all, so a
 * body-fat estimate never carries advertising even if every flag is on.
 */
export function AdSlot({
  placement,
  pageId,
  overrides = {},
}: {
  placement: AdPlacement;
  pageId?: string;
  overrides?: FlagOverrides;
}) {
  if (pageId && !getMonetizationPolicy(pageId).ads.enabled) return null;

  const spec = PLACEMENT_SPECS[placement];
  const enabled = resolveFlag('ads.enabled', process.env, overrides);
  const provider = enabled ? activeAdProvider() : null;

  return (
    <div
      className={`ad-slot ad-slot-${placement}`}
      data-ad-placement={placement}
      data-ad-status={provider ? 'live' : enabled ? 'reserved' : 'empty'}
      data-ad-network={provider?.networkId}
      data-ad-lazy={spec.lazy ? 'true' : 'false'}
      style={{ minHeight: spec.reservedHeight, maxWidth: spec.reservedWidth }}
      /*
       * `aria-label` on a bare div is prohibited — a role-less element has no
       * accessible name to label, and axe flags it as a serious violation. The
       * region role gives the label something to attach to and tells a screen
       * reader this is a landmark it may skip, which is exactly what an ad slot
       * is to someone reading with one.
       */
      role="region"
      aria-label={adSlotLabel(placement)}
    />
  );
}
