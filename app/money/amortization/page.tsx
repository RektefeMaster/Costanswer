import { AmortizationCalculator } from '@/components/calculators/money/AmortizationCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('amortization');
export const metadata = toolMetadata(tool);

export default function AmortizationPage() {
  return (
    <ToolPage
      tool={tool}
      caution="The schedule uses the same payment engine as the Loan Calculator. It is not a new formula and not a lender statement."
      methodology={[
        { title: 'Shared amortization', body: 'Monthly payment, interest, principal, and remaining balance come from one Finance Engine simulation. Extra monthly principal, if entered, shortens the schedule.' },
        { title: 'Table', body: 'The first twelve payments render immediately. The rest stay behind a toggle so a 30-year loan does not dump hundreds of rows on a phone.' },
        { title: 'Loan Calculator stays general', body: 'If you only need the payment, use the Loan Calculator. This page exists for the principal-versus-interest path over time.' },
      ]}
      sources={[
        { name: 'Consumer Financial Protection Bureau', detail: 'Amortization splits each payment between interest and principal.', href: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/', dateLabel: 'Official guidance' },
      ]}
    >
      <AmortizationCalculator />
    </ToolPage>
  );
}
