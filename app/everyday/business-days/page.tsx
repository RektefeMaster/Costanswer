import { BusinessDaysCalculator } from '@/components/calculators/BusinessDaysCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('business-days');
export const metadata = toolMetadata(tool);

export default function BusinessDaysPage() {
  const initialDate = new Date().toISOString().slice(0, 10);
  return (
    <ToolPage
      tool={tool}
      caution="Federal, state, bank, court, and company calendars are not always the same. Check the calendar that actually applies to your deadline."
      methodology={[
        { title: 'Dates, not clock times', body: 'Dates are stored without a local time. Daylight saving cannot add or drop a day.' },
        { title: 'Start and end dates', body: 'You choose whether the start and end dates count. Then weekends and holidays come out.' },
        { title: 'Federal holidays', body: 'If a fixed holiday falls on Saturday it is usually observed Friday. If it falls on Sunday it is usually observed Monday.' },
      ]}
      sources={[
        { name: 'U.S. Office of Personnel Management', detail: 'Federal holiday schedules and observed-date rules.', href: 'https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/', dateLabel: 'Official calendar' },
      ]}
    >
      <BusinessDaysCalculator initialDate={initialDate} />
    </ToolPage>
  );
}

