import { CreditCardPayoffCalculator } from '@/components/calculators/FinanceExpansionCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('credit-card-payoff');
export const metadata = toolMetadata(tool);

export default function CreditCardPayoffPage() {
  return (
    <ToolPage
      tool={tool}
      caution="One revolving balance. Several debts and avalanche/snowball order belong on the Debt Payoff Calculator."
      methodology={[
        { title: 'Nominal monthly rate', body: 'Each month adds APR ÷ 12 interest, then subtracts the payment. Issuer compounding, grace periods, and penalty APRs are not claimed.' },
        { title: 'Two modes', body: 'Enter a monthly payment to see months and interest, or enter a target payoff time to back into a required payment from the shared amortizing factor.' },
        { title: 'Safety cap', body: 'If the payment is at or below the first month’s interest, or the schedule would run too long, the result stops instead of looping forever.' },
      ]}
      sources={[
        { name: 'Consumer Financial Protection Bureau', detail: 'Paying more than the minimum reduces interest on a credit card.', href: 'https://www.consumerfinance.gov/ask-cfpb/how-can-i-pay-off-my-credit-card-faster-en-1697/', dateLabel: 'Official guidance' },
      ]}
    >
      <CreditCardPayoffCalculator />
    </ToolPage>
  );
}
