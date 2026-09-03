import { UnitConversionCalculator } from '@/components/calculators/UnitConversionCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('unit-conversion');
export const metadata = toolMetadata(tool);

export default function UnitConversionPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is one general converter. Pair pages such as kg-to-lbs are not generated here."
      methodology={[
        { title: 'Base units', body: 'A value converts into a category base, then out. Length uses meters, mass kilograms, volume cubic meters, area square meters, speed meters per second.' },
        { title: 'Exact SI ties', body: '1 inch = 2.54 cm exactly, 1 foot = 0.3048 m, 1 mile = 1609.344 m, 1 pound = 0.45359237 kg.' },
        { title: 'Temperature', body: 'Celsius, Fahrenheit, and Kelvin use affine conversion through kelvin, not a simple scale factor.' },
      ]}
    >
      <UnitConversionCalculator />
    </ToolPage>
  );
}
