import { MortgagePayoffCalculator } from '@/components/calculators/MortgagePayoffCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('mortgage-payoff');
export const metadata = toolMetadata(tool);

export default function MortgagePayoffPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Extra principal is modeled on the remaining balance you type. This is not a refinance, recast, or advice to prepay."
      methodology={[
        { title: 'Baseline vs extra', body: 'The remaining payment is derived from current principal, rate, and remaining term with the same amortization primitive as Mortgage Payment. Extra monthly principal is then applied every month.' },
        { title: 'Primary result', body: 'Years and months saved, plus an estimated payoff date when a start date is present. Interest saved is secondary.' },
        { title: 'What is left out', body: 'Taxes, insurance, escrow, lender fees, and one-time extra payments beyond the monthly extra field are not a full payoff strategy engine.' },
      ]}
      sources={[
        { name: 'Consumer Financial Protection Bureau', detail: 'How extra principal can shorten an amortizing mortgage.', href: 'https://www.consumerfinance.gov/ask-cfpb/how-does-paying-more-than-the-monthly-amount-due-affect-my-mortgage-en-268/', dateLabel: 'Official guidance' },
      ]}
    >
      <MortgagePayoffCalculator />
    </ToolPage>
  );
}
