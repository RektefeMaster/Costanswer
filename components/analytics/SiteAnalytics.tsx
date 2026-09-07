import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { ga4MeasurementId } from '@/lib/analytics-provider';
import { integrationConfig } from '@/lib/integration-config';

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
  return <GoogleAnalytics measurementId={measurementId} />;
}
