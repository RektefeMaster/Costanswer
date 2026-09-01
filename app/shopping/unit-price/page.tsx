import { UnitPriceCalculator } from '@/components/calculators/UnitPriceCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('unit-price');
export const metadata = toolMetadata(tool);

export default function UnitPricePage() {
  return (
    <ToolPage
      tool={tool}
      caution="The lowest unit price is not always the best purchase. Consider quality, spoilage, storage, membership cost, coupon limits and how much you will actually use."
      methodology={[
        { title: 'Keep dimensions separate', body: 'Weight can compare with weight, volume with volume, and count with count. The tool refuses invalid weight-to-volume comparisons.' },
        { title: 'Normalize the quantity', body: 'Each package is converted to ounces, fluid ounces or items using fixed unit relationships before price is divided by quantity.' },
        { title: 'Rank the real unit price', body: 'Every option shows the same base unit, the least expensive option is identified, and the gap versus the higher price remains visible.' },
      ]}
      sources={[
        { name: 'National Institute of Standards and Technology', detail: 'SI and U.S. customary unit relationships used for normalization.', href: 'https://www.nist.gov/pml/owm/si-units-information', dateLabel: 'Measurement reference' },
      ]}
    >
      <UnitPriceCalculator />
    </ToolPage>
  );
}

