import { PercentChangeCalculator } from '@/components/calculators/MathCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('percent-change');
export const metadata = toolMetadata(tool);

export default function PercentChangePage() {
  return (
    <ToolPage
      tool={tool}
      caution="Percent change needs a non-zero original value. Increase or decrease is a label, not the headline number."
      methodology={[
        { title: 'Formula', body: '((new − old) ÷ |old|) × 100. From 80 to 100 that is a 25% increase.' },
        { title: 'Zero original', body: 'When the original value is zero, percent change is not defined. The calculator says so instead of inventing a number.' },
        { title: 'Not the Percentage Calculator', body: '“What is 15% of 200?” is a different intent and stays on the Percentage page.' },
      ]}
    >
      <PercentChangeCalculator />
    </ToolPage>
  );
}
