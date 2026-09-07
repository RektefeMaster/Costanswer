/**
 * Finish deliveries that an earlier request could not.
 *
 * Called on a schedule. This exists because a lead is money and a promise, and
 * neither should depend on one HTTP request surviving long enough to complete a
 * provider round trip. A Worker evicted mid-submission leaves a durable row
 * with a `next_attempt_at`, and this picks it up.
 *
 * Admin-authenticated rather than public: it is cheap to call and expensive to
 * run, which is a denial-of-service shape if left open.
 */
import { deliver } from '@/lib/monetization/leads/service';
import { dueDeliveries } from '@/lib/monetization/store/repositories/deliveries';
import { purgeExpiredIdempotencyKeys } from '@/lib/monetization/store/repositories/idempotency';
import { purgeExpiredContacts } from '@/lib/monetization/store/repositories/leads';
import { purgeExpiredConsentEvidence } from '@/lib/monetization/store/repositories/consents';
import {
  assertAdmin, errorResponse, jsonResponse, requirePepper, requireStore, type RouteEnvironment,
} from '@/lib/monetization/http/request';
import { integrationConfig } from '@/lib/integration-config';

const BATCH = 25;

export async function POST(request: Request, context?: { env?: RouteEnvironment }) {
  try {
    assertAdmin(request, context?.env);
    const database = requireStore(context?.env);
    const pepper = requirePepper(context?.env);
    const now = Date.now();

    const due = await dueDeliveries(database, BATCH, now);
    const results: Array<{ deliveryId: string; status: string }> = [];

    for (const delivery of due) {
      try {
        const outcome = await deliver(database, {
          leadId: delivery.leadId,
          campaignId: delivery.campaignId,
          config: {
            hashPepper: pepper,
            privacyPolicyVersion: integrationConfig.policyVersion ?? '1',
            termsVersion: integrationConfig.policyVersion ?? '1',
          },
          now,
        });
        results.push({ deliveryId: delivery.deliveryId, status: outcome.status });
      } catch (error) {
        // One bad row must not stop the batch. The reason is recorded against
        // the delivery by the service; here it only stops the loop unwinding.
        results.push({
          deliveryId: delivery.deliveryId,
          status: error instanceof Error ? `error:${error.message.slice(0, 120)}` : 'error',
        });
      }
    }

    // Retention runs on the same schedule. A retention policy that depends on
    // somebody remembering to run it is not a retention policy.
    const purged = {
      contacts: await purgeExpiredContacts(database, now),
      consentEvidence: await purgeExpiredConsentEvidence(database, now),
      idempotencyKeys: await purgeExpiredIdempotencyKeys(database, now),
    };

    return jsonResponse({ ok: true, processed: results.length, results, purged });
  } catch (error) {
    return errorResponse(error);
  }
}
