import { BmiCalculator } from '@/components/calculators/BmiCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('bmi');
export const metadata = toolMetadata(tool);

export default function BmiPage() {
  return (
    <ToolPage
      tool={tool}
      caution="BMI is a screening ratio, not a diagnosis. Adult CDC ranges do not apply to children."
      methodology={[
        { title: 'The ratio', body: 'BMI is weight in kilograms divided by height in meters squared. U.S. inputs convert with exact pound and inch constants before that step.' },
        { title: 'Adult ranges only', body: 'If a category label appears, it is a CDC adult screening range for ages 20 and older. It sits under the number, not in place of it.' },
        { title: 'What this is not', body: 'This page does not calculate child BMI percentiles, prescribe weight change, or replace clinical judgment.' },
      ]}
      sources={[
        { name: 'Centers for Disease Control and Prevention', detail: 'Adult BMI formula and adult BMI categories.', href: 'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html', dateLabel: 'CDC adult BMI' },
      ]}
    >
      <BmiCalculator />
    </ToolPage>
  );
}
