import { HourlySalaryCalculator } from '@/components/calculators/HourlySalaryCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('hourly-to-salary');
export const metadata = toolMetadata(tool);

export default function HourlyToSalaryPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Gross pay is not take-home pay. Confirm your paid hours, overtime eligibility, benefits, taxes and unpaid time before using this result for a budget."
      methodology={[
        { title: 'Separate regular and overtime hours', body: 'Regular weekly pay uses your base hourly rate. Overtime pay uses only the hours and multiplier you enter, so the two remain visible.' },
        { title: 'Annualize the week', body: 'Weekly regular and overtime pay are multiplied by your chosen paid weeks. This avoids silently assuming every worker is paid for all 52 weeks.' },
        { title: 'Normalize pay periods', body: 'Monthly, semimonthly and biweekly figures come from annual gross pay, keeping every view internally consistent.' },
      ]}
      sources={[
        { name: 'U.S. Department of Labor', detail: 'Federal overtime overview and eligibility caveats.', href: 'https://www.dol.gov/agencies/whd/overtime', dateLabel: 'Official guidance' },
      ]}
    >
      <HourlySalaryCalculator />
    </ToolPage>
  );
}

