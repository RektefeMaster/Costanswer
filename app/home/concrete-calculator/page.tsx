import { ConcreteCalculator } from '@/components/calculators/ConcreteCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('concrete');
export const metadata = toolMetadata(tool);

export default function ConcreteCalculatorPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Measure the actual form in several places and verify the yield printed on your chosen product. Structural slabs, sub-base, reinforcement and code requirements need project-specific review."
      methodology={[
        { title: 'Convert depth to feet', body: 'Thickness is entered in inches, converted to feet, then multiplied by slab length and width to produce cubic feet.' },
        { title: 'Show measured and planning volume', body: 'The measured geometry stays visible. Your waste allowance creates the typical purchase quantity, with a higher bound five percentage points above it.' },
        { title: 'Use published approximate yields', body: 'Bag counts use 0.45 ft³ for a 60 lb bag and 0.60 ft³ for an 80 lb bag. The final count rounds up to whole bags.' },
      ]}
      sources={[
        { name: 'QUIKRETE training guide', detail: 'Official example and approximate 60 lb and 80 lb packaged-concrete yields.', href: 'https://www.quikrete.com/dealers/training/presentations/3-mixing-placing-concrete-cement-mixes-training.pdf', dateLabel: 'Product guidance' },
      ]}
    >
      <ConcreteCalculator />
    </ToolPage>
  );
}

