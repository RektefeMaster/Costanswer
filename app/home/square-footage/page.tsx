import { SquareFootageCalculator } from '@/components/calculators/SquareFootageCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('square-footage');
export const metadata = toolMetadata(tool);

export default function SquareFootagePage() {
  return (
    <ToolPage
      tool={tool}
      caution="Rooms are treated as rectangles. Irregular shapes need more than one section or a different measurement."
      methodology={[
        { title: 'Area', body: 'Each space is length × width. A 12 ft by 10 ft room is 120 square feet.' },
        { title: 'Shared conversion', body: 'Square meters come from the conversion engine (square feet through square meters), not a second copy of unit constants.' },
        { title: 'Concrete is next', body: 'Volume for a slab still belongs on the Concrete Calculator. This page stops at area.' },
      ]}
    >
      <SquareFootageCalculator />
    </ToolPage>
  );
}
