import { HsaContributionCalculator } from '@/components/calculators/money/HsaContributionCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { irsHsaLimits, irsHsaSnapshot } from '@/lib/data/irs-hsa';
import { formatMoney } from '@/lib/calculations/contracts';
import { getTool } from '@/lib/tool-registry';
import { localizedToolMetadata } from '@/lib/i18n/metadata';

const tool = getTool('hsa-contribution');
export function generateMetadata() { return localizedToolMetadata(tool); }

const sourceById = (id: string) => {
  const source = irsHsaSnapshot.sources.find((entry) => entry.id === id);
  if (!source) throw new Error(`The HSA snapshot is missing its ${id} source.`);
  return source;
};

export default function HsaContributionPage() {
  const year = irsHsaSnapshot.coverageYear;
  return (
    <ToolPage
      tool={tool}
      sourcePeriods={{ 'irs-hsa-limits': `Calendar year ${year}` }}
      caution="The cap is the IRS figure for the year. Whether you are an eligible individual (HDHP coverage, no disqualifying coverage, not enrolled in Medicare) is a facts-and-circumstances question this page does not decide."
      methodology={[
        {
          title: 'Two published caps, plus a statutory catch-up',
          body: `For ${year}, Rev. Proc. 2025-19 sets ${formatMoney(irsHsaLimits.selfOnlyContribution, 0)} for self-only coverage and ${formatMoney(irsHsaLimits.familyContribution, 0)} for family coverage. The extra ${formatMoney(irsHsaLimits.catchUpAge55, 0)} at age 55 is IRC §223(b)(3). It has never been inflated.`,
        },
        {
          title: 'Months, then the last-month rule',
          body: 'Each month you are eligible on the first day counts as 1/12 of the annual limit, rounded to the nearest dollar. Eligible on 1 December, you may use the full annual amount, but only if you remain eligible through the following 31 December. Failing that testing period recaptures the extra. Medicare enrollment ends eligibility for later months, so enter only the months before it, and do not use the last-month rule after it starts.',
        },
        {
          title: 'The HDHP test is two numbers',
          body: `A ${year} HDHP needs a deductible of at least ${formatMoney(irsHsaLimits.hdhpMinDeductibleSelfOnly, 0)} self-only or ${formatMoney(irsHsaLimits.hdhpMinDeductibleFamily, 0)} family, and an out-of-pocket maximum no higher than ${formatMoney(irsHsaLimits.hdhpMaxOutOfPocketSelfOnly, 0)} or ${formatMoney(irsHsaLimits.hdhpMaxOutOfPocketFamily, 0)}. Premiums are not in that out-of-pocket figure. Both numbers are required before this page will call a plan an HDHP. A bronze plan is not automatically one.`,
        },
        {
          title: 'One cap, every dollar',
          body: 'Employee, employer, and anyone else contributing to the same HSA share the limit. A spouse’s catch-up belongs in the spouse’s own HSA.',
        },
      ]}
      sources={[
        {
          name: sourceById('irs-rp-2025-19').name,
          href: sourceById('irs-rp-2025-19').url,
          detail: sourceById('irs-rp-2025-19').detail,
          dateLabel: `IRB 2025-21 · ${year} amounts`,
        },
        {
          name: sourceById('irs-pub-969').name,
          href: sourceById('irs-pub-969').url,
          detail: sourceById('irs-pub-969').detail,
          dateLabel: `Verified ${irsHsaSnapshot.verifiedAt}`,
        },
      ]}
    >
      <HsaContributionCalculator />
    </ToolPage>
  );
}
