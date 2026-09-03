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
      caution="The lowest unit price is not always the buy you want. Quality, spoilage, storage, membership fees, and how much you will actually use still matter."
      methodology={[
        { title: 'Weight, volume, and count', body: 'Ounces can compare with pounds, and milliliters with cups. A weight will not compare with a volume.' },
        { title: 'One base unit', body: 'Each package is converted to ounces, fluid ounces, or items, then price is divided by quantity.' },
        { title: 'The cheaper unit price', body: 'Both options use the same base unit. The cheaper one is marked.' },
      ]}
      sources={[
        { name: 'National Institute of Standards and Technology', detail: 'SI and U.S. customary unit relationships used to convert packages.', href: 'https://www.nist.gov/pml/owm/si-units-information', dateLabel: 'Measurement reference' },
      ]}
    >
      <UnitPriceCalculator />
    </ToolPage>
  );
}

