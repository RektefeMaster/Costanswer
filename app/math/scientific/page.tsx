import { ScientificCalculator } from '@/components/calculators/MathCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('scientific');
export const metadata = toolMetadata(tool);

export default function ScientificPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This parser never runs JavaScript. Unknown names, oversized expressions, and unbounded factorials are rejected."
      methodology={[
        { title: 'Safe grammar', body: 'A recursive-descent parser tokenizes numbers, + − × ÷, powers, parentheses, sqrt/log/ln/sin/cos/tan/abs, π, and e. eval and Function are not used.' },
        { title: 'Order of operations', body: '2 + 3 × 4 = 14. Parentheses change that: (2 + 3) × 4 = 20.' },
        { title: 'Angles and bounds', body: 'Trigonometry follows the selected radians or degrees mode. Factorial stops at 18. Expression length and nesting are capped.' },
      ]}
    >
      <ScientificCalculator />
    </ToolPage>
  );
}
