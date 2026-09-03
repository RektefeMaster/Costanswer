import { TdeeCalculator } from '@/components/calculators/EnergyCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('tdee');
export const metadata = toolMetadata(tool);

export default function TdeePage() {
  return (
    <ToolPage
      tool={tool}
      caution="TDEE here is BMR times a conventional activity multiplier, not a personal metabolic test."
      methodology={[
        { title: 'BMR first', body: 'The same Mifflin–St Jeor adult estimate used on the BMR page is computed once, then multiplied.' },
        { title: 'Activity factors', body: 'Sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very active 1.9. These are labeled planning factors, not measured expenditure.' },
        { title: 'Limits', body: 'Pick the factor that most honestly matches weekly movement. The product is still an estimate.' },
      ]}
      sources={[
        { name: 'Mifflin MD, St Jeor ST, et al.', detail: 'Resting-energy equation reused as the TDEE base.', href: 'https://pubmed.ncbi.nlm.nih.gov/2305711/', dateLabel: 'Peer-reviewed equation' },
      ]}
    >
      <TdeeCalculator />
    </ToolPage>
  );
}
