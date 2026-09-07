import { ApplianceElectricityCalculator } from '@/components/calculators/home/ApplianceElectricityCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('appliance-electricity');
export const metadata = toolMetadata(tool);
const electricitySource = datasetSourceDisplay({
  datasetId: 'eia-electricity',
  observationPeriod: electricitySnapshot.observationPeriod,
  sourceStatus: electricitySnapshot.sourceStatus,
  publishedAt: electricitySnapshot.publishedAt,
  verifiedAt: electricitySnapshot.verifiedAt,
  fetchedAt: electricitySnapshot.fetchedAt,
});

export default function ApplianceElectricityPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Wattage is the number you type or an example starting point, not a lab rating for a specific model. EIA publishes a state average, not your utility rate."
      methodology={[
        { title: 'Turn watts into kWh', body: 'Watts ÷ 1,000 × hours is energy for the hours you run the device that day.' },
        { title: 'A week, then a year', body: 'Days per week sets weekly kWh. A year is 52 of those weeks. Monthly figures are that annual total divided by 12. Daily figures are the annual total divided by 365.' },
        { title: 'Price from EIA or your bill', body: `The default rate is the EIA residential state average for ${electricitySource.periodLabel}. A rate you type replaces it and is labeled as a manual electricity rate.` },
      ]}
      sources={[
        { name: 'U.S. Energy Information Administration', detail: `${electricitySnapshot.attribution} Snapshot ${electricitySnapshot.snapshotId}.`, href: electricitySnapshot.sourceDocumentationUrl, dateLabel: electricitySource.line },
        { name: 'EIA retail price explanation', detail: 'Why published average retail prices are not the rate on your bill.', href: 'https://www.eia.gov/tools/faqs/faq.php?id=507&t=5', dateLabel: 'Method note' },
      ]}
    >
      <ApplianceElectricityCalculator rates={electricitySnapshot.states} snapshotId={electricitySnapshot.snapshotId} observationPeriod={electricitySnapshot.observationPeriod} />
    </ToolPage>
  );
}
