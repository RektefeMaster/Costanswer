import { GradeCalculator } from '@/components/calculators/EducationHomeCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('grade');
export const metadata = toolMetadata(tool);

export default function GradePage() {
  return (
    <ToolPage
      tool={tool}
      caution="Schools weight categories differently. The letter, if shown, uses an assumed 90/80/70/60 scale, not your syllabus."
      methodology={[
        { title: 'Weighted items', body: 'Each row is earned ÷ possible, then multiplied by its weight. The course percent is the weighted average of those ratios.' },
        { title: 'Letter scale', body: 'A 90, B 80, C 70, D 60 is a convenience scale shown on the result. Change the inputs; do not treat the letter as official policy.' },
        { title: 'GPA is separate', body: 'Course credits and 4.0 grade points belong on the GPA Calculator.' },
      ]}
    >
      <GradeCalculator />
    </ToolPage>
  );
}
