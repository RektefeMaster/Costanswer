import { EitcCalculator } from '@/components/calculators/money/EitcCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('eitc');
export const metadata = toolMetadata(tool);

const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.federalCredits.sourceStatus,
  publishedAt: taxSnapshot.federalCredits.publishedAt,
  verifiedAt: taxSnapshot.federalCredits.verifiedAt,
});

export default function EitcPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This uses the Revenue Procedure amounts, not the IRS $50 lookup tables, and it does not test age or residency."
      methodology={[
        {
          title: 'The credit rises, plateaus, then falls',
          body: 'Earned income builds the credit up to a published maximum. The same maximum then phases out against the larger of AGI and earned income. A joint return gets a higher phase-out threshold than every other status.',
        },
        {
          title: 'Investment income can wipe it out',
          body: `For ${taxSnapshot.taxYear}, the credit is not allowed if certain investment income is over $${taxSnapshot.federalCredits.earnedIncomeCredit.investmentIncomeLimit.toLocaleString('en-US')}. That is a cliff, not a phase-out.`,
        },
        {
          title: 'What this page does not check',
          body: 'A credit with no qualifying children also requires the filer to be at least 25 and under 65. Qualifying children have relationship, age, residency and joint-return tests. Married filing separately has a narrow separated-spouse exception. None of those tests are applied here.',
        },
      ]}
      sources={[
        {
          name: 'Internal Revenue Service',
          detail: `${taxSnapshot.federalCredits.sourceName} §4.06, earned income credit amounts for tax year ${taxSnapshot.taxYear}. Snapshot ${taxSnapshot.snapshotId}.`,
          href: taxSnapshot.federalCredits.sourceUrl,
          dateLabel: taxSource.line,
        },
      ]}
    >
      <EitcCalculator />
    </ToolPage>
  );
}
