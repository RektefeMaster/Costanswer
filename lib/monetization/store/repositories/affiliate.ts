/**
 * Affiliate offers, from the database to the page.
 *
 * This file existed as a table and a component with nothing between them: the
 * module always received an empty list, so the whole affiliate channel could
 * never render whatever was configured. Offers are operator-editable rows, so
 * they belong in the database rather than in a compiled constant — that is what
 * section 66 means by "no deploy to disable an offer".
 */
import type { Locale } from '@/lib/i18n/locales';
import type { AffiliateCategoryId } from '../../policy';
import type { AffiliateOffer } from '../../affiliate/types';
import { nowIso, toBoolean, type D1DatabaseLike } from '../d1';

function offerFromRow(row: Record<string, unknown>): AffiliateOffer {
  return {
    offerId: String(row.offer_id),
    merchantId: String(row.merchant_id),
    category: String(row.category) as AffiliateCategoryId,
    locale: String(row.locale) as Locale,
    headline: String(row.headline),
    body: String(row.body),
    cta: String(row.cta),
    destinationUrl: String(row.destination_url),
    enabled: toBoolean(row.enabled),
    commercialWeight: Number(row.commercial_weight ?? 0),
    lastVerifiedAt: row.last_verified_at === null || row.last_verified_at === undefined
      ? undefined
      : String(row.last_verified_at),
  };
}

/**
 * Enabled offers for the categories a page's policy declares.
 *
 * Filtered by category and locale in SQL rather than in the component, so a
 * page never holds an offer it has no reason to show. Relevance and commercial
 * ranking still happen above this — the query only narrows the candidate set.
 */
export async function offersForCategories(
  database: D1DatabaseLike,
  categories: readonly AffiliateCategoryId[],
  locale: Locale,
): Promise<AffiliateOffer[]> {
  if (categories.length === 0) return [];
  const placeholders = categories.map(() => '?').join(',');
  const rows = await database.prepare(`
    SELECT * FROM affiliate_offers
     WHERE enabled = 1 AND locale = ? AND category IN (${placeholders})
     ORDER BY commercial_weight DESC
  `).bind(locale, ...categories).all();
  return rows.results.map(offerFromRow);
}

export async function allAffiliateOffers(database: D1DatabaseLike): Promise<AffiliateOffer[]> {
  const rows = await database.prepare('SELECT * FROM affiliate_offers ORDER BY category ASC').all();
  return rows.results.map(offerFromRow);
}

export async function upsertAffiliateOffer(
  database: D1DatabaseLike,
  offer: AffiliateOffer,
  at: number = Date.now(),
): Promise<void> {
  const timestamp = nowIso(at);
  await database.prepare(`
    INSERT INTO affiliate_offers (
      offer_id, merchant_id, category, locale, headline, body, cta,
      destination_url, enabled, commercial_weight, last_verified_at, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(offer_id) DO UPDATE SET
      merchant_id = excluded.merchant_id, category = excluded.category,
      locale = excluded.locale, headline = excluded.headline, body = excluded.body,
      cta = excluded.cta, destination_url = excluded.destination_url,
      enabled = excluded.enabled, commercial_weight = excluded.commercial_weight,
      last_verified_at = excluded.last_verified_at, updated_at = excluded.updated_at
  `).bind(
    offer.offerId, offer.merchantId, offer.category, offer.locale, offer.headline,
    offer.body, offer.cta, offer.destinationUrl, offer.enabled ? 1 : 0,
    offer.commercialWeight, offer.lastVerifiedAt ?? null, timestamp, timestamp,
  ).run();
}

export async function setAffiliateOfferEnabled(
  database: D1DatabaseLike,
  offerId: string,
  enabled: boolean,
  at: number = Date.now(),
): Promise<void> {
  await database.prepare('UPDATE affiliate_offers SET enabled = ?, updated_at = ? WHERE offer_id = ?')
    .bind(enabled ? 1 : 0, nowIso(at), offerId).run();
}
