import { affiliateSlotForTool, AFFILIATE_PLACEMENT } from '@/lib/affiliates';

export function AffiliateOffers({ toolId }: { toolId: string }) {
  const slot = affiliateSlotForTool(toolId);
  if (!slot.enabled) return null;

  const liveOffers = slot.offers.filter((offer) => offer.href);
  if (liveOffers.length === 0) return null;

  return (
    <aside
      className="affiliate-slot"
      data-affiliate-slot={AFFILIATE_PLACEMENT}
      data-affiliate-status="live"
      aria-label="Partner offers"
    >
      <p className="affiliate-kicker">Advertising</p>
      <p className="affiliate-disclosure">{slot.disclosure}</p>
      <ul className="affiliate-offers">
        {liveOffers.map((offer) => (
          <li key={offer.id}>
            <p className="affiliate-partner">{offer.partnerName}</p>
            <p className="affiliate-category">{offer.categoryLabel}</p>
            <strong>{offer.headline}</strong>
            <p>{offer.body}</p>
            <a href={offer.href} rel="sponsored nofollow noopener noreferrer" target="_blank">
              {offer.cta}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
