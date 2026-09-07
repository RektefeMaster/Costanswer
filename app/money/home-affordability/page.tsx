import { HomeAffordabilityCalculator } from '@/components/calculators/money/HomeAffordabilityCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { mortgageRateSnapshot } from '@/lib/data/mortgage-rate-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('home-affordability');
export const metadata = toolMetadata(tool);
const mortgageSource = datasetSourceDisplay({
  datasetId: 'freddie-mac-pmms',
  observationPeriod: mortgageRateSnapshot.observationPeriod,
  sourceStatus: mortgageRateSnapshot.sourceStatus,
  publishedAt: mortgageRateSnapshot.publishedAt,
  verifiedAt: mortgageRateSnapshot.verifiedAt,
  fetchedAt: mortgageRateSnapshot.fetchedAt,
});

export default function HomeAffordabilityPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is a planning screen on take-home pay, not a lender approval. Credit, local taxes, insurance, and the quote you actually get can move the answer a long way."
      methodology={[
        {
          title: 'Modeled monthly housing cost',
          body: 'Principal and interest use the same fixed-rate formula as the mortgage-payment tool. Property tax, insurance, and HOA are only what you type, so leaving them blank leaves them out of the total rather than making them zero. PMI is an optional flat 0.5% of the loan per year when the down payment is under 20%. Repairs use the yearly percent you enter, defaulting to 1% of the price.',
        },
        {
          title: 'Comfortable, stretch, risky',
          body: 'Comfortable keeps housing at or under 25% of take-home, housing plus the debts you listed at or under 33%, and at least 20% left after housing, debts, and other expenses. Stretch still fits 32% housing and 40% debts. Above that, or if leftover cash is too thin, the screen is Risky. These caps are for take-home pay. They are stricter than the classic 28/36 rules, which use gross pay.',
        },
        {
          title: 'Stress cases and the path back',
          body: 'The shock lines reprice the same loan at +1 rate point, raise typed property tax 15%, spend $8,000 from a 6-month essential-cost reserve, and cut take-home 20%. The comfortable home price is the inverse of the same payment math. A suggested price cut or extra down payment is the smallest whole-dollar change that lands back in the comfortable band.',
        },
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
          detail: 'How mortgage payments, DTI, and PMI work. This tool does not apply CFPB’s gross-pay 28/36 rule as a pass/fail.',
          href: 'https://www.consumerfinance.gov/owning-a-home/',
          dateLabel: 'Official guidance',
        },
      ]}
    >
      <HomeAffordabilityCalculator
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
