import { CdCalculator } from '@/components/calculators/FinanceExpansionCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('cd');
export const metadata = toolMetadata(tool);

export default function CdPage() {
  return (
    <ToolPage
      tool={tool}
      caution="There is no live bank CD rate. Early-withdrawal penalties and taxes are not modeled."
      methodology={[
        { title: 'APY input', body: 'The rate is annual percentage yield. Ending balance = principal × (1 + APY)^years, including fractional years.' },
        { title: 'One-year fixture', body: '$10,000 at 5% APY for 12 months is $10,500 under that definition.' },
        { title: 'Why not a compounding picker', body: 'APY already includes the issuer’s compounding. Mixing a nominal rate with APY would silently change the math.' },
      ]}
    >
      <CdCalculator />
    </ToolPage>
  );
}
