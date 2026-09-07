import { InvestmentCalculator } from '@/components/calculators/money/InvestmentCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('investment');
export const metadata = toolMetadata(tool);

export default function InvestmentPage() {
  return (
    <ToolPage
      tool={tool}
      caution="The return is an assumption you type. It is not a forecast, a guarantee, or a live market quote."
      methodology={[
        { title: 'Projection', body: 'Starting amount plus recurring contributions grow at a constant assumed return. Compounding frequency and contribution timing are explicit.' },
        { title: 'Zero-contribution fixture', body: 'Annual compounding of $10,000 at 7% for 10 years with no contributions is $10,000 × 1.07^10 ≈ $19,671.51.' },
        { title: 'Not Compound Interest', body: 'The Compound Interest Calculator is the pure compounding surface. This page is the contribution-aware investment projection.' },
      ]}
    >
      <InvestmentCalculator />
    </ToolPage>
  );
}
