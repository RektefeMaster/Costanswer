import { FractionCalculator } from '@/components/calculators/MathCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('fraction');
export const metadata = toolMetadata(tool);

export default function FractionPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Primary arithmetic stays in integer numerator and denominator form. The decimal is a display of that exact result."
      methodology={[
        { title: 'Exact integers', body: 'Fractions are BigInt pairs, simplified with GCD. 1/2 + 1/3 = 5/6, not a rounded float guessed back into a fraction.' },
        { title: 'Operations', body: 'Add, subtract, multiply, divide, and simplify. Mixed numbers and a decimal are shown after the exact result.' },
        { title: 'Invalid input', body: 'A zero denominator is rejected. Parts are bounded so the calculator cannot hang on huge integers.' },
      ]}
    >
      <FractionCalculator />
    </ToolPage>
  );
}
