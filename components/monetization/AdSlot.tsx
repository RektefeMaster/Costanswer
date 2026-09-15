import { AdUnit } from '@/components/monetization/AdUnit';
import { adUnitFor } from '@/lib/monetization/ads/embed';
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
 *
 * **Reserving costs nothing only once advertising exists.** Before a network is
 * approved there is no late arrival to absorb and no layout to protect, so the
 * three `empty` slots on a page were 590px of blank band above and below the
 * answer, plus an empty 600px rail. `status === 'empty'` therefore collapses:
 * the element stays in the tree, carrying its placement, status and consent
 * regime, so it is still findable and still explains itself, and it occupies
 * no space until there is something to hold space for.
 *
 * `data-ad-status` and `data-ad-consent` are in the markup because the failure
 * they describe is silent. A slot that never fills looks identical whether the
 * flag is off, the network is unconfigured, or consent refused it — and this
 * layer has already shipped that exact mystery twice. They make "why are there
 * no ads on this page" a question `curl` can answer.
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
  /*
   * A live network still needs a unit id for *this* placement. Without one the
   * slot stays the reserved box it is today rather than emitting markup with a
   * guessed identifier, which a network reads as an invalid request.
   */
  const unit = provider ? adUnitFor(placement) : null;
  const status = provider ? 'live' : enabled ? 'reserved' : 'empty';

  /*
   * Only a slot that will carry something is announced.
   *
   * `aria-label` on a bare div is prohibited outright — a role-less element has
   * no accessible name to label. But the fix is not to give every slot a
   * landmark either: with advertising off, three named regions per page called
   * "Reserved leaderboard advertising space" is three pieces of furniture a
   * screen-reader user has to walk past to reach a calculator that has no ads
   * in it. An empty slot is a spacer, so it is presentational and silent.
   */
  const announced = status !== 'empty';

  return (
    <div
      className={`ad-slot ad-slot-${placement}`}
      data-ad-placement={placement}
      data-ad-status={status}
      data-ad-network={provider?.networkId}
      data-ad-consent={provider?.consentRequirement}
      data-ad-lazy={spec.lazy ? 'true' : 'false'}
      style={announced ? { minHeight: spec.reservedHeight, maxWidth: spec.reservedWidth } : undefined}
      role={announced ? 'region' : 'presentation'}
      aria-label={announced ? adSlotLabel(placement) : undefined}
    >
      {unit && provider && (
        <AdUnit
          clientId={unit.clientId}
          unitId={unit.unitId}
          consentRequirement={provider.consentRequirement}
          reservedHeight={spec.reservedHeight}
        />
      )}
    </div>
  );
}
