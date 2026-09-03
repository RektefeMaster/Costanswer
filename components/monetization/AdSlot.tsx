import { integrationConfig } from '@/lib/integration-config';

type AdSlotProps = {
  placement: 'after-result' | 'in-content' | 'desktop-rail';
};

export function AdSlot({ placement }: AdSlotProps) {
  const advertisingEnabled = integrationConfig.advertisingEnabled;
  return (
    <div
      className={`ad-slot ad-slot-${placement}`}
      data-ad-placement={placement}
      data-ad-status={advertisingEnabled ? 'reserved' : 'empty'}
      {...(advertisingEnabled
        ? { 'aria-label': 'Reserved advertising space' }
        : { 'aria-hidden': true })}
    >
      {advertisingEnabled ? <span>Advertising space</span> : null}
    </div>
  );
}
