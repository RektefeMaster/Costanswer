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
      caution="Federal, state, local, bank, court and employer calendars can differ. Confirm the controlling calendar before relying on a deadline."
      methodology={[
        { title: 'Use date-only UTC math', body: 'Dates are represented without local clock time, which prevents daylight-saving transitions from adding or removing a day.' },
        { title: 'Apply the endpoint rules', body: 'You decide whether the start and end dates count. Weekend and holiday exclusions are then applied to the included dates.' },
        { title: 'Observe fixed holidays', body: 'When a fixed federal holiday falls on Saturday it is generally observed Friday; when it falls on Sunday it is generally observed Monday.' },
      ]}
      sources={[
        { name: 'U.S. Office of Personnel Management', detail: 'Federal holiday schedules and observed-date rules.', href: 'https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/', dateLabel: 'Official calendar' },
      ]}
    >
      <BusinessDaysCalculator initialDate={initialDate} />
    </ToolPage>
  );
}

