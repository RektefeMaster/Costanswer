import { ElectricityCostCalculator } from '@/components/calculators/ElectricityCostCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('electricity-cost');
export const metadata = toolMetadata(tool);

export default function ElectricityCostPage() {
  return (
    <ToolPage
      tool={tool}
      caution="EIA publishes state average retail prices, not your utility tariff. Use the rate from your own bill whenever you need a personal estimate."
      methodology={[
        { title: 'Start with monthly kWh', body: 'Your usage is the strongest personal input. It is multiplied by a cents-per-kWh benchmark and converted to dollars.' },
        { title: 'Use a state benchmark carefully', body: `The default is the EIA residential state average for ${electricitySnapshot.observationPeriod}. It includes delivered electricity costs in aggregate but is not an individual rate.` },
        { title: 'Keep the override visible', body: 'A manual rate replaces the benchmark without hiding the source. Fixed charges, tiers and time-of-use pricing stay outside the estimate.' },
      ]}
      sources={[
        { name: 'U.S. Energy Information Administration', detail: `${electricitySnapshot.attribution} Snapshot ${electricitySnapshot.snapshotId}.`, href: electricitySnapshot.sourceDocumentationUrl, dateLabel: `Data ${electricitySnapshot.observationPeriod}` },
        { name: 'EIA retail price explanation', detail: 'Why published average retail prices are not utility rates or tariffs.', href: 'https://www.eia.gov/tools/faqs/faq.php?id=507&t=5', dateLabel: 'Method note' },
      ]}
    >
      <ElectricityCostCalculator rates={electricitySnapshot.states} snapshotId={electricitySnapshot.snapshotId} observationPeriod={electricitySnapshot.observationPeriod} />
    </ToolPage>
  );
}

