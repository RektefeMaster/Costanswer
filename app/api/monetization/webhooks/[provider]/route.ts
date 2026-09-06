/**
 * Provider callbacks.
 *
 * Three things have to be true before a callback moves money: the signature has
 * to verify with the provider's documented method, the event id has to be one
 * we have not already processed, and the status has to map to something in our
 * own vocabulary. A callback failing any of them is stored as received and
 * unverified rather than acted on, so a spoofed postback cannot create revenue
 * and a genuine one with a changed format is still visible to an operator.
 */
import { createLeadProvider } from '@/lib/monetization/leads/providers/registry';
import { recordProviderEvent } from '@/lib/monetization/store/repositories/deliveries';
import {
  advanceRevenueStatus, findRevenueForDelivery, recordReversal, recordRevenue, setRevenueAmount,
} from '@/lib/monetization/store/repositories/revenue';
import { deliveryForProviderLead } from '@/lib/monetization/store/repositories/deliveries';
import { money } from '@/lib/monetization/money';
import { sha256 } from '@/lib/data/sha256';
import { errorResponse, jsonResponse, PublicError, requireStore, type RouteEnvironment } from '@/lib/monetization/http/request';

const MAX_BODY = 64 * 1024;

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }>; env?: RouteEnvironment },
) {
  try {
    const { provider: providerId } = await context.params;
    const database = requireStore(context.env);

    const payload = await request.text();
    if (payload.length > MAX_BODY) throw new PublicError('Payload too large.', 413);

    let provider;
    try {
      provider = createLeadProvider(providerId);
    } catch {
      throw new PublicError('Unknown provider.', 404);
    }
    if (!provider.handleWebhook) {
      throw new PublicError('This provider has no documented callback format.', 501);
    }

    const event = await provider.handleWebhook(payload, request.headers);

    /*
     * Tie the callback back to the delivery it is about. Without this the
     * ledger cannot tell which lead was confirmed, and a later reversal has
     * nothing to reverse.
     */
    const delivery = event.providerLeadId
      ? await deliveryForProviderLead(database, providerId, event.providerLeadId)
      : null;

    const isNew = await recordProviderEvent(database, {
      providerId,
      providerEventId: event.providerEventId,
      deliveryId: delivery?.deliveryId,
      leadId: delivery?.leadId,
      normalizedEvent: event.normalizedEvent,
      rawStatus: event.rawStatus,
      amountMinor: event.amountMinor,
      currency: event.currency,
      signatureVerified: event.signatureVerified,
      payloadDigest: sha256(payload),
    });

    // A replay is a success, not an error: the provider is entitled to retry
    // and must not be told something went wrong. It simply does nothing again.
    if (!isNew) return jsonResponse({ ok: true, duplicate: true });

    // An unverified callback is recorded and stops there. Acting on one is how
    // a stranger who guesses a delivery id creates a payment.
    if (!event.signatureVerified) {
      return jsonResponse({ ok: true, acted: false, reason: 'signature_unverified' }, 202);
    }

    const existing = delivery ? await findRevenueForDelivery(database, delivery.deliveryId) : null;

    if (event.normalizedEvent === 'lead_billable' || event.normalizedEvent === 'lead_paid') {
      const next = event.normalizedEvent === 'lead_paid' ? 'paid' : 'confirmed';
      if (existing) {
        // Same money, further along — not a second payment. The estimate booked
        // when the buyer accepted becomes the confirmed figure.
        if (event.amountMinor !== undefined) {
          await setRevenueAmount(database, existing.entryId, event.amountMinor);
        }
        if (existing.status !== next) await advanceRevenueStatus(database, existing.entryId, next);
      } else {
        // No delivery matched, so there is nothing to advance. Book it against
        // the provider event id, which the unique index makes replay-safe.
        await recordRevenue(database, {
          sourceType: 'lead',
          providerId,
          providerReference: event.providerEventId,
          amount: money(event.amountMinor ?? 0, 'USD'),
          status: next,
          isTest: providerId === 'mock',
          occurredAt: new Date().toISOString(),
        });
      }
    }

    if (event.normalizedEvent === 'lead_reversed' && existing) {
      // A signed opposite row, not an edit: the statement shows both events.
      await recordReversal(database, existing.entryId);
    }

    return jsonResponse({ ok: true, acted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
