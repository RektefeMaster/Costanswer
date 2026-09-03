import { SalaryAfterTaxCalculator } from '@/components/calculators/SalaryAfterTaxCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';

const tool = getTool('salary-after-tax');
export const metadata = toolMetadata(tool);
const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.sourceStatus,
  publishedAt: taxSnapshot.publishedAt,
  verifiedAt: taxSnapshot.verifiedAt,
});

export default function SalaryAfterTaxPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is an estimate of annual tax liability, not a prepared return. Credits, itemized deductions, and local taxes are left out."
      methodology={[
        { title: 'Federal income tax', body: 'Gross wages minus the IRS standard deduction for the filing status you choose, then the published federal brackets for that tax year.' },
        { title: 'FICA', body: 'Employee Social Security up to the SSA wage base, Medicare on all wages, and Additional Medicare Tax above the IRS filing-status threshold.' },
        { title: 'State income tax', body: 'A verified state schedule is used when this snapshot includes one. Otherwise the state line is omitted and the result is marked federal-only.' },
      ]}
      sources={[
        { name: 'Internal Revenue Service', detail: taxSnapshot.federal.sourceName, href: taxSnapshot.federal.sourceUrl, dateLabel: taxSource.line },
        { name: 'Social Security Administration', detail: taxSnapshot.fica.sourceName, href: taxSnapshot.fica.sourceUrl, dateLabel: `Wage base ${taxSnapshot.fica.socialSecurityWageBase.toLocaleString('en-US')}` },
      ]}
    >
      <SalaryAfterTaxCalculator />
    </ToolPage>
  );
}
