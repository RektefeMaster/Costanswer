import { RetirementCalculator } from '@/components/calculators/FinanceExpansionCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('retirement');
export const metadata = toolMetadata(tool);

export default function RetirementPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Under these assumptions only. This is not a readiness verdict, tax plan, or Social Security estimate."
      methodology={[
        { title: 'Accumulation', body: 'Current savings and monthly contributions grow at a constant assumed return until retirement age, using the shared contribution-growth primitive.' },
        { title: 'Goal comparison', body: 'A gap or surplus is the modeled balance minus the goal you typed. It is not a statement that you are on track.' },
        { title: 'What is left out', body: 'Social Security, pensions, healthcare, inflation, and taxes in retirement are not fabricated. 401(k) match and Roth contribution rules live on those dedicated pages.' },
      ]}
    >
      <RetirementCalculator />
    </ToolPage>
  );
}
