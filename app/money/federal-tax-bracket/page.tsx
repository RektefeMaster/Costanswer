import { FederalTaxBracketCalculator } from '@/components/calculators/money/FederalTaxBracketCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('federal-tax-bracket');
export const metadata = toolMetadata(tool);

const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.sourceStatus,
  publishedAt: taxSnapshot.publishedAt,
  verifiedAt: taxSnapshot.verifiedAt,
});

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function FederalTaxBracketPage() {
  const single = taxSnapshot.federal.bracketsByFilingStatus.single;
  const firstBand = single[0];
  const topRate = `${Math.round(single[single.length - 1].rate * 100)}%`;

  return (
    <ToolPage
      tool={tool}
      caution="Your bracket is a rate on your last dollar of taxable income, not on all of it. This page shows federal income tax only."
      methodology={[
        {
          title: 'A bracket is a rate on a slice',
          body: `Taxable income is cut into bands and each band is charged at its own rate — the first ${money(firstBand.notOver ?? 0)} for a single filer at ${Math.round(firstBand.rate * 100)}%, and so on up to ${topRate}. Your bracket is the rate on the final slice. Nothing below it is charged at that rate, which is the whole reason the tax owed is far less than the bracket times your income.`,
        },
        {
          title: 'Before or after the deduction',
          body: `Both readings of "income" are common and they land in different brackets, so the page asks which one you mean rather than guessing. Enter pay before deductions and the ${money(taxSnapshot.federal.standardDeductionByFilingStatus.single)} single standard deduction comes off first; enter taxable income — line 15 of Form 1040 — and it is used as given.`,
        },
        {
          title: 'Income exactly on a threshold',
          body: 'A figure that lands exactly on a band edge sits in the lower band. The dollar at the boundary is charged at the lower rate, so reporting the higher bracket would name a rate that is not charging anything yet.',
        },
        {
          title: 'What is left out',
          body: 'Federal income tax only. Social Security, Medicare, state and local income taxes are not included, and neither are credits, capital gains rates, the alternative minimum tax or itemised deductions. For the share of a whole salary that goes to tax, use the effective tax rate calculator.',
        },
      ]}
      sources={[
        {
          name: 'Internal Revenue Service',
          detail: `${taxSnapshot.federal.sourceName}. Bracket thresholds and standard deduction for tax year ${taxSnapshot.taxYear}, transcribed rather than estimated. Snapshot ${taxSnapshot.snapshotId}.`,
          href: taxSnapshot.federal.sourceUrl,
          dateLabel: taxSource.line,
        },
      ]}
    >
      <FederalTaxBracketCalculator />
    </ToolPage>
  );
}
