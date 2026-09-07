import { InflationCalculator } from '@/components/calculators/money/InflationCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { cpiSnapshot } from '@/lib/data/cpi-snapshot';
import { cpiPeriodBounds } from '@/lib/data/bls-cpi';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('inflation');
export const metadata = toolMetadata(tool);
const bounds = cpiPeriodBounds(cpiSnapshot.observations);
const cpiSource = datasetSourceDisplay({
  datasetId: 'bls-cpi',
  observationPeriod: cpiSnapshot.observationPeriod,
  sourceStatus: cpiSnapshot.sourceStatus,
  publishedAt: cpiSnapshot.publishedAt,
  verifiedAt: cpiSnapshot.verifiedAt,
  fetchedAt: cpiSnapshot.fetchedAt,
});

export default function InflationPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is the average urban price level, not your grocery bill or a raise. BLS can revise a recent month."
      methodology={[
        { title: 'Same index, two months', body: 'The calculator looks up CPI-U all items for the starting month and the ending month. Months BLS did not publish, such as October 2025, are left off the list.' },
        { title: 'Scale the dollars', body: 'Amount × ending index ÷ starting index is the equivalent buying power. Either month can be first.' },
        { title: 'What it is not', body: 'It is not a wage COLA, a tax bracket, or a Social Security adjustment. Those use different rules.' },
      ]}
      sources={[
        {
          name: 'U.S. Bureau of Labor Statistics',
          detail: `${cpiSnapshot.attribution} Snapshot ${cpiSnapshot.snapshotId}.`,
          href: cpiSnapshot.sourceDocumentationUrl,
          dateLabel: cpiSource.line,
        },
        {
          name: 'BLS inflation calculator method',
          detail: 'The official CPI-U all-items approach this tool follows.',
          href: 'https://www.bls.gov/data/inflation_calculator.htm',
          dateLabel: 'Method note',
        },
      ]}
    >
      <InflationCalculator
        observations={cpiSnapshot.observations}
        snapshotId={cpiSnapshot.snapshotId}
        observationPeriod={cpiSnapshot.observationPeriod}
        years={bounds.years}
      />
    </ToolPage>
  );
}
