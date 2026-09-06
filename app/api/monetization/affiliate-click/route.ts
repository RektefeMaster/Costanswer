/**
 * Outbound affiliate click recording.
 *
 * Called with `navigator.sendBeacon` and answered with 204. The reader's
 * navigation never waits on this and never depends on it succeeding: the link
 * is a real anchor to the merchant, and if this endpoint is down the click
 * still works and we simply do not know about it. That is the correct trade.
 */
import { z } from 'zod';
import { LOCALES } from '@/lib/i18n/locales';
import { MONETIZATION_VERTICALS } from '@/lib/monetization/context';
import { sanitizeAttribution } from '@/lib/monetization/attribution/types';
import { generateId } from '@/lib/monetization/ids';
import { dayBucket, nowIso } from '@/lib/monetization/store/d1';
import { incrementEventCounter } from '@/lib/monetization/store/repositories/revenue';
import {
  assertSameOrigin, clientKey, enforceRateLimit,
  monetizationStoreOrNull, readJson, requirePepper, type RouteEnvironment,
} from '@/lib/monetization/http/request';

const clickSchema = z.object({
  offerId: z.string().min(1).max(80),
  merchantId: z.string().min(1).max(80),
  category: z.string().min(1).max(80),
  pageId: z.string().min(1).max(120),
  calculatorId: z.string().max(120).optional(),
  locale: z.enum(LOCALES),
  vertical: z.enum(MONETIZATION_VERTICALS),
  placement: z.string().min(1).max(40),
  attribution: z.record(z.string(), z.unknown()).optional(),
}).strict();

export async function POST(request: Request, context?: { env?: RouteEnvironment }) {
  try {
    assertSameOrigin(request);
    const env = context?.env;
    const pepper = requirePepper(env);
    enforceRateLimit('click', await clientKey(request, pepper));

    const parsed = clickSchema.safeParse(await readJson(request));
    // A malformed beacon is discarded silently. There is no reader waiting for
    // this response and no useful thing to tell them.
    if (!parsed.success) return new Response(null, { status: 204 });

    const database = monetizationStoreOrNull(env);
    if (!database) return new Response(null, { status: 204 });

    const click = parsed.data;
    await database.prepare(`
      INSERT INTO affiliate_clicks (
        click_id, offer_id, merchant_id, category, page_id, calculator_id,
        locale, vertical, placement, day_bucket, attribution_json, created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      generateId('affiliateClick'), click.offerId, click.merchantId, click.category,
      click.pageId, click.calculatorId ?? null, click.locale, click.vertical,
      click.placement, dayBucket(),
      JSON.stringify(sanitizeAttribution(click.attribution)), nowIso(),
    ).run();

    await incrementEventCounter(database, {
      eventName: 'affiliate_offer_click',
      pageId: click.pageId,
      calculatorId: click.calculatorId,
      vertical: click.vertical,
      locale: click.locale,
      placement: click.placement,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    // Never surface an error here: it would reach a page the reader has already
    // left. Recorded as a normal failure response and nothing more.
    void error;
    return new Response(null, { status: 204 });
  }
}
