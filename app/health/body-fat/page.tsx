import { BodyFatCalculator } from '@/components/calculators/health/BodyFatCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('body-fat');
export const metadata = toolMetadata(tool);

export default function BodyFatPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is a tape-measure estimate. It is not DEXA, Bod Pod, or a clinical body-composition test."
      methodology={[
        { title: 'Navy circumference method', body: 'Male: 86.010 × log10(waist − neck) − 70.041 × log10(height) + 36.76, in inches. Female adds hip: 163.205 × log10(waist + hip − neck) − 97.684 × log10(height) − 78.387.' },
        { title: 'Units', body: 'Metric tape readings convert to inches through the shared conversion engine before the logs run.' },
        { title: 'Limits', body: 'Tape site, posture, and body shape change the result. Unsupported measurements are rejected instead of inventing a percent.' },
      ]}
      sources={[
        { name: 'Hodgdon JA, Beckett MB', detail: 'Naval Health Research Center reports 84-11 and 84-29 (1984), circumference body-composition equations used by the U.S. Navy.', href: 'https://apps.dtic.mil/sti/citations/ADA144199', dateLabel: 'NHRC / DTIC' },
      ]}
    >
      <BodyFatCalculator />
    </ToolPage>
  );
}
