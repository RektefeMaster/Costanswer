import { CalorieCalculator } from '@/components/calculators/health/EnergyCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('calorie');
export const metadata = toolMetadata(tool);

export default function CaloriePage() {
  return (
    <ToolPage
      tool={tool}
      caution="Daily calories here are a planning estimate. This is not a weight-loss program or medical nutrition therapy."
      methodology={[
        { title: 'Maintenance', body: 'Estimated maintenance calories equal TDEE: Mifflin–St Jeor BMR times the selected activity factor.' },
        { title: 'Small offsets', body: 'Optional slow loss or slow gain adds or subtracts 250 kcal. There is no aggressive deficit mode on this page.' },
        { title: 'Who it skips', body: 'Children, pregnancy, breastfeeding, and clinical populations are outside this v1 model.' },
      ]}
      sources={[
        { name: 'Mifflin MD, St Jeor ST, et al.', detail: 'Adult resting-energy equation used under TDEE.', href: 'https://pubmed.ncbi.nlm.nih.gov/2305711/', dateLabel: 'Peer-reviewed equation' },
      ]}
    >
      <CalorieCalculator />
    </ToolPage>
  );
}
