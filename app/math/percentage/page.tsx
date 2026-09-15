import { PercentageCalculator } from '@/components/calculators/math/MathCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { localizedToolMetadata } from '@/lib/i18n/metadata';

const tool = getTool('percentage');
export function generateMetadata() { return localizedToolMetadata(tool); }

export default function PercentagePage() {
  return (
    <ToolPage
      tool={tool}
      caution="Each mode is a different question. Percent change from an old value to a new value lives on its own page."
      methodology={[
        { title: 'X% of Y', body: 'Result = (X ÷ 100) × Y. Example: 15% of 200 is 30.' },
        { title: 'X is what percent of Y', body: 'Result = (X ÷ Y) × 100. A zero baseline is rejected instead of returning Infinity.' },
        { title: 'X is Y% of what', body: 'Result = X ÷ (Y ÷ 100). A zero percent cannot solve for the missing base.' },
      ]}
    >
      <PercentageCalculator />
    </ToolPage>
  );
}
