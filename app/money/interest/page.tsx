import { SimpleInterestCalculator } from '@/components/calculators/FinanceExpansionCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('interest');
export const metadata = toolMetadata(tool);

export default function InterestPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This page is simple interest only. Compounding belongs on the Compound Interest Calculator."
      methodology={[
        { title: 'Simple interest', body: 'Interest = principal × annual rate × time. $10,000 × 5% × 3 years = $1,500 interest and $11,500 total.' },
        { title: 'No compounding', body: 'The balance does not earn interest on interest here. Recurring deposits belong on the Investment Calculator.' },
        { title: 'Rate meaning', body: 'The rate is a nominal annual simple-interest rate, not APY and not a loan APR with fees.' },
      ]}
    >
      <SimpleInterestCalculator />
    </ToolPage>
  );
}
