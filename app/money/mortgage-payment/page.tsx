import { MortgageCalculator } from '@/components/calculators/money/MortgageCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { mortgageRateSnapshot } from '@/lib/data/mortgage-rate-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('mortgage-payment');
export const metadata = toolMetadata(tool);
const mortgageSource = datasetSourceDisplay({
  datasetId: 'freddie-mac-pmms',
  observationPeriod: mortgageRateSnapshot.observationPeriod,
  sourceStatus: mortgageRateSnapshot.sourceStatus,
  publishedAt: mortgageRateSnapshot.publishedAt,
  verifiedAt: mortgageRateSnapshot.verifiedAt,
  fetchedAt: mortgageRateSnapshot.fetchedAt,
});

export default function MortgagePaymentPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is a national average, not a lender quote. Credit, points, taxes, insurance, and fees can change the payment by a lot."
      methodology={[
        { title: 'Loan amount', body: 'Home price minus the down payment is the amount that is amortized.' },
        { title: 'Fixed monthly P&I', body: 'The payment uses the standard fixed-rate formula. A 0% rate splits the loan evenly across the months.' },
        { title: 'Taxes, insurance, HOA, PMI', body: 'Those lines are only what you type, plus an optional flat PMI estimate when the down payment is under 20%. They are not looked up by ZIP.' },
      ]}
      sources={[
        {
          name: 'Freddie Mac PMMS',
          detail: `${mortgageRateSnapshot.attribution} Snapshot ${mortgageRateSnapshot.snapshotId}.`,
          href: mortgageRateSnapshot.sourceDocumentationUrl,
          dateLabel: mortgageSource.line,
        },
        {
          name: 'Consumer Financial Protection Bureau',
          detail: 'How mortgage payments, escrow, and PMI work, in plain language.',
          href: 'https://www.consumerfinance.gov/owning-a-home/',
          dateLabel: 'Official guidance',
        },
      ]}
    >
      <MortgageCalculator
        rates={{
          snapshotId: mortgageRateSnapshot.snapshotId,
          observationPeriod: mortgageRateSnapshot.observationPeriod,
          thirtyYearFixedPercent: mortgageRateSnapshot.thirtyYearFixedPercent,
          fifteenYearFixedPercent: mortgageRateSnapshot.fifteenYearFixedPercent,
        }}
      />
    </ToolPage>
  );
}
