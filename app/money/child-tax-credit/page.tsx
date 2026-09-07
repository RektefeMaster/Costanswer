import { ChildTaxCreditCalculator } from '@/components/calculators/money/ChildTaxCreditCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('child-tax-credit');
export const metadata = toolMetadata(tool);

const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.federalCredits.sourceStatus,
  publishedAt: taxSnapshot.federalCredits.publishedAt,
  verifiedAt: taxSnapshot.federalCredits.verifiedAt,
});

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function ChildTaxCreditPage() {
  const ctc = taxSnapshot.federalCredits.childTaxCredit;

  return (
    <ToolPage
      tool={tool}
      caution="The 2026 Schedule 8812 used for the phase-out worksheet is still a draft marked not for filing."
      methodology={[
        {
          title: 'A credit per child, then a phase-out',
          body: `Each qualifying child under 17 is ${money(ctc.maxPerQualifyingChild)}. Other dependents are ${money(ctc.otherDependentCredit)} and that piece is not refundable. Combined MAGI above ${money(ctc.phaseOutThresholdMarriedFilingJointly)} on a joint return, or ${money(ctc.phaseOutThresholdOtherStatuses)} otherwise, reduces the total by 5% of the excess rounded up to the next ${money(ctc.phaseOutRoundUpTo)}.`,
        },
        {
          title: 'What can be refunded',
          body: `Tax limits the nonrefundable amount. Unused child tax credit can come back as the additional child tax credit, capped at ${money(ctc.refundablePerQualifyingChild)} per child and at 15% of earned income over ${money(ctc.additionalChildTaxCreditEarnedIncomeFloor)}.`,
        },
        {
          title: 'What is left out',
          body: 'Part II-B of Schedule 8812 can raise the additional child tax credit for some filers with three or more children by counting withheld Social Security and Medicare. Form 2555 filers cannot take the additional credit. Neither rule is applied here.',
        },
      ]}
      sources={[
        {
          name: 'Internal Revenue Service',
          detail: `${taxSnapshot.federalCredits.sourceName} §4.05 for the ${money(ctc.maxPerQualifyingChild)} maximum and ${money(ctc.refundablePerQualifyingChild)} refundable cap. Phase-out worksheet from the 2026 Schedule 8812 draft. Snapshot ${taxSnapshot.snapshotId}.`,
          href: taxSnapshot.federalCredits.sourceUrl,
          dateLabel: taxSource.line,
        },
      ]}
    >
      <ChildTaxCreditCalculator />
    </ToolPage>
  );
}
