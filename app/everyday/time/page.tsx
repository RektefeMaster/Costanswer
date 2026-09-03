import { TimeCalculator } from '@/components/calculators/EverydayCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('time');
export const metadata = toolMetadata(tool);

export default function TimePage() {
  return (
    <ToolPage
      tool={tool}
      caution="This adds durations, not clock times on a calendar day."
      methodology={[
        { title: 'Seconds first', body: 'Hours, minutes, and seconds become a signed second total, then the result is normalized.' },
        { title: 'Negatives', body: 'Subtracting a larger duration from a smaller one keeps a minus sign. It does not wrap a 24-hour clock.' },
        { title: 'Not a timesheet', body: 'Shift start and end belong on the Time Card calculator.' },
      ]}
    >
      <TimeCalculator />
    </ToolPage>
  );
}
