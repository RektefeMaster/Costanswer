/**
 * The three lead networks CostAnswer intends to integrate with.
 *
 * Every one of them is `configuration_required`, and that is the accurate
 * status rather than a placeholder. Their posting specifications — endpoint,
 * authentication, field names, status vocabulary, webhook signing — are behind
 * an approved publisher account in all three cases. Writing a plausible-looking
 * adapter from a blog post would produce code that compiles, passes tests
 * against its own invented shape, and fails the first time a real consumer
 * submits a real phone number.
 *
 * So each adapter here is complete except for the request itself: it declares
 * what it needs, refuses to submit without it, and is registered, routable and
 * visible in the admin screen. Connecting one is filling in a documented
 * specification and setting environment variables. It is not an engineering
 * project, which is the point.
 *
 * Public program facts recorded below were the publicly advertised position at
 * the documentation-checked date. They are not contractual and are not used as
 * business assumptions anywhere in the routing logic.
 */
import type {
  LeadProvider, LeadSubmissionResult, ProviderDescriptor, ProviderHealthReport,
} from './types';
import { configurationRequired } from './types';

const CHECKED_AT = '2026-09-06';

abstract class UnconfiguredNetworkProvider implements LeadProvider {
  abstract describe(): ProviderDescriptor;

  // The payload is deliberately ignored: an unconfigured network has nowhere to
  // send it, and the interesting thing about this method is that it refuses.
  async submitLead(): Promise<LeadSubmissionResult> {
    return configurationRequired(this.describe());
  }

  async healthCheck(): Promise<ProviderHealthReport> {
    return { reachable: false, detail: this.describe().outstandingDependency };
  }
}

/**
 * Angi.
 *
 * Publicly advertised partner options at the checked date: referral links,
 * dedicated tracked phone numbers, and lead auctions through an API. Which of
 * those CostAnswer is offered, and the specification for the third, follow
 * account approval.
 */
export class AngiLeadProvider extends UnconfiguredNetworkProvider {
  describe(): ProviderDescriptor {
    return {
      providerId: 'angi',
      displayName: 'Angi',
      providerType: 'lead_network',
      status: 'configuration_required',
      integrationModes: ['referral_link', 'tracked_call', 'api_auction'],
      supportedVerticals: [],
      requiredEnv: ['LEADS_ANGI_API_KEY', 'LEADS_ANGI_ENDPOINT_ID', 'LEADS_ANGI_WEBHOOK_SECRET'],
      outstandingDependency:
        'Angi lead-auction API documentation is account-gated. Needed before enabling: the auction endpoint and authentication scheme, the request field names, the accept/reject status vocabulary, the webhook signing method, and the verticals and geographies on our contract.',
      documentationUrl: 'https://www.angi.com/partner',
      documentationCheckedAt: CHECKED_AT,
    };
  }
}

/**
 * LeadBank.
 *
 * Prepared as a home-services campaign destination. No public integration
 * specification was available at the checked date.
 */
export class LeadBankProvider extends UnconfiguredNetworkProvider {
  describe(): ProviderDescriptor {
    return {
      providerId: 'leadbank',
      displayName: 'LeadBank',
      providerType: 'lead_network',
      status: 'configuration_required',
      integrationModes: [],
      supportedVerticals: [],
      requiredEnv: ['LEADS_LEADBANK_API_KEY', 'LEADS_LEADBANK_ENDPOINT_ID', 'LEADS_LEADBANK_WEBHOOK_SECRET'],
      outstandingDependency:
        'No public posting specification. Needed before enabling: the delivery endpoint and authentication, the required field set per campaign, the response contract, the postback format, and the consent language their campaigns require.',
      documentationCheckedAt: CHECKED_AT,
    };
  }
}

/**
 * Home Services Lead Group.
 *
 * Publicly advertised at the checked date: pay-per-call, pay-per-lead,
 * server-to-server posting and real-time tracking. The posting specification
 * itself follows approval.
 */
export class HomeServicesLeadGroupProvider extends UnconfiguredNetworkProvider {
  describe(): ProviderDescriptor {
    return {
      providerId: 'hslg',
      displayName: 'Home Services Lead Group',
      providerType: 'lead_network',
      status: 'configuration_required',
      integrationModes: ['server_post', 'tracked_call'],
      supportedVerticals: [],
      requiredEnv: ['LEADS_HSLG_API_KEY', 'LEADS_HSLG_ENDPOINT_ID', 'LEADS_HSLG_WEBHOOK_SECRET'],
      outstandingDependency:
        'Server-to-server posting specification is account-gated. Needed before enabling: the post URL and authentication, the field map, the real-time accept/reject response contract, the pay-per-call number provisioning workflow, and the postback signing method.',
      documentationUrl: 'https://homeserviceleadgroup.com/',
      documentationCheckedAt: CHECKED_AT,
    };
  }
}
