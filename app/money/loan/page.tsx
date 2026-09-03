import { LoanCalculator } from '@/components/calculators/LoanCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('loan');
export const metadata = toolMetadata(tool);

export default function LoanPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is a fixed-rate estimate from the numbers you type. It is not a lender quote, and the rate is not APR."
      methodology={[
        { title: 'Fixed monthly payment', body: 'The payment uses the standard amortizing formula. A 0% rate splits the balance evenly across the months.' },
        { title: 'Interest and payoff', body: 'Total interest is what you pay above the original principal. Extra principal, if you enter it, is added every month until the remaining balance is gone.' },
        { title: 'What is left out', body: 'Origination fees, points, insurance, and taxes are not included. APR needs those extras, so this screen does not report APR.' },
      ]}
      sources={[
        { name: 'Consumer Financial Protection Bureau', detail: 'How amortizing payments split principal and interest over the term.', href: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/', dateLabel: 'Official guidance' },
      ]}
    >
      <LoanCalculator />
    </ToolPage>
  );
}
