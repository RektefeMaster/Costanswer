import { BonusTaxCalculator } from '@/components/calculators/BonusTaxCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { DEFAULT_TAX_YEAR } from '@/lib/calculations/tax/version';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('bonus-tax');
export const metadata = toolMetadata(tool);

const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.sourceStatus,
  publishedAt: taxSnapshot.publishedAt,
  verifiedAt: taxSnapshot.verifiedAt,
});

const flat = (rate: number) => `${Math.round(rate * 100)}%`;

export default function BonusTaxPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This estimates what your employer withholds, not what the bonus finally costs you in tax. The two are settled against each other on your return."
      methodology={[
        {
          title: 'Why a bonus looks over-taxed',
          body: `When a bonus is paid separately from regular wages, the IRS lets an employer withhold a flat ${flat(taxSnapshot.supplemental.optionalFlatRate)} instead of using your Form W-4 and the wage tables. That rate has nothing to do with your salary, so someone in a lower bracket sees too much taken and someone in a higher bracket sees too little. Either way it is trued up when you file.`,
        },
        {
          title: 'Above a million dollars',
          body: `Once supplemental wages paid to one person pass ${taxSnapshot.supplemental.mandatoryRateThreshold.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} in a calendar year, the excess must be withheld at ${flat(taxSnapshot.supplemental.mandatoryFlatRate)}, regardless of what your W-4 says. Only the part over the line takes that rate, which is why earlier bonuses in the same year matter.`,
        },
        {
          title: 'FICA and state are not flat',
          body: 'Social Security stops at the yearly wage base and the additional Medicare tax starts at a threshold, so both depend on what you have already been paid this year. State withholding rules for supplemental wages differ by state and are not published as one table, so the state figure here is the extra tax the bonus adds under that state’s annual schedule.',
        },
      ]}
      sources={[
        {
          name: 'Internal Revenue Service',
          detail: `${taxSnapshot.supplemental.sourceName}. Flat ${flat(taxSnapshot.supplemental.optionalFlatRate)} supplemental rate, and ${flat(taxSnapshot.supplemental.mandatoryFlatRate)} above the yearly threshold. Snapshot ${taxSnapshot.snapshotId}.`,
          href: taxSnapshot.supplemental.sourceUrl,
          dateLabel: `Verified ${taxSnapshot.supplemental.verifiedAt.slice(0, 10)}`,
        },
        {
          name: 'Internal Revenue Service',
          detail: `${taxSnapshot.federal.sourceName}, used for the bracket data behind the rest of the tax tools.`,
          href: taxSnapshot.federal.sourceUrl,
          dateLabel: taxSource.line,
        },
        {
          name: 'Social Security Administration',
          detail: `${taxSnapshot.fica.sourceName}. Social Security wage base and rates for ${taxSnapshot.taxYear}.`,
          href: taxSnapshot.fica.sourceUrl,
          dateLabel: `Tax year ${taxSnapshot.taxYear}`,
        },
      ]}
    >
      <BonusTaxCalculator taxYear={DEFAULT_TAX_YEAR} />
    </ToolPage>
  );
}
