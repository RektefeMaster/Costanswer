import { AffiliateModule } from './AffiliateModule';
import { CallCta } from './CallCta';
import { LeadCta } from './LeadCta';
import type { AffiliateOffer } from '@/lib/monetization/affiliate/types';
import { affiliateForbidden, relevantCategories } from '@/lib/monetization/affiliate/relevance';
import { callCtaModel, liveCallCampaign } from '@/lib/monetization/calls/types';
import type { MonetizationContext } from '@/lib/monetization/context';
import { getMonetizationPolicy } from '@/lib/monetization/policy';
import { resolveFlag, type FlagOverrides } from '@/lib/monetization/flags';

/**
 * The one component a page renders to offer a next step.
 *
 * It decides between "hire someone", "buy the materials", both, or nothing —
 * and nothing is a real outcome that renders no container at all. An empty
 * bordered box labelled "Sponsored" is worse than a page that simply ends after
 * its answer.
 *
 * Everything it can render is downstream of the page's own policy row and the
 * feature flags, both of which default to off. A page that nobody configured
 * gets nothing from this, forever, which is the correct default at 101
 * calculators.
 */
export function NextActionModule({
  context,
  offers = [],
  overrides = {},
  now = new Date(),
}: {
  context: MonetizationContext;
  offers?: readonly AffiliateOffer[];
  overrides?: FlagOverrides;
  now?: Date;
}) {
  const policy = getMonetizationPolicy(context.pageId);

  const leadAllowed = context.leadEligible
    && policy.lead.enabled
    && policy.lead.vertical !== undefined
    && resolveFlag('leads.enabled', process.env, overrides);

  const affiliateAllowed = context.affiliateEligible
    && policy.affiliate.enabled
    && !affiliateForbidden(context)
    && resolveFlag('affiliate.enabled', process.env, overrides)
    && relevantCategories(context).length > 0;

  const callCampaign = leadAllowed && resolveFlag('calls.enabled', process.env, overrides) && policy.lead.vertical
    ? liveCallCampaign({
        vertical: policy.lead.vertical,
        state: context.location?.state,
        asOf: now.toISOString().slice(0, 10),
        at: now,
      })
    : null;

  if (!leadAllowed && !affiliateAllowed) return null;

  return (
    <div className="next-action" data-next-action>
      {leadAllowed && policy.lead.vertical && (
        <>
          <LeadCta
            context={context}
            vertical={policy.lead.vertical}
            known={{
              zip: context.location?.zip,
              size: context.project?.size,
              unit: context.project?.unit,
              qualityTier: context.project?.qualityTier,
            }}
          />
          {callCampaign && <CallCta model={callCtaModel(callCampaign, context.locale)} context={context} />}
        </>
      )}

      {affiliateAllowed && <AffiliateModule context={context} offers={offers} />}
    </div>
  );
}
