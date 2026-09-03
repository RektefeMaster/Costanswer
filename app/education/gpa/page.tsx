import { GpaCalculator } from '@/components/calculators/EducationHomeCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('gpa');
export const metadata = toolMetadata(tool);

export default function GpaPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is an unweighted 4.0 convenience scale. Honors, plus/minus, and institution-specific weights are not universal."
      methodology={[
        { title: 'Quality points', body: 'GPA = Σ(grade points × credits) ÷ Σ credits. An A at 4.0 with 3 credits plus a B at 3.0 with 3 credits is 3.5.' },
        { title: 'Visible scale', body: 'Each letter’s point value is shown in the grade menu. It is a common U.S. unweighted mapping, not every school’s catalog.' },
        { title: 'Not weighted GPA theater', body: 'This page does not invent a nationwide weighted-GPA standard. Weighted course grades belong on the Grade Calculator.' },
      ]}
    >
      <GpaCalculator />
    </ToolPage>
  );
}
