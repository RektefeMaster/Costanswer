import { AutoCoverageCalculator } from '@/components/calculators/car/AutoCoverageCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { insuranceSnapshot } from '@/lib/data/insurance-snapshot';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('auto-coverage');
export const metadata = toolMetadata(tool);

export default function AutoCoveragePage() {
  return (
    <ToolPage
      tool={tool}
      caution={`Premiums are NAIC ${insuranceSnapshot.observationPeriod} state averages across every policy written, not a quote for your car or your record. This compares what a coverage can pay against what it costs; it is not advice to keep or drop anything, and dropping cover on a financed vehicle usually breaches the loan.`}
      methodology={[
        {
          title: 'A capped benefit against an uncapped cost',
          body: 'Collision and comprehensive pay the vehicle’s actual cash value at the time of loss, less the deductible. That ceiling falls every year as the car depreciates, while the premium does not follow it down. Dividing the ceiling by the annual premium gives the years of premium the whole benefit is worth.',
        },
        {
          title: 'The two coverages are separated',
          body: `Collision pays for damage you cause; comprehensive pays for theft, weather, fire, and animal strikes. NAIC publishes them separately, so they are shown separately, along with their own deductibles, which are commonly different amounts.`,
        },
        {
          title: 'Liability is deliberately excluded',
          body: 'Liability pays other people, is required in almost every state, and its worth has nothing to do with what your own car is worth. Folding it into this comparison would make an unrelated legal obligation look optional, so it is shown alongside for context only.',
        },
        {
          title: 'What the averages are and are not',
          body: `The premiums are average written premium per insured car-year across the whole state: every driver, record, vehicle, and coverage limit combined. They are a benchmark for the shape of the trade-off, not a prediction of your renewal. Enter your own declarations-page figures to make the comparison yours.`,
        },
      ]}
      sources={[
        {
          name: 'NAIC · Auto Insurance Database Report',
          href: insuranceSnapshot.sources.auto.sourceUrl,
          detail: `Collision, comprehensive, and liability average written premiums by state. ${insuranceSnapshot.attribution}`,
          dateLabel: `${insuranceSnapshot.observationPeriod} observations · ${insuranceSnapshot.sources.auto.publicationLabel}`,
        },
      ]}
    >
      <AutoCoverageCalculator />
    </ToolPage>
  );
}
