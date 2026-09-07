import { CapitalGainsCalculator } from '@/components/calculators/money/CapitalGainsCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('capital-gains');
export const metadata = toolMetadata(tool);

const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.federalCredits.sourceStatus,
  publishedAt: taxSnapshot.federalCredits.publishedAt,
  verifiedAt: taxSnapshot.federalCredits.verifiedAt,
});

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function CapitalGainsPage() {
  const ltcg = taxSnapshot.federalCredits.longTermCapitalGains;
  const niit = taxSnapshot.federalCredits.netInvestmentIncomeTax;

  return (
    <ToolPage
      tool={tool}
      caution="Short-term gains are ordinary income. Collectibles and unrecaptured 1250 gain use different rates that this page does not apply."
      methodology={[
        {
          title: 'Gains stack on top of other taxable income',
          body: `The 0% band fills any room left under ${money(ltcg.zeroRateMaxByFilingStatus.single)} for a single filer (the joint ceiling is ${money(ltcg.zeroRateMaxByFilingStatus.marriedFilingJointly)}). The 15% band then runs to ${money(ltcg.fifteenRateMaxByFilingStatus.single)} single / ${money(ltcg.fifteenRateMaxByFilingStatus.marriedFilingJointly)} joint. Anything above that is 20%.`,
        },
        {
          title: 'NIIT is a separate 3.8%',
          body: `The Net Investment Income Tax is ${(niit.rate * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}% of the lesser of net investment income or MAGI over ${money(niit.thresholdByFilingStatus.single)} single / ${money(niit.thresholdByFilingStatus.marriedFilingJointly)} joint. Those thresholds are statutory and are not adjusted for inflation.`,
        },
        {
          title: 'What is left out',
          body: 'The section 121 exclusion on a main home, collectibles taxed at 28%, unrecaptured section 1250 gain at 25%, and netting of capital losses beyond treating the gain figure you enter as already netted.',
        },
      ]}
      sources={[
        {
          name: 'Internal Revenue Service',
          detail: `${taxSnapshot.federalCredits.sourceName} §4.03 for the 0% and 15% ceilings. ${niit.sourceName} for the 3.8% NIIT. Snapshot ${taxSnapshot.snapshotId}.`,
          href: taxSnapshot.federalCredits.sourceUrl,
          dateLabel: taxSource.line,
        },
      ]}
    >
      <CapitalGainsCalculator />
    </ToolPage>
  );
}
