import { RefinanceCalculator } from '@/components/calculators/RefinanceCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { mortgageRateSnapshot } from '@/lib/data/mortgage-rate-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('refinance');
export const metadata = toolMetadata(tool);

const rateSource = datasetSourceDisplay({
  datasetId: 'freddie-mac-pmms',
  observationPeriod: mortgageRateSnapshot.observationPeriod,
  sourceStatus: mortgageRateSnapshot.sourceStatus,
  publishedAt: mortgageRateSnapshot.publishedAt,
  verifiedAt: mortgageRateSnapshot.verifiedAt,
  fetchedAt: mortgageRateSnapshot.fetchedAt,
});

export default function RefinancePage() {
  return (
    <ToolPage
      tool={tool}
      caution="This compares two loans on principal and interest. Whether you qualify, and what a lender actually charges, only a loan estimate can tell you."
      methodology={[
        {
          title: 'The payment you are on now',
          body: 'You know your balance, not what you originally borrowed, so the current payment is reconstructed from the balance, the rate, the original term, and how many payments you have made. That is the payment the new one is compared against.',
        },
        {
          title: 'Break-even',
          body: 'Closing costs divided by the monthly saving, rounded up to whole months. Rolling the costs into the loan does not avoid them, so break-even still counts the full amount. If the new payment is not lower, there is no break-even and the page says so.',
        },
        {
          title: 'The trade the payment hides',
          body: 'Restarting a 30-year term lowers the payment even at a similar rate, while adding years of interest. Remaining interest on your current loan is compared with interest plus closing costs on the new one, so a lower payment that costs more overall is visible instead of buried.',
        },
      ]}
      sources={[
        {
          name: 'Freddie Mac',
          detail: `${mortgageRateSnapshot.attribution} Snapshot ${mortgageRateSnapshot.snapshotId}.`,
          href: mortgageRateSnapshot.sourceDocumentationUrl,
          dateLabel: rateSource.line,
        },
      ]}
    >
      <RefinanceCalculator
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
