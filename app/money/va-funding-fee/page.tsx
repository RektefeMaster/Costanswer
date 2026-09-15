import { VaFundingFeeCalculator } from '@/components/calculators/money/VaFundingFeeCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { vaFundingFeeSnapshot } from '@/lib/data/va-funding-fee';
import { getTool } from '@/lib/tool-registry';
import { localizedToolMetadata } from '@/lib/i18n/metadata';

const tool = getTool('va-funding-fee');
export function generateMetadata() { return localizedToolMetadata(tool); }

const source = vaFundingFeeSnapshot.sources[0];

export default function VaFundingFeePage() {
  return (
    <ToolPage
      tool={tool}
      sourcePeriods={{ 'va-funding-fee': `Charts effective ${vaFundingFeeSnapshot.effectiveFrom}` }}
      caution="This is the published fee chart applied to a loan amount you type. It is not a Certificate of Eligibility, not a residual-income test, and not a decision that you are exempt."
      methodology={[
        {
          title: 'The fee is a percentage of the loan',
          body: 'VA’s worked example of a $200,000 house with $10,000 down is a $190,000 loan. First use at 5% down is 1.5% of $190,000, which is $2,850. The percentage is never applied to the purchase price.',
        },
        {
          title: 'Purchase loans step at 5% and 10% down',
          body: 'Under 5% down, first use is 2.15% and subsequent use is 3.3%. At 5% or more both are 1.5%. At 10% or more both are 1.25%. Cash-out does not use those steps: 2.15% first use, 3.3% after.',
        },
        {
          title: 'Financing the fee grows the loan',
          body: 'Paid in cash or financed, the fee is the chart percentage times the loan without the fee included. That is VA Pamphlet 26-7 chapter 8. Financing then adds that same dollar amount to the note. Other closing costs on a purchase cannot be rolled in.',
        },
        {
          title: 'Exemptions are a VA determination',
          body: 'Disability compensation, a DIC surviving spouse, a pre-discharge rating, or a Purple Heart on active duty can zero the fee. Marking the box here does not make it true at closing.',
        },
      ]}
      sources={[
        {
          name: source.name,
          href: source.url,
          detail: `${vaFundingFeeSnapshot.attribution} Snapshot ${vaFundingFeeSnapshot.snapshotId}.`,
          dateLabel: `Effective ${vaFundingFeeSnapshot.effectiveFrom} · page updated ${source.publishedAt ?? vaFundingFeeSnapshot.verifiedAt}`,
        },
      ]}
    >
      <VaFundingFeeCalculator />
    </ToolPage>
  );
}
