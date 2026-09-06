/**
 * Step one of the lead form: is there anywhere legitimate for this to go?
 *
 * Takes a ZIP and a service. Takes no contact details, by design — the whole
 * point of a separate coverage step is that a person is never asked for a phone
 * number before we know there is a buyer for their request.
 */
import { coverageRequestSchema } from '@/lib/monetization/leads/schema';
import { checkCoverage } from '@/lib/monetization/leads/service';
import { getMonetizationPolicy } from '@/lib/monetization/policy';
import { resolveFlag } from '@/lib/monetization/flags';
import { loadFlagOverrides } from '@/lib/monetization/store/repositories/governance';
import { incrementEventCounter } from '@/lib/monetization/store/repositories/revenue';
import {
  assertSameOrigin, clientKey, enforceRateLimit, errorResponse, jsonResponse,
  PublicError, readJson, requirePepper, requireStore, type RouteEnvironment,
} from '@/lib/monetization/http/request';
import { integrationConfig } from '@/lib/integration-config';

export async function POST(request: Request, context?: { env?: RouteEnvironment }) {
  try {
    assertSameOrigin(request);
    const env = context?.env;
    const pepper = requirePepper(env);
    enforceRateLimit('coverage', await clientKey(request, pepper));

    const parsed = coverageRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new PublicError(parsed.error.issues[0]?.message ?? 'Check the ZIP code and try again.');
    }
    const input = parsed.data;

    // The page's own policy decides whether it may ask at all. A coverage check
    // from a page with lead capture switched off is not a coverage question, it
    // is a misconfigured client, and it gets nothing.
    const policy = getMonetizationPolicy(input.pageId);
    if (!policy.lead.enabled || !policy.lead.vertical) {
      return jsonResponse({ ok: true, covered: false, requiredFields: [] });
    }

    const database = requireStore(env);
    const overrides = await loadFlagOverrides(database);
    if (!resolveFlag('leads.enabled', process.env, overrides)) {
      return jsonResponse({ ok: true, covered: false, requiredFields: [] });
    }

    const outcome = await checkCoverage(database, {
      vertical: policy.lead.vertical,
      zip: input.zip,
    }, {
      hashPepper: pepper,
      privacyPolicyVersion: integrationConfig.policyVersion ?? '1',
      termsVersion: integrationConfig.policyVersion ?? '1',
    });

    await incrementEventCounter(database, {
      eventName: outcome.covered ? 'lead_coverage_available' : 'lead_coverage_unavailable',
      pageId: input.pageId,
      vertical: policy.vertical,
      locale: input.locale,
    });

    return jsonResponse({
      ok: true,
      covered: outcome.covered,
      partnerName: outcome.partnerName,
      requiredFields: outcome.requiredFields,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
