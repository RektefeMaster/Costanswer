import { ConcreteCalculator } from '@/components/calculators/home/ConcreteCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('concrete');
export const metadata = toolMetadata(tool);

export default function ConcreteCalculatorPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Measure the form in a few places and check the yield on the bag you buy. A structural slab still needs someone who knows the job."
      methodology={[
        { title: 'Thickness in feet', body: 'You enter inches. We convert to feet, then multiply by length and width to get cubic feet.' },
        { title: 'Measured volume and a buy range', body: 'Your waste percent sets a typical bag count, with a higher bound five points above it.' },
        { title: 'Bag yields', body: 'About 0.45 cubic feet for a 60 lb bag and 0.60 for an 80 lb bag. The count rounds up.' },
      ]}
      sources={[
        { name: 'QUIKRETE training guide', detail: 'Official example and approximate yields for 60 lb and 80 lb bags.', href: 'https://www.quikrete.com/dealers/training/presentations/3-mixing-placing-concrete-cement-mixes-training.pdf', dateLabel: 'Product guidance' },
      ]}
    >
      <ConcreteCalculator />
    </ToolPage>
  );
}

