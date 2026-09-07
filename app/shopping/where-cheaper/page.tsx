import { WhereCheaperCalculator } from '@/components/calculators/shopping/WhereCheaperCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { gasolineSnapshot } from '@/lib/data/gasoline-snapshot';
import { grocerySnapshot } from '@/lib/data/grocery-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('where-cheaper');
export const metadata = toolMetadata(tool);
const electricitySource = datasetSourceDisplay({
  datasetId: 'eia-electricity',
  observationPeriod: electricitySnapshot.observationPeriod,
  sourceStatus: electricitySnapshot.sourceStatus,
  publishedAt: electricitySnapshot.publishedAt,
  verifiedAt: electricitySnapshot.verifiedAt,
  fetchedAt: electricitySnapshot.fetchedAt,
});
const gasolineSource = datasetSourceDisplay({
  datasetId: 'eia-gasoline',
  observationPeriod: gasolineSnapshot.observationPeriod,
  sourceStatus: gasolineSnapshot.sourceStatus,
  publishedAt: gasolineSnapshot.publishedAt,
  verifiedAt: gasolineSnapshot.verifiedAt,
  fetchedAt: gasolineSnapshot.fetchedAt,
});
const grocerySource = datasetSourceDisplay({
  datasetId: 'bls-grocery',
  observationPeriod: grocerySnapshot.observationPeriod,
  sourceStatus: grocerySnapshot.sourceStatus,
  publishedAt: grocerySnapshot.publishedAt,
  verifiedAt: grocerySnapshot.verifiedAt,
  fetchedAt: grocerySnapshot.fetchedAt,
});

export default function WhereCheaperPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Use this to compare places, then check a bill, pump, or receipt for the price you will pay. These are government averages, not store quotes."
      methodology={[
        { title: 'Pick a basket', body: 'Electricity, gasoline, a grocery sample, or home and car energy together. Both states use the same basket.' },
        { title: 'Groceries only where BLS split the country', body: 'The shelf leads with staples that have a regional price this month, so two states can actually differ. National-only prices sit in a separate list; they are not a failed state comparison.' },
        { title: 'This week’s deals are out', body: 'Averages blend regular and advertised prices. They are not a Walmart, Kroger, or Costco circular.' },
      ]}
      sources={[
        { name: 'U.S. Energy Information Administration', detail: `${electricitySnapshot.attribution} Snapshot ${electricitySnapshot.snapshotId}.`, href: electricitySnapshot.sourceDocumentationUrl, dateLabel: electricitySource.line },
        { name: 'EIA weekly retail gasoline', detail: `${gasolineSnapshot.attribution} Snapshot ${gasolineSnapshot.snapshotId}.`, href: gasolineSnapshot.sourceUrl, dateLabel: gasolineSource.line },
        { name: 'U.S. Bureau of Labor Statistics', detail: `${grocerySnapshot.attribution} Snapshot ${grocerySnapshot.snapshotId}.`, href: grocerySnapshot.sourceDocumentationUrl, dateLabel: grocerySource.line },
      ]}
    >
      <WhereCheaperCalculator
        electricity={electricitySnapshot.states}
        electricitySnapshotId={electricitySnapshot.snapshotId}
        electricityPeriod={electricitySnapshot.observationPeriod}
        gasoline={gasolineSnapshot}
        grocery={grocerySnapshot}
      />
    </ToolPage>
  );
}
