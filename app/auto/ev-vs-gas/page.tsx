import { EvVsGasCalculator } from '@/components/calculators/EvVsGasCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('ev-vs-gas');
export const metadata = toolMetadata(tool);

export default function EvVsGasPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is an energy comparison, not total cost of ownership. Purchase price, financing, depreciation, insurance, maintenance and public charging can outweigh the energy difference."
      methodology={[
        { title: 'Calculate gallons', body: 'Annual miles divided by MPG gives gallons. Multiplying by the gas price you enter produces annual gasoline cost.' },
        { title: 'Calculate wall energy', body: 'The EV efficiency produces battery kWh. Charging loss is then added to estimate electricity drawn from the wall.' },
        { title: 'Compare like periods', body: 'Both annual energy costs use the same mileage. The difference and break-even gas price are shown without claiming a total ownership result.' },
      ]}
      sources={[
        { name: 'U.S. Energy Information Administration', detail: `${electricitySnapshot.attribution} Snapshot ${electricitySnapshot.snapshotId}.`, href: electricitySnapshot.sourceDocumentationUrl, dateLabel: `Data ${electricitySnapshot.observationPeriod}` },
        { name: 'EIA average retail price note', detail: 'State averages describe delivered electricity in aggregate and are not utility tariffs.', href: 'https://www.eia.gov/tools/faqs/faq.php?id=507&t=5', dateLabel: 'Method note' },
      ]}
    >
      <EvVsGasCalculator rates={electricitySnapshot.states} snapshotId={electricitySnapshot.snapshotId} observationPeriod={electricitySnapshot.observationPeriod} />
    </ToolPage>
  );
}

