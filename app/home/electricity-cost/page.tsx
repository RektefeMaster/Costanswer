import { ElectricityCostCalculator } from '@/components/calculators/home/ElectricityCostCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('electricity-cost');
export const metadata = toolMetadata(tool);
const electricitySource = datasetSourceDisplay({
  datasetId: 'eia-electricity',
  observationPeriod: electricitySnapshot.observationPeriod,
  sourceStatus: electricitySnapshot.sourceStatus,
  publishedAt: electricitySnapshot.publishedAt,
  verifiedAt: electricitySnapshot.verifiedAt,
  fetchedAt: electricitySnapshot.fetchedAt,
});

export default function ElectricityCostPage() {
  return (
    <ToolPage
      tool={tool}
      caution="EIA publishes a state average, not your utility rate. Type the rate from your bill when you want a number closer to what you pay."
      methodology={[
        { title: 'Start with monthly kWh', body: 'Your usage is multiplied by a cents per kWh rate and turned into dollars.' },
        { title: 'The state average is a starting point', body: `The default is the EIA residential state average for ${electricitySource.periodLabel}. It is a broad average, not your personal rate.` },
        { title: 'Your bill rate, if you type it', body: 'A rate you enter replaces the average. Fixed charges, tiers, and time of use rates are still left out.' },
      ]}
      sources={[
        { name: 'U.S. Energy Information Administration', detail: `${electricitySnapshot.attribution} Snapshot ${electricitySnapshot.snapshotId}.`, href: electricitySnapshot.sourceDocumentationUrl, dateLabel: electricitySource.line },
        { name: 'EIA retail price explanation', detail: 'Why published average retail prices are not the rate on your bill.', href: 'https://www.eia.gov/tools/faqs/faq.php?id=507&t=5', dateLabel: 'Method note' },
      ]}
    >
      <ElectricityCostCalculator rates={electricitySnapshot.states} snapshotId={electricitySnapshot.snapshotId} observationPeriod={electricitySnapshot.observationPeriod} />
    </ToolPage>
  );
}

