import { EvVsGasCalculator } from '@/components/calculators/EvVsGasCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('ev-vs-gas');
export const metadata = toolMetadata(tool);
const electricitySource = datasetSourceDisplay({
  datasetId: 'eia-electricity',
  observationPeriod: electricitySnapshot.observationPeriod,
  sourceStatus: electricitySnapshot.sourceStatus,
  publishedAt: electricitySnapshot.publishedAt,
  verifiedAt: electricitySnapshot.verifiedAt,
  fetchedAt: electricitySnapshot.fetchedAt,
});

export default function EvVsGasPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is driving energy, not the full cost of owning a car. The sticker price, insurance, and upkeep can matter more than fuel."
      methodology={[
        { title: 'Yearly gallons', body: 'Miles divided by MPG gives gallons. Times the pump price you enter gives yearly gasoline cost.' },
        { title: 'Electricity at the wall', body: 'EV efficiency is battery energy. Charging loss is added to estimate what you pull from the wall.' },
        { title: 'Same miles for both', body: 'Both yearly costs use the same miles. We show the difference and a break even gas price. That is not the full cost of owning a car.' },
      ]}
      sources={[
        { name: 'U.S. Energy Information Administration', detail: `${electricitySnapshot.attribution} Snapshot ${electricitySnapshot.snapshotId}.`, href: electricitySnapshot.sourceDocumentationUrl, dateLabel: electricitySource.line },
        { name: 'EIA average retail price note', detail: 'State averages describe delivered electricity overall. They are not your utility rate.', href: 'https://www.eia.gov/tools/faqs/faq.php?id=507&t=5', dateLabel: 'Method note' },
      ]}
    >
      <EvVsGasCalculator rates={electricitySnapshot.states} snapshotId={electricitySnapshot.snapshotId} observationPeriod={electricitySnapshot.observationPeriod} />
    </ToolPage>
  );
}

