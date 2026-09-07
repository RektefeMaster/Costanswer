import { TipCalculator } from '@/components/calculators/everyday/TipCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('tip');
export const metadata = toolMetadata(tool);

export default function TipPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Tip is calculated on the subtotal you type. Local custom and service charges can differ."
      methodology={[
        { title: 'Tip on subtotal', body: 'Tip amount is percent × bill subtotal. Tax, if entered, is added after the tip so you can keep them separate.' },
        { title: 'Even split', body: 'The total is divided by the number of people. It does not handle separate checks.' },
        { title: 'Shared math', body: 'The percent step uses the same percentage primitive as the Percentage Calculator.' },
      ]}
    >
      <TipCalculator />
    </ToolPage>
  );
}
