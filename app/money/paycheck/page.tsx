import { PaycheckCalculator } from '@/components/calculators/money/PaycheckCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';

const tool = getTool('paycheck');
export const metadata = toolMetadata(tool);
const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.sourceStatus,
  publishedAt: taxSnapshot.publishedAt,
  verifiedAt: taxSnapshot.verifiedAt,
});

export default function PaycheckPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This splits an annual tax estimate across pay periods. It is not the IRS withholding method your employer uses."
      methodology={[
        { title: 'Same tax engine', body: 'Paycheck uses the Salary After Tax primitives. It does not copy tax math into this screen.' },
        { title: 'Pay frequency', body: 'Monthly, twice a month, every two weeks, weekly, annual, or hourly. Hourly pay reuses the Hourly to Salary engine, then annualizes tax.' },
        { title: 'Not withholding tables', body: 'The first version divides estimated annual liability by the number of pay periods. It does not implement Circular E / Publication 15-T.' },
      ]}
      sources={[
        { name: 'Internal Revenue Service', detail: taxSnapshot.federal.sourceName, href: taxSnapshot.federal.sourceUrl, dateLabel: taxSource.line },
        { name: 'Social Security Administration', detail: taxSnapshot.fica.sourceName, href: taxSnapshot.fica.sourceUrl, dateLabel: `Wage base ${taxSnapshot.fica.socialSecurityWageBase.toLocaleString('en-US')}` },
      ]}
    >
      <PaycheckCalculator />
    </ToolPage>
  );
}
