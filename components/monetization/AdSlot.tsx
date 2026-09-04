import { integrationConfig } from '@/lib/integration-config';

export const AD_PLACEMENTS = ['header-leaderboard', 'desktop-rail', 'in-content'] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

function adSlotLabel(placement: AdPlacement): string {
  switch (placement) {
    case 'header-leaderboard':
      return 'Reserved leaderboard advertising space';
    case 'desktop-rail':
      return 'Reserved sidebar advertising space';
    case 'in-content':
      return 'Reserved in-content advertising space';
    default: {
      const exhaustive: never = placement;
      throw new Error(`Unhandled ad placement: ${exhaustive}`);
    }
  }
}

export function AdSlot({ placement }: { placement: AdPlacement }) {
  const advertisingEnabled = integrationConfig.advertisingEnabled;
  const status = advertisingEnabled ? 'reserved' : 'empty';

  return (
    <div
      className={`ad-slot ad-slot-${placement}`}
      data-ad-placement={placement}
      data-ad-status={status}
      aria-label={adSlotLabel(placement)}
    />
  );
}
