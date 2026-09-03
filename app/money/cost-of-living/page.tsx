import { CostOfLivingCalculator } from '@/components/calculators/CostOfLivingCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { acsSnapshot } from '@/lib/data/acs-snapshot';
import { beaRppSnapshot } from '@/lib/data/bea-rpp-snapshot';
import { resolveHudFmrSnapshot, hudLatestPublishedSnapshot } from '@/lib/data/hud-fmr-snapshot';
import { usdaFoodSnapshot } from '@/lib/data/usda-food-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';
import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';

const tool = getTool('cost-of-living');
export const metadata = toolMetadata(tool);

const hudEffective = resolveHudFmrSnapshot(PUBLISHING_SNAPSHOT_DATE);
const hudSource = datasetSourceDisplay({
  datasetId: 'hud-fmr',
  observationPeriod: String(hudEffective.fiscalYear),
  sourceStatus: hudEffective.sourceStatus,
  publishedAt: hudEffective.publishedAt,
  verifiedAt: hudEffective.verifiedAt,
  fetchedAt: hudEffective.fetchedAt,
});
const acsSource = datasetSourceDisplay({
  datasetId: 'census-acs5',
  observationPeriod: acsSnapshot.observationPeriod,
  sourceStatus: acsSnapshot.sourceStatus,
  publishedAt: acsSnapshot.publishedAt,
  verifiedAt: acsSnapshot.verifiedAt,
  fetchedAt: acsSnapshot.fetchedAt,
});
const beaSource = datasetSourceDisplay({
  datasetId: 'bea-rpp',
  observationPeriod: beaRppSnapshot.observationPeriod,
  sourceStatus: beaRppSnapshot.sourceStatus,
  publishedAt: beaRppSnapshot.publishedAt,
  verifiedAt: beaRppSnapshot.verifiedAt,
  fetchedAt: beaRppSnapshot.fetchedAt,
});
const usdaSource = datasetSourceDisplay({
  datasetId: 'usda-food-plans',
  observationPeriod: usdaFoodSnapshot.observationPeriod,
  sourceStatus: usdaFoodSnapshot.sourceStatus,
  publishedAt: usdaFoodSnapshot.publishedAt,
  verifiedAt: usdaFoodSnapshot.verifiedAt,
  fetchedAt: usdaFoodSnapshot.fetchedAt,
});

export default function CostOfLivingPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is an estimated modeled monthly living cost. It is not everything it costs to live in a place, not average asking rent, and not a proprietary cost-of-living score."
      methodology={[
        {
          title: 'Modeled dollars, not a verdict',
          body: 'The headline is the sum of the categories this model actually prices, and only when housing is included. HUD Fair Market Rent, a USDA Food Plan, and optional transportation or extras. If housing cannot be mapped to one HUD area, the result is incomplete and not a comparable cost of living. Healthcare, childcare, restaurants, debt, and most discretionary spending are left out on purpose.',
        },
        {
          title: 'Housing is a gross-rent benchmark',
          body: 'HUD Fair Market Rent is a 40th-percentile gross-rent benchmark for the HUD FMR area, not city limits and not typical listing rent. It already includes most tenant-paid utilities, so this tool does not add a separate household electric bill on top. A manual housing amount is treated the same way: housing plus those utilities.',
        },
        {
          title: 'Food, fuel, and regional prices stay in their lanes',
          body: 'USDA Food Plans are food at home, using official household-size adjustments. They are national unless you choose the Thrifty plan in Alaska or Hawaii. EIA gasoline and electricity are used only for a personal vehicle. BEA Regional Price Parities are shown as context (U.S. = 100) and are not multiplied into HUD, USDA, or EIA dollars. RPP is not an inflation time series.',
        },
      ]}
      sources={[
        {
          name: 'HUD Fair Market Rents',
          detail: `${hudEffective.attribution} Currently effective FY${hudEffective.fiscalYear} (${hudEffective.effectiveFrom} to ${hudEffective.effectiveTo}). Latest published is FY${hudLatestPublishedSnapshot.fiscalYear}. Snapshot ${hudEffective.snapshotId}.`,
          href: hudEffective.sourceDocumentationUrl,
          dateLabel: hudSource.line,
        },
        {
          name: 'USDA Food Plans',
          detail: `${usdaFoodSnapshot.attribution} Snapshot ${usdaFoodSnapshot.snapshotId}.`,
          href: usdaFoodSnapshot.sourceUrl,
          dateLabel: usdaSource.line,
        },
        {
          name: 'BEA Regional Price Parities',
          detail: `${beaRppSnapshot.attribution} Snapshot ${beaRppSnapshot.snapshotId}.`,
          href: 'https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area',
          dateLabel: beaSource.line,
        },
        {
          name: 'Census ACS 5-Year',
          detail: `${acsSnapshot.attribution} Snapshot ${acsSnapshot.snapshotId}. Median household income is regional context, not the user’s salary.`,
          href: 'https://www.census.gov/programs-surveys/acs',
          dateLabel: acsSource.line,
        },
      ]}
    >
      <CostOfLivingCalculator />
    </ToolPage>
  );
}
