import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { ga4MeasurementId } from '@/lib/analytics-provider';
import { integrationConfig } from '@/lib/integration-config';
import { siteConsentRequirement } from '@/lib/monetization/ads/provider';

/**
 * The one place a measurement vendor can enter the document.
 *
 * Two gates, both of which must pass. `integrationConfig.analyticsEnabled` is
 * the product switch, and it already refuses to turn on without a dated privacy
 * policy, a public contact address and a policy version. A measurement id is
 * the configuration. Missing either renders nothing, which is the state the
 * site ships in and the state the privacy page describes.
 */
export function SiteAnalytics() {
  if (!integrationConfig.analyticsEnabled) return null;
  const measurementId = ga4MeasurementId();
  if (!measurementId) return null;
  /*
   * Consent-mode defaults follow the same regime as the ad script, so the two
   * cannot disagree about the same reader.
   */
  return (
    <GoogleAnalytics
      measurementId={measurementId}
      consentRequirement={siteConsentRequirement()}
    />
  );
}
