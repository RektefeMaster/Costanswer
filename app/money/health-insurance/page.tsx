import { HealthInsuranceCalculator } from '@/components/calculators/HealthInsuranceCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { acaSubsidySnapshot } from '@/lib/data/aca-subsidy';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('health-insurance');
export const metadata = toolMetadata(tool);

const sourceById = (id: string) => {
  const source = acaSubsidySnapshot.sources.find((entry) => entry.id === id);
  if (!source) throw new Error(`The ACA snapshot is missing its ${id} source.`);
  return source;
};

export default function HealthInsurancePage() {
  return (
    <ToolPage
      tool={tool}
      caution="This applies the published federal formula to numbers you supply. It does not determine eligibility, enroll you, or prepare Form 8962. The Marketplace decides who qualifies, and the IRS reconciles the credit on your return."
      methodology={[
        {
          title: 'Income measured against the right year',
          body: `2026 coverage is measured against the ${acaSubsidySnapshot.povertyGuidelineYear} poverty guidelines, the ones in effect when annual enrollment opened. Alaska and Hawaii have their own guidelines. Household size adds one increment per additional person in the tax household.`,
        },
        {
          title: 'The contribution percentage is interpolated, not bracketed',
          body: 'The IRS table gives a starting and ending percentage for each income band. Your percentage is placed proportionally inside your band using unrounded income, which is why a small income change moves the credit smoothly rather than in steps.',
        },
        {
          title: 'The benchmark sizes the credit; your plan receives it',
          body: 'The credit is the second-lowest-cost Silver premium minus your expected contribution, never below zero, and never more than the credit-eligible premium you are actually enrolled in. It is then subtracted from the plan you chose, which may cost more or less than the benchmark.',
        },
        {
          title: 'What the 2026 rules changed',
          body: 'The temporary expansion above 400% of the poverty guideline lapsed after 2025, so income above that ceiling receives no credit. Excess advance credits for 2026 also have no repayment cap, which makes reporting income and household changes during the year matter more than it did.',
        },
      ]}
      sources={[
        {
          name: 'IRS · Revenue Procedure 2025-25',
          href: sourceById('irs-contribution-table').url,
          detail: sourceById('irs-contribution-table').detail,
          dateLabel: `Published ${sourceById('irs-contribution-table').publishedAt} · ${acaSubsidySnapshot.coverageYear} coverage`,
        },
        {
          name: 'HHS · 2025 poverty guidelines',
          href: sourceById('hhs-poverty-guidelines').url,
          detail: sourceById('hhs-poverty-guidelines').detail,
          dateLabel: `Federal Register, published ${sourceById('hhs-poverty-guidelines').publishedAt}`,
        },
        {
          name: 'IRS · Premium Tax Credit questions and answers',
          href: sourceById('irs-eligibility-and-formula').url,
          detail: sourceById('irs-eligibility-and-formula').detail,
          dateLabel: `Verified ${acaSubsidySnapshot.verifiedAt}`,
        },
        {
          name: 'IRS · Premium Tax Credit overview',
          href: sourceById('irs-income-exceptions').url,
          detail: sourceById('irs-income-exceptions').detail,
          dateLabel: `Verified ${acaSubsidySnapshot.verifiedAt}`,
        },
      ]}
    >
      <HealthInsuranceCalculator />
    </ToolPage>
  );
}
