import { TimeCardCalculator } from '@/components/calculators/EverydayCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('time-card');
export const metadata = toolMetadata(tool);

export default function TimeCardPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This counts hours worked after unpaid breaks. It does not apply overtime law and is not a wage claim."
      methodology={[
        { title: 'Elapsed time', body: 'Each shift is end minus start. If end is not later than start, the shift is treated as overnight and 24 hours are added.' },
        { title: 'Breaks', body: 'Unpaid break minutes are subtracted. A break longer than the shift is rejected.' },
        { title: 'Pay is optional', body: 'If you type an hourly rate, hours × rate is shown as a simple product. No FLSA overtime, premiums, or legal “owed” language.' },
      ]}
    >
      <TimeCardCalculator />
    </ToolPage>
  );
}
