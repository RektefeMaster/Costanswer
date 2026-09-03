import { DebtPayoffCalculator } from '@/components/calculators/DebtPayoffCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('debt-payoff');
export const metadata = toolMetadata(tool);

export default function DebtPayoffPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This compares two payoff orders on the debts you type. It is not credit advice, and the rates are not APR quotes from a lender."
      methodology={[
        { title: 'Snowball vs avalanche', body: 'Snowball pays the smallest remaining balance first. Avalanche pays the highest interest rate first. Ties keep your original list order.' },
        { title: 'The monthly budget', body: 'Each month, interest is added first. Every open debt gets its minimum. Leftover money, including minimums freed after a debt is gone, goes to the current target.' },
        { title: 'When it cannot finish', body: 'If the monthly budget never covers the interest, or the plan is still open after 600 months, the calculator stops and says so instead of running forever.' },
      ]}
      sources={[
        { name: 'Consumer Financial Protection Bureau', detail: 'Why paying only the minimum stretches payoff time and interest.', href: 'https://www.consumerfinance.gov/ask-cfpb/how-does-my-credit-card-company-calculate-the-amount-of-interest-i-owe-en-51/', dateLabel: 'Official guidance' },
      ]}
    >
      <DebtPayoffCalculator />
    </ToolPage>
  );
}
