import { SelfEmploymentTaxCalculator } from '@/components/calculators/money/SelfEmploymentTaxCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('self-employment-tax');
export const metadata = toolMetadata(tool);

const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.sourceStatus,
  publishedAt: taxSnapshot.fica.selfEmploymentPublishedAt,
  verifiedAt: taxSnapshot.verifiedAt,
});

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function SelfEmploymentTaxPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is Schedule SE tax, not income tax on the profit. A filed return rounds each line to whole dollars."
      methodology={[
        {
          title: 'Net profit is not the tax base',
          body: `If net profit is above $0, Schedule SE multiplies it by 92.35% before charging tax. That factor is the deductible employer-equivalent half of FICA coming out first. Below ${money(taxSnapshot.fica.selfEmploymentMinimumNetEarnings)} of net earnings after that factor, the form is not filed and the tax is $0.`,
        },
        {
          title: 'Social Security shares a wage base with W-2 wages',
          body: `Social Security on self-employment is 12.4% of net earnings, but only up to the ${money(taxSnapshot.fica.socialSecurityWageBase)} wage base minus Social Security wages already reported on Form W-2. Medicare is 2.9% of all net earnings. Those rates are twice the employee FICA rates in the snapshot, which is how the form is written.`,
        },
        {
          title: 'Additional Medicare Tax is a different form',
          body: 'Form 8959 charges 0.9% once combined Medicare wages and net SE earnings pass the filing-status threshold. That amount is not on Schedule SE and is not included in the deductible one-half.',
        },
        {
          title: 'What is left out',
          body: 'Church employee income, the farm and nonfarm optional methods, ministers and Form 4361, and QBI are not modelled. Income tax on the profit is a separate calculation.',
        },
      ]}
      sources={[
        {
          name: 'Internal Revenue Service',
          detail: `${taxSnapshot.fica.selfEmploymentSourceName}. Wage base from ${taxSnapshot.fica.sourceName}. Snapshot ${taxSnapshot.snapshotId}.`,
          href: taxSnapshot.fica.selfEmploymentSourceUrl,
          dateLabel: taxSource.line,
        },
      ]}
    >
      <SelfEmploymentTaxCalculator />
    </ToolPage>
  );
}
