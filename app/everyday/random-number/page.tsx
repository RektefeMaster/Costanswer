import { RandomNumberCalculator } from '@/components/calculators/everyday/EverydayCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('random-number');
export const metadata = toolMetadata(tool);

export default function RandomNumberPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Fine for picking a number, a name, or an order. Not certified for lotteries, prize draws, security keys, or anything with legal stakes."
      methodology={[
        { title: 'When you click Generate', body: 'Numbers come from the browser’s secure random source when it is available. That is good randomness, but this tool is not certified for regulated draws.' },
        { title: 'Integers and uniques', body: 'Integer mode includes both ends of the range. Unique mode cannot ask for more numbers than the range contains.' },
        { title: 'Decimals', body: 'Decimal draws are from the half-open interval [min, max). Unique decimals are not offered.' },
      ]}
    >
      <RandomNumberCalculator />
    </ToolPage>
  );
}
