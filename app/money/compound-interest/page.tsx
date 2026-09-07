import { CompoundInterestCalculator } from '@/components/calculators/money/CompoundInterestCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('compound-interest');
export const metadata = toolMetadata(tool);

export default function CompoundInterestPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is a savings-growth estimate. It is not a bank quote, investment advice, or an APY from a specific account."
      methodology={[
        { title: 'Compounding', body: 'Interest is added at the compounding frequency you choose. More frequent compounding grows a little faster at the same nominal rate.' },
        { title: 'Contributions', body: 'Recurring deposits are added at the end of each contribution period, after interest for a matching compounding step. That assumption is visible under What we assumed.' },
        { title: 'What is left out', body: 'Taxes, account fees, and inflation are not included. A 0% rate just adds your deposits to the starting amount.' },
      ]}
      sources={[
        { name: 'Investor.gov', detail: 'The SEC’s compound interest explainer and calculator notes.', href: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator', dateLabel: 'Official guidance' },
      ]}
    >
      <CompoundInterestCalculator />
    </ToolPage>
  );
}
