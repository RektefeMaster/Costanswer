import { QuarterlyEstimatedTaxCalculator } from '@/components/calculators/money/QuarterlyEstimatedTaxCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('quarterly-estimated-tax');
export const metadata = toolMetadata(tool);

const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.estimatedTax.sourceStatus,
  publishedAt: taxSnapshot.estimatedTax.publishedAt,
  verifiedAt: taxSnapshot.estimatedTax.verifiedAt,
});

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const percent = (rate: number) => `${(rate * 100).toLocaleString('en-US', { maximumFractionDigits: 4 })}%`;
const dueDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export default function QuarterlyEstimatedTaxPage() {
  const rules = taxSnapshot.estimatedTax;

  return (
    <ToolPage
      tool={tool}
      caution="This is the required annual payment split four ways. It is not Form 2210 and it does not compute an underpayment penalty."
      methodology={[
        {
          title: 'The smaller of two safe harbors',
          body: `You generally must pay estimated tax if you expect to owe at least ${money(rules.minimumTaxToOwe)} after withholding and refundable credits, and those payments will be less than the smaller of ${percent(rules.currentYearSafeHarborRate)} of this year's tax or ${percent(rules.priorYearSafeHarborRate)} of last year's tax.`,
        },
        {
          title: 'Higher-income prior year',
          body: `If last year's AGI was more than ${money(rules.highIncomePriorYearAgi)} (${money(rules.highIncomePriorYearAgiMarriedFilingSeparately)} if you will file married separately), the prior-year safe harbor is ${percent(rules.highIncomePriorYearSafeHarborRate)} instead of ${percent(rules.priorYearSafeHarborRate)}.`,
        },
        {
          title: 'Four equal dates',
          body: `Calendar-year installments are due ${rules.dueDates.map((row) => dueDate(row.dueOn)).join('; ')}. The last installment is not required if you file by February 1 and pay the balance with the return. Farming and fishing may use 66⅔% instead of 90%; that substitution is not applied here.`,
        },
      ]}
      sources={[
        {
          name: 'Internal Revenue Service',
          detail: `${rules.sourceName}. Snapshot ${taxSnapshot.snapshotId}.`,
          href: rules.sourceUrl,
          dateLabel: taxSource.line,
        },
      ]}
    >
      <QuarterlyEstimatedTaxCalculator />
    </ToolPage>
  );
}
