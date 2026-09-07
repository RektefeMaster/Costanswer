import { DaysFromTodayCalculator } from '@/components/calculators/everyday/EverydayCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('days-from-today');
export const metadata = toolMetadata(tool);

export default function DaysFromTodayPage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ToolPage
      tool={tool}
      caution="This adds whole calendar days to today. It does not skip weekends or federal holidays."
      methodology={[
        { title: 'Today plus N', body: 'The only offset is a whole number of calendar days forward or back from an injected today date.' },
        { title: 'When to use this one', body: 'Use this when you only need a number of calendar days from today. For months, years, or a span between two dates, use the Date Calculator.' },
        { title: 'Timezone', body: 'Today is a calendar date, not a timestamp, so DST cannot drop or add a day.' },
      ]}
    >
      <DaysFromTodayCalculator today={today} />
    </ToolPage>
  );
}
