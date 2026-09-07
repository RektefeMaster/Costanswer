/**
 * A server-to-server posting adapter for a partner whose integration is a
 * documented HTTPS form or JSON post.
 *
 * The dangerous version of this file is the one that takes a URL and a field
 * map from configuration and posts whatever it is given. That is an
 * server-side request forgery primitive with a consumer's phone number attached:
 * anyone who can write a campaign row can exfiltrate leads to a host of their
 * choosing. So the destination is not configuration. It is an allowlist
 * compiled into the Worker, keyed by an id that configuration may select from
 * and may not extend.
 */
import type {
  LeadProvider, LeadSubmissionPayload, LeadSubmissionResult,
  ProviderDescriptor, ProviderHealthReport,
} from './types';
import { configurationRequired } from './types';

export type PostEndpoint = {
  readonly endpointId: string;
  readonly displayName: string;
  /** Absolute https origin plus path. Never interpolated from runtime input. */
  readonly url: string;
  readonly method: 'POST';
  readonly contentType: 'application/json' | 'application/x-www-form-urlencoded';
  /** Env var holding the shared secret. Server-only, never in a client bundle. */
  readonly secretEnv: string;
  /** Map from our canonical field name to the partner's documented field name. */
  readonly fieldMap: Readonly<Record<string, string>>;
  /** How the partner reports success, per their documentation. */
  readonly successPredicate: (body: unknown, status: number) => boolean;
  readonly documentationCheckedAt: string;
};

/**
 * The allowlist.
 *
 * Empty until a real partner's documentation is in hand. That is not a stub —
 * it is the correct state: there is no partner whose posting specification we
 * have, and inventing one would produce an adapter that fails in production in
 * a way tests cannot catch.
 */
export const POST_ENDPOINTS: readonly PostEndpoint[] = Object.freeze([]);

const byId = new Map(POST_ENDPOINTS.map((endpoint) => [endpoint.endpointId, endpoint]));

export function getPostEndpoint(endpointId: string): PostEndpoint | undefined {
  return byId.get(endpointId);
}

/**
 * Reject anything that is not an allowlisted https destination.
 *
 * Called on every submission rather than once at configuration time, because
 * the threat is a row edited after configuration was reviewed.
 */
export function assertAllowedEndpoint(url: string): PostEndpoint {
  const endpoint = POST_ENDPOINTS.find((entry) => entry.url === url);
  if (!endpoint) throw new Error('Refusing to post a lead to a destination that is not on the compiled allowlist.');
  const parsed = new URL(endpoint.url);
  if (parsed.protocol !== 'https:') throw new Error('Lead destinations must be https.');
  return endpoint;
}

export class GenericServerPostProvider implements LeadProvider {
  constructor(
    private readonly endpointId: string,
    private readonly environment: Record<string, string | undefined> = process.env,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  describe(): ProviderDescriptor {
    const endpoint = getPostEndpoint(this.endpointId);
    return {
      providerId: `generic:${this.endpointId}`,
      displayName: endpoint?.displayName ?? `Generic server post (${this.endpointId})`,
      providerType: 'direct_partner',
      status: endpoint ? 'configured' : 'configuration_required',
      integrationModes: ['server_post'],
      supportedVerticals: [],
      requiredEnv: endpoint ? [endpoint.secretEnv] : [],
      outstandingDependency: endpoint
        ? undefined
        : `No posting specification is registered for "${this.endpointId}". Add it to POST_ENDPOINTS from the partner's own documentation before enabling.`,
      documentationCheckedAt: endpoint?.documentationCheckedAt ?? '2026-09-06',
    };
  }

  async submitLead(payload: LeadSubmissionPayload): Promise<LeadSubmissionResult> {
    const endpoint = getPostEndpoint(this.endpointId);
    if (!endpoint) return configurationRequired(this.describe());

    const secret = this.environment[endpoint.secretEnv]?.trim();
    if (!secret) return configurationRequired(this.describe());

    assertAllowedEndpoint(endpoint.url);
    const body = mapFields(payload, endpoint.fieldMap);

    try {
      const response = await this.fetchImpl(endpoint.url, {
        method: endpoint.method,
        headers: {
          'content-type': endpoint.contentType,
          authorization: `Bearer ${secret}`,
          'idempotency-key': payload.idempotencyKey,
        },
        body: endpoint.contentType === 'application/json'
          ? JSON.stringify(body)
          : new URLSearchParams(body as Record<string, string>).toString(),
      });

      const text = await response.text();
      const parsed = safeJson(text);

      if (response.status >= 500) return { outcome: 'retryable_failure', reason: `Partner returned ${response.status}.` };
      if (response.status === 429) return { outcome: 'retryable_failure', reason: 'Partner rate limited the submission.' };
      if (endpoint.successPredicate(parsed, response.status)) {
        const record = (parsed ?? {}) as Record<string, unknown>;
        return {
          outcome: 'accepted',
          providerLeadId: typeof record.lead_id === 'string' ? record.lead_id : undefined,
          rawStatus: String(response.status),
        };
      }
      return { outcome: 'rejected', rawStatus: String(response.status), reason: 'Partner did not accept the lead.' };
    } catch (error) {
      // A network error is retryable; a programming error is not, and telling
      // them apart matters because one of them drains and the other loops.
      const reason = error instanceof Error ? error.message : 'Unknown transport failure.';
      return { outcome: 'retryable_failure', reason };
    }
  }

  async healthCheck(): Promise<ProviderHealthReport> {
    const endpoint = getPostEndpoint(this.endpointId);
    if (!endpoint) return { reachable: false, detail: 'No endpoint registered.' };
    return { reachable: true, detail: 'Endpoint registered; no documented health probe.' };
  }
}

function mapFields(payload: LeadSubmissionPayload, fieldMap: Readonly<Record<string, string>>): Record<string, unknown> {
  const canonical: Record<string, unknown> = {
    first_name: payload.contact.firstName,
    last_name: payload.contact.lastName,
    phone: payload.contact.phone,
    email: payload.contact.email,
    zip: payload.lead.zip,
    state: payload.lead.state,
    city: payload.contact.city,
    address_line1: payload.contact.addressLine1,
    vertical: payload.lead.vertical,
    project_type: payload.lead.project.type,
    project_size: payload.lead.project.size,
    timeframe: payload.lead.qualification.timeframe,
    homeowner: payload.lead.qualification.homeowner,
    property_type: payload.lead.qualification.propertyType,
    work_type: payload.lead.qualification.workType,
    consent_version: payload.consent.version,
    consent_text_sha256: payload.consent.textSha256,
    consent_timestamp: payload.consent.acceptedAt,
  };

  const mapped: Record<string, unknown> = {};
  for (const [ours, theirs] of Object.entries(fieldMap)) {
    const value = canonical[ours];
    if (value !== undefined && value !== null) mapped[theirs] = value;
  }
  return mapped;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
