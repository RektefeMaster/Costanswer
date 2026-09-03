import { AutoLoanCalculator } from '@/components/calculators/FinanceExpansionCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('auto-loan');
export const metadata = toolMetadata(tool);

export default function AutoLoanPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This estimates the loan payment. Insurance, fuel, and the rest of owning the car belong on Car Affordability."
      methodology={[
        { title: 'Payment', body: 'Fixed-rate amortizing principal and interest from the shared Finance Engine. A $24,000 balance at 6% for 60 months is about $463.99 per month.' },
        { title: 'Amount financed', body: 'Enter the financed amount directly, or compose it from price, down payment, trade-in, and taxes/fees.' },
        { title: 'What this is not', body: 'The rate is a nominal annual rate compounded monthly, not a full APR with fees. It is not a dealer quote.' },
      ]}
      sources={[
        { name: 'Consumer Financial Protection Bureau', detail: 'How amortizing auto-loan payments split principal and interest.', href: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/', dateLabel: 'Official guidance' },
      ]}
    >
      <AutoLoanCalculator />
    </ToolPage>
  );
}
