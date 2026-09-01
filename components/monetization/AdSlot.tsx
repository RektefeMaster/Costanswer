type AdSlotProps = {
  placement: 'after-result' | 'in-content' | 'desktop-rail';
};

export function AdSlot({ placement }: AdSlotProps) {
  return (
    <div className={`ad-slot ad-slot-${placement}`} data-ad-placement={placement} aria-hidden="true">
      <span>Advertisement</span>
    </div>
  );
}

