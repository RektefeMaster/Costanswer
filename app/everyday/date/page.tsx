import { DateCalculator } from '@/components/calculators/everyday/EverydayCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('date');
export const metadata = toolMetadata(tool);

export default function DatePage() {
  return (
    <ToolPage
      tool={tool}
      caution="Month and year math clamps to the last valid day of the target month. January 31 plus one month is February 28 or 29, not March 3."
      methodology={[
        { title: 'Calendar offsets', body: 'Days and weeks add whole calendar days. Months and years use end-of-month clamping on a UTC date-only value.' },
        { title: 'Not business days', body: 'Weekends and holidays still count. Use the Business Days calculator to skip them.' },
        { title: 'Not “from today” only', body: 'This tool starts from any date you pick. Days From Today is the shorter today-plus-N surface.' },
      ]}
    >
      <DateCalculator />
    </ToolPage>
  );
}
