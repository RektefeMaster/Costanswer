import { MarketplacePlansCalculator } from '@/components/calculators/MarketplacePlansCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { cmsMarketplaceIndex } from '@/lib/data/cms-marketplace-snapshot';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('marketplace-plans');
export const metadata = toolMetadata(tool);

export default function MarketplacePlansPage() {
  return (
    <ToolPage
      tool={tool}
      caution={`These are the ${cmsMarketplaceIndex.observationPeriod} premiums, deductibles, and out-of-pocket maximums filed with CMS for your county. They are not a quote, they do not confirm a plan is open to you, and they say nothing about which doctors or medicines a plan covers.`}
      methodology={[
        {
          title: 'Priced where premiums are actually filed',
          body: `Premiums are filed by county, so a ZIP is resolved to its county and every plan at each metal level is ranked to find the cheapest. Household premiums add each adult plus the three oldest children under 21, as the federal rating rules require. ${cmsMarketplaceIndex.counties.length.toLocaleString('en-US')} counties across ${cmsMarketplaceIndex.coveredStateCodes.length} HealthCare.gov states are covered; a state running its own exchange is named rather than shown as empty.`,
        },
        {
          title: 'Three scenarios, not one',
          body: 'A premium comparison only answers the healthy-year question. A year with no claims costs the premium. The worst year adds the whole individual out-of-pocket maximum, which is the ceiling a plan may not exceed for covered in-network care. The middle figure caps the care you enter at that same ceiling.',
        },
        {
          title: 'What the middle scenario deliberately does not do',
          body: 'It does not model a deductible then coinsurance then a maximum. The published file carries deductibles and out-of-pocket maximums but not the coinsurance rates or covered-service splits that would be needed, so the care you enter is capped rather than run through an invented schedule.',
        },
        {
          title: 'A credit is dollars, not a percentage',
          body: 'A premium tax credit is a fixed monthly amount. It comes off every metal level alike and is floored at that level’s own premium, so a plan cheaper than the credit costs nothing rather than paying out. That is why a credit narrows the gap between levels rather than scaling it.',
        },
      ]}
      sources={[
        {
          name: 'CMS · Individual Market Medical Landscape',
          href: cmsMarketplaceIndex.sourceUrl,
          detail: `${cmsMarketplaceIndex.attribution} Premiums at eight published ages, deductibles, and out-of-pocket maximums for every plan filed in each county.`,
          dateLabel: `${cmsMarketplaceIndex.observationPeriod} plan year · ${cmsMarketplaceIndex.counties.length.toLocaleString('en-US')} counties`,
        },
        {
          name: 'CMS · Marketplace public use files',
          href: cmsMarketplaceIndex.sourceDocumentationUrl,
          detail: 'The landscape file this snapshot is built from, with the record layout CMS publishes alongside it.',
          dateLabel: `Verified ${cmsMarketplaceIndex.verifiedAt.slice(0, 10)}`,
        },
      ]}
    >
      <MarketplacePlansCalculator />
    </ToolPage>
  );
}
