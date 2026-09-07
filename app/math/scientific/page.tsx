import { ScientificCalculator } from '@/components/calculators/math/ScientificCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('scientific');
export const metadata = toolMetadata(tool);

export default function ScientificPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Type an expression or use the keypad. Order of operations is standard, and unrecognised input is rejected rather than guessed at."
      methodology={[
        { title: 'What it understands', body: 'Numbers, + − × ÷, powers, parentheses, sqrt, log, ln, sin, cos, tan, abs, factorial, π, and e. Anything else is rejected instead of guessed at.' },
        { title: 'Order of operations', body: '2 + 3 × 4 = 14. Parentheses change that: (2 + 3) × 4 = 20.' },
        { title: 'Angles and limits', body: 'Trigonometry follows the radians or degrees mode you pick. Factorial stops at 18, and very long or deeply nested expressions are refused rather than run.' },
        { title: 'How it is evaluated', body: 'Expressions are parsed by a purpose-built grammar. JavaScript’s eval and Function are never used, so nothing you type can execute as code.' },
      ]}
    >
      <ScientificCalculator />
    </ToolPage>
  );
}
