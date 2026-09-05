import { HealthInsuranceCalculator } from '@/components/calculators/HealthInsuranceCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { acaSubsidySnapshot } from '@/lib/data/aca-subsidy';
import { cmsMarketplaceIndex } from '@/lib/data/cms-marketplace-snapshot';
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
      caution={`Premiums are the ${cmsMarketplaceIndex.observationPeriod} plan-year figures filed with CMS for your county, and the credit follows the published federal formula. This does not determine eligibility, enroll you, or prepare Form 8962: the Marketplace decides who qualifies and the IRS reconciles the credit on your return.`}
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
          title: 'Where the benchmark comes from',
          body: `Your ZIP resolves to a county, and the county's Silver plans are ranked at each age CMS publishes to find the second-cheapest. Household premiums add every adult plus the three oldest children under 21, as the federal rating rules require. ${cmsMarketplaceIndex.counties.length.toLocaleString('en-US')} counties across ${cmsMarketplaceIndex.coveredStateCodes.length} HealthCare.gov states are priced; states running their own exchange file separately and are named rather than left blank.`,
        },
        {
          title: 'Ages between the published ones',
          body: 'CMS prints a premium at eight ages. Adult and under-21 rates are checked separately against the federal default age curve, because a county can follow it for one and not the other. Ages in between are scaled from age 21 only where that part of the range conforms; otherwise the nearest published age on the same side of 21 is quoted, and the page says so.',
        },
        {
          title: 'What the 2026 rules changed',
          body: 'The temporary expansion above 400% of the poverty guideline lapsed after 2025, so income above that ceiling receives no credit. Excess advance credits for 2026 also have no repayment cap, which makes reporting income and household changes during the year matter more than it did.',
        },
      ]}
      sources={[
        {
          name: 'CMS · Individual Market Medical Landscape',
          href: cmsMarketplaceIndex.sourceUrl,
          detail: `${cmsMarketplaceIndex.attribution} Premiums, deductibles, and cost-sharing variants for every plan filed in ${cmsMarketplaceIndex.counties.length.toLocaleString('en-US')} counties.`,
          dateLabel: `${cmsMarketplaceIndex.observationPeriod} plan year · ${cmsMarketplaceIndex.coveredStateCodes.length} states`,
        },
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
