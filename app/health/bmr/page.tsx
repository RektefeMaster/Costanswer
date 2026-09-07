import { BmrCalculator } from '@/components/calculators/health/EnergyCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('bmr');
export const metadata = toolMetadata(tool);

export default function BmrPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Estimated BMR is a population equation, not a lab measurement or a treatment plan."
      methodology={[
        { title: 'Mifflin–St Jeor', body: 'Male: 10×kg + 6.25×cm − 5×age + 5. Female: the same base minus 161. Age is limited to adults 18–80 on this page.' },
        { title: 'Activity stays out', body: 'This screen does not multiply by an activity factor. That is the TDEE calculator.' },
        { title: 'Limits', body: 'The equation is a poor fit for children, pregnancy, and many clinical populations. It is an estimate only.' },
      ]}
      sources={[
        { name: 'Mifflin MD, St Jeor ST, et al.', detail: 'A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-247.', href: 'https://pubmed.ncbi.nlm.nih.gov/2305711/', dateLabel: 'Peer-reviewed equation' },
      ]}
    >
      <BmrCalculator />
    </ToolPage>
  );
}
