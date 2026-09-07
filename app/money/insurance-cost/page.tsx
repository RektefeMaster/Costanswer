import { InsuranceCalculator } from '@/components/calculators/money/InsuranceCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { insuranceSnapshot } from '@/lib/data/insurance-snapshot';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('insurance-cost');
export const metadata = toolMetadata(tool);

export default function InsuranceCostPage() {
  return <ToolPage tool={tool}
    caution={`These are ${insuranceSnapshot.observationPeriod} observations, not today's personal insurance quotes. Use a current policy or quote for a household-specific budget. Coverage limits, deductibles, and catastrophe exposures vary.`}
    methodology={[
      { title: 'Comparable billing periods', body: 'Annual premiums are added and divided by twelve. Monthly entries are multiplied by twelve and six-month entries by two. No billing fees or discounts are invented.' },
      { title: 'The right denominator', body: 'Homeowners uses the HO-3 annual average; renters uses HO-4. Auto uses average expenditure per liability-insured vehicle, multiplied by vehicle count. A user-entered multi-vehicle quote is counted once.' },
      { title: 'Separate uncertainty from arithmetic', body: 'Historical averages remain historical. A budget cushion is an explicit user scenario, not an actuarial prediction interval. One-claim comparisons assume a covered loss within policy limits.' },
    ]}
    sources={[
      { name: 'NAIC · Homeowners Insurance Report', href: insuranceSnapshot.sources.homeowners.sourceUrl, detail: `Published HO-3 and HO-4 averages, with state-specific caveats retained. ${insuranceSnapshot.attribution}`, dateLabel: `${insuranceSnapshot.observationPeriod} observations · ${insuranceSnapshot.sources.homeowners.publicationLabel}` },
      { name: 'NAIC · Auto Insurance Database Report', href: insuranceSnapshot.sources.auto.sourceUrl, detail: 'Average expenditure uses liability-insured car-years. The mix of coverage differs by state and driver.', dateLabel: `${insuranceSnapshot.observationPeriod} observations · ${insuranceSnapshot.sources.auto.publicationLabel}` },
    ]}
  ><InsuranceCalculator /></ToolPage>;
}
