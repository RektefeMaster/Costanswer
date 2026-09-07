import { TaxRefundCalculator } from '@/components/calculators/money/TaxRefundCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('tax-refund');
export const metadata = toolMetadata(tool);

const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.sourceStatus,
  publishedAt: taxSnapshot.federal.publishedAt,
  verifiedAt: taxSnapshot.verifiedAt,
});

export default function TaxRefundPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Withholding is the amount already taken out, not a W-4 projection. Publication 15-T tables are not in this snapshot."
      methodology={[
        {
          title: 'Tax from the published schedules',
          body: `Federal income tax uses the ${taxSnapshot.taxYear} ordinary brackets and standard deduction. Self-employment profit is added to wages, then the deductible half of Schedule SE tax comes off as an AGI adjustment. The child tax credit and earned income credit use that AGI, and the same engines as the dedicated pages.`,
        },
        {
          title: 'Payments you actually made',
          body: 'Federal withholding and estimated payments are what you type. The page does not apply Form W-4 or Publication 15-T, because those percentage-method tables have not been transcribed.',
        },
        {
          title: 'What is left out',
          body: 'Itemised deductions, retirement contributions, the alternative minimum tax, education credits, state tax, NIIT, and Additional Medicare Tax on W-2 wages (this page has no box 5 input). Leaving most of those out usually overstates tax. Omitting W-2 Additional Medicare can understate it.',
        },
      ]}
      sources={[
        {
          name: 'Internal Revenue Service',
          detail: `${taxSnapshot.federal.sourceName}, Schedule SE, Schedule 8812 and the EITC amounts in the same snapshot ${taxSnapshot.snapshotId}.`,
          href: taxSnapshot.federal.sourceUrl,
          dateLabel: taxSource.line,
        },
      ]}
    >
      <TaxRefundCalculator />
    </ToolPage>
  );
}
