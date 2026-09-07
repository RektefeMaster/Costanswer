import { AgeCalculator } from '@/components/calculators/everyday/AgeCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('age');
export const metadata = toolMetadata(tool);

export default function AgePage() {
  const initialDate = new Date().toISOString().slice(0, 10);
  return (
    <ToolPage
      tool={tool}
      caution="This is calendar-date age, not legal age in every jurisdiction."
      methodology={[
        { title: 'Dates, not clock times', body: 'Birth and as-of dates are stored as YYYY-MM-DD. Local timezone cannot slide the selected day.' },
        { title: 'Leap days', body: 'A February 29 birthday is observed on February 28 in a non-leap year for completed-year counting.' },
        { title: 'What this is not', body: 'This is not business-day math and not “days from today.” Those are separate tools.' },
      ]}
    >
      <AgeCalculator initialDate={initialDate} />
    </ToolPage>
  );
}
