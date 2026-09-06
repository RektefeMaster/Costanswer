import { Disclosure } from './Disclosure';
import { AffiliateOfferLink } from './AffiliateOfferLink';
import { AffiliateOfferImpression } from './AffiliateOfferImpression';
import { categoryLabel, getMerchant, getProductCategory } from '@/lib/monetization/affiliate/catalog';
import { buildAffiliateLink, priceDisplayMode } from '@/lib/monetization/affiliate/links';
import { selectOffers } from '@/lib/monetization/affiliate/commercial';
import { affiliateForbidden, relevantCategories } from '@/lib/monetization/affiliate/relevance';
import type { AffiliateOffer } from '@/lib/monetization/affiliate/types';
import type { MonetizationContext } from '@/lib/monetization/context';
import { UI_STRINGS } from '@/lib/monetization/ui/strings';

/**
 * Materials and tools that follow from what the reader just calculated.
 *
 * Server-rendered, so a page with no linkable merchant ships no client
 * JavaScript for this at all — and returns null rather than an empty box, which
 * is the difference between a restrained module and a hole in the layout.
 */
export function AffiliateModule({
  context,
  offers,
}: {
  context: MonetizationContext;
  offers: readonly AffiliateOffer[];
}) {
  if (affiliateForbidden(context)) return null;

  const categories = relevantCategories(context);
  if (categories.length === 0) return null;

  const selection = selectOffers({ categories, offers, locale: context.locale });
  if (selection.offers.length === 0) return null;

  const { locale } = context;
  const primaryCategory = getProductCategory(categories[0].categoryId);

  return (
    <aside className="affiliate-module" aria-labelledby="diy-module-title" data-placement="after-result">
      <p className="affiliate-kicker">{UI_STRINGS.advertisingLabel[locale]}</p>
      <h2 id="diy-module-title">{UI_STRINGS.diyHeading[locale]}</h2>
      <p className="affiliate-lede">
        {primaryCategory?.description[locale] ?? UI_STRINGS.diyBody[locale]}
      </p>

      <ul className="affiliate-offers">
        {selection.offers.map(({ offer }) => {
          const merchant = getMerchant(offer.merchantId);
          if (!merchant) return null;

          /*
           * Built here, on the server, where the programme credential actually
           * lives. An offer whose link cannot be built renders nothing at all
           * rather than a card with no way out of it.
           */
          const link = buildAffiliateLink(offer, merchant);
          if (!link) return null;

          const label = priceDisplayMode(merchant) === 'check-on-site'
            ? `${UI_STRINGS.checkPrice[locale]} · ${merchant.displayName}`
            : offer.cta;

          return (
            <li key={offer.offerId}>
              <p className="affiliate-category">{categoryLabel(offer.category, locale)}</p>
              <strong>{offer.headline}</strong>
              <p>{offer.body}</p>
              <AffiliateOfferImpression offer={offer} context={context} />
              <AffiliateOfferLink
                href={link.href}
                rel={link.rel}
                label={label}
                merchantName={link.merchantName}
                offerId={offer.offerId}
                merchantId={offer.merchantId}
                category={offer.category}
                context={context}
              />
            </li>
          );
        })}
      </ul>

      {/*
        Only stated when it is true. Saying "order is influenced by
        compensation" on a list that was ordered purely by relevance trains the
        reader to ignore the line on the pages where it matters.
      */}
      {selection.compensationInfluencedOrder && (
        <p className="affiliate-order-note">{UI_STRINGS.paidPlacementNote[locale]}</p>
      )}

      <Disclosure disclosureIds={selection.disclosureIds} locale={locale} />
    </aside>
  );
}
