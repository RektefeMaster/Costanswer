/**
 * Step two: take the submission and hand it to the lead service.
 *
 * The route is thin on purpose. Everything that decides anything —
 * suppression, duplicates, consent, routing, delivery — lives in the service,
 * where it is unit-tested without a request. What is here is the part that only
 * makes sense with a request in hand: origin, rate limit, idempotency key,
 * consent evidence, and turning a disposition into words a person can act on.
 */
import { leadSubmissionSchema } from '@/lib/monetization/leads/schema';
import { submitLead, type LeadServiceConfig } from '@/lib/monetization/leads/service';
import { isValidClientKey, once } from '@/lib/monetization/leads/idempotency';
import { d1IdempotencyStore } from '@/lib/monetization/store/repositories/idempotency';
import { getLeadRequest } from '@/lib/monetization/store/repositories/leads';
import { loadFlagOverrides } from '@/lib/monetization/store/repositories/governance';
import { getMonetizationPolicy } from '@/lib/monetization/policy';
import { resolveFlag } from '@/lib/monetization/flags';
import { pepperedHash } from '@/lib/monetization/hash';
import {
  assertSameOrigin, clientKey, enforceRateLimit, errorResponse, jsonResponse,
  PublicError, readJson, requirePepper, requireStore, type RouteEnvironment,
} from '@/lib/monetization/http/request';
import { integrationConfig } from '@/lib/integration-config';
import type { Locale } from '@/lib/i18n/locales';

/** What the reader is told, per disposition. Nothing here overpromises. */
const MESSAGE: Record<string, Record<Locale, string>> = {
  submitted: {
    'en-US': 'Your request is in. A professional serving your area should be in touch. Nobody has quoted the job yet, and you are not committed to hiring anyone.',
    'es-US': 'Su solicitud fue enviada. Un profesional que atiende su área debería comunicarse con usted. Todavía nadie ha cotizado el trabajo y usted no está obligado a contratar a nadie.',
  },
  pending: {
    'en-US': 'Your request is in and we are still confirming it with our partner. If anything goes wrong we will not pass your details on.',
    'es-US': 'Su solicitud fue enviada y todavía la estamos confirmando con nuestro socio. Si algo sale mal, no compartiremos sus datos.',
  },
  no_route: {
    'en-US': 'We do not currently have a professional matching option for this project in your area. Your CostAnswer estimate is unaffected.',
    'es-US': 'Por ahora no tenemos una opción para conectarlo con profesionales para este proyecto en su área. Su estimado de CostAnswer no cambia.',
  },
  failed: {
    'en-US': 'We could not send your request. Nothing was passed on, and your CostAnswer estimate is unaffected.',
    'es-US': 'No pudimos enviar su solicitud. No se compartió nada y su estimado de CostAnswer no cambia.',
  },
  suppressed: {
    'en-US': 'Your request is in. If you have asked us before to stop using your details, we have honoured that.',
    'es-US': 'Su solicitud fue enviada. Si antes nos pidió que dejáramos de usar sus datos, lo respetamos.',
  },
};

export async function POST(request: Request, context?: { env?: RouteEnvironment }) {
  try {
    assertSameOrigin(request);
    const env = context?.env;
    const pepper = requirePepper(env);
    const caller = await clientKey(request, pepper);
    enforceRateLimit('submit', caller);

    const body = await readJson(request);
    const parsed = leadSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      throw new PublicError(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
    }
    const input = parsed.data;

    const policy = getMonetizationPolicy(input.pageId);
    if (!policy.lead.enabled || policy.lead.vertical !== input.vertical) {
      throw new PublicError('That service is not available from this page.', 400);
    }

    const database = requireStore(env);
    const overrides = await loadFlagOverrides(database);
    if (!resolveFlag('leads.enabled', process.env, overrides)) {
      return jsonResponse({
        ok: true,
        disposition: 'no_route',
        message: MESSAGE.no_route[input.locale as Locale],
      });
    }

    const config: LeadServiceConfig = {
      hashPepper: pepper,
      privacyPolicyVersion: integrationConfig.policyVersion ?? '1',
      termsVersion: integrationConfig.policyVersion ?? '1',
    };

    // Idempotency: the browser sends a key it generated once and reuses on
    // every retry, so a double click and a flaky reconnect produce one lead.
    const headerKey = request.headers.get('idempotency-key');
    const key = isValidClientKey(headerKey) ? headerKey : await pepperedHash(`${caller}:${JSON.stringify(input.contact)}`, pepper);

    const { result } = await once({
      store: d1IdempotencyStore(database),
      scope: 'lead-submit',
      key,
      operation: async () => {
        const outcome = await submitLead(database, input, config, {
          pagePath: new URL(request.url).pathname,
          evidence: {
            ipHash: caller,
            userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? undefined,
          },
        });
        return { id: outcome.leadId, ...outcome };
      },
      load: async (id) => {
        const lead = await getLeadRequest(database, id);
        if (!lead) return null;
        return {
          id,
          leadId: id,
          disposition: lead.status === 'accepted' ? 'submitted' as const
            : lead.status === 'suppressed' ? 'suppressed' as const
            : lead.status === 'failed' ? 'failed' as const : 'pending' as const,
        };
      },
    });

    return jsonResponse({
      ok: true,
      disposition: result.disposition,
      message: MESSAGE[result.disposition]?.[input.locale as Locale] ?? MESSAGE.pending[input.locale as Locale],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
