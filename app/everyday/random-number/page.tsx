import { RandomNumberCalculator } from '@/components/calculators/EverydayCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('random-number');
export const metadata = toolMetadata(tool);

export default function RandomNumberPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is ordinary utility randomness. Do not use it for security, lotteries with legal stakes, or cryptography."
      methodology={[
        { title: 'When you click Generate', body: 'The browser’s cryptographic random source is used when available. Tests inject a deterministic source.' },
        { title: 'Integers and uniques', body: 'Integer mode includes both ends of the range. Unique mode cannot ask for more numbers than the range contains.' },
        { title: 'Decimals', body: 'Decimal draws are from the half-open interval [min, max). Unique decimals are not offered.' },
      ]}
    >
      <RandomNumberCalculator />
    </ToolPage>
  );
}
