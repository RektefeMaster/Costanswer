import { HourlySalaryCalculator } from '@/components/calculators/money/HourlySalaryCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('hourly-to-salary');
export const metadata = toolMetadata(tool);

export default function HourlyToSalaryPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is gross pay, not what hits your bank. Check hours, overtime rules, benefits, taxes, and unpaid time before you budget with it."
      methodology={[
        { title: 'Regular hours and overtime', body: 'Regular weekly pay uses your base rate. Overtime uses only the hours and multiplier you enter.' },
        { title: 'A week into a year', body: 'Weekly pay is multiplied by the paid weeks you choose. 52 weeks is not assumed.' },
        { title: 'Other pay periods', body: 'Monthly, twice a month, and every two weeks are divided from the same yearly total.' },
      ]}
      sources={[
        { name: 'U.S. Department of Labor', detail: 'Federal overtime rules and who they cover.', href: 'https://www.dol.gov/agencies/whd/overtime', dateLabel: 'Official guidance' },
      ]}
    >
      <HourlySalaryCalculator />
    </ToolPage>
  );
}

