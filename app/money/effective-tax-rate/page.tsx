import { EffectiveTaxRateCalculator } from '@/components/calculators/money/EffectiveTaxRateCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('effective-tax-rate');
export const metadata = toolMetadata(tool);

const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.sourceStatus,
  publishedAt: taxSnapshot.publishedAt,
  verifiedAt: taxSnapshot.verifiedAt,
});

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function EffectiveTaxRatePage() {
  const singleDeduction = taxSnapshot.federal.standardDeductionByFilingStatus.single;

  return (
    <ToolPage
      tool={tool}
      caution="This is a rate on wage income under this year's published schedules. It is not what a filed return will say once credits, other income and itemised deductions are in play."
      methodology={[
        {
          title: 'Effective rate is measured against gross pay',
          body: `Total tax divided by gross pay, not by taxable income. Dividing by taxable income gives a higher number — the ${money(singleDeduction)} standard deduction has already come out of it — and it is not what people mean when they ask what share of their pay goes to tax.`,
        },
        {
          title: 'The bracket is a rate on your last dollar',
          body: 'Your federal bracket is read from the rate schedule for your filing status, using taxable income. It applies to the slice of income inside that band and nothing below it, which is the whole reason the effective rate comes out lower. The gap between the two is stated on the page rather than left to be noticed.',
        },
        {
          title: 'The next $1,000 is measured, not assumed',
          body: 'The rate on additional pay is found by running the entire calculation again a thousand dollars higher and taking the difference. That is slower than reading a bracket off a table, and it is the most reliable general method over a combined federal, payroll and state engine — states that phase a credit out, subtract federal tax, or switch schedules have no single published marginal rate to read. It is an effective marginal rate across that $1,000, not an instantaneous one: where the interval crosses a boundary such as the Social Security wage base, the figure is the weighted average of both sides. That is the right answer to what happens to your next $1,000, and it is deliberately not labelled a statutory marginal rate.',
        },
        {
          title: 'What is left out',
          body: 'Credits, itemised deductions, retirement contributions, self-employment tax and income other than wages are not modelled. Local income taxes are named where a state has them but never estimated. Where a state schedule in this snapshot is a year behind, the page says so.',
        },
      ]}
      sources={[
        {
          name: 'Internal Revenue Service',
          detail: `${taxSnapshot.federal.sourceName}. Brackets and the ${money(singleDeduction)} single standard deduction for ${taxSnapshot.taxYear}. Snapshot ${taxSnapshot.snapshotId}.`,
          href: taxSnapshot.federal.sourceUrl,
          dateLabel: taxSource.line,
        },
        {
          name: 'Social Security Administration',
          detail: `${taxSnapshot.fica.sourceName}. The Social Security wage base and Medicare rates behind the FICA share of the effective rate.`,
          href: taxSnapshot.fica.sourceUrl,
          dateLabel: `Verified ${taxSnapshot.fica.verifiedAt.slice(0, 10)}`,
        },
        {
          name: 'State revenue agencies',
          detail: `State wage tax schedules for all 51 jurisdictions, each transcribed from that state's own publication and named on the result.`,
          href: 'https://www.taxadmin.org/state-tax-agencies',
          dateLabel: `Verified ${taxSnapshot.verifiedAt.slice(0, 10)}`,
        },
      ]}
    >
      <EffectiveTaxRateCalculator />
    </ToolPage>
  );
}
