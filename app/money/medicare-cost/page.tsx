import { MedicareCalculator } from '@/components/calculators/money/MedicareCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { medicareSnapshot } from '@/lib/data/medicare';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('medicare-cost');
export const metadata = toolMetadata(tool);

const sourceById = (id: string) => {
  const source = medicareSnapshot.sources.find((entry) => entry.id === id);
  if (!source) throw new Error(`The Medicare snapshot is missing its ${id} source.`);
  return source;
};

export default function MedicareCostPage() {
  return (
    <ToolPage
      tool={tool}
      caution={`These are the published ${medicareSnapshot.coverageYear} premiums and deductibles, applied to figures you supply. They are not a bill. Enrollment, plan availability, any late-enrollment penalty, and your actual income-related adjustment are decided by Medicare and the Social Security Administration.`}
      methodology={[
        {
          title: 'Premiums come from a return you already filed',
          body: `The ${medicareSnapshot.coverageYear} income-related adjustment is set from the modified adjusted gross income on your ${medicareSnapshot.irmaaIncomeTaxYear} return: adjusted gross income plus tax-exempt interest. Nothing you earn this year changes this year's premium, and nothing you did in ${medicareSnapshot.irmaaIncomeTaxYear} can be changed now.`,
        },
        {
          title: 'The adjustment is a cliff, not a taper',
          body: 'Each rung applies in full the moment income passes its threshold. A single dollar over can cost hundreds of dollars across the year, and the amount does not phase in. The distance to your next threshold and what crossing it would cost are both shown, because that is the part a premium table never says.',
        },
        {
          title: 'Each boundary is read the way CMS prints it',
          body: 'Most rungs are "more than" a threshold, so income exactly at the figure stays on the lower rung. The top rung is "greater than or equal to", so income exactly at it moves up. Those two readings differ at the boundary, and the snapshot carries the rule per rung rather than assuming one.',
        },
        {
          title: 'Premiums are totalled, care is not',
          body: 'Part B pays 80% of the approved amount after its annual deductible, and the remaining 20% has no ceiling. No published table can turn that into a yearly cost, so this totals premiums and deductibles and says plainly where the arithmetic stops.',
        },
      ]}
      sources={[
        {
          name: sourceById('cms-part-a-b-2026').name,
          href: sourceById('cms-part-a-b-2026').url,
          detail: sourceById('cms-part-a-b-2026').detail,
          dateLabel: `Published ${sourceById('cms-part-a-b-2026').publishedAt} · ${medicareSnapshot.coverageYear} rates`,
        },
        {
          name: sourceById('cms-rates-cy2026').name,
          href: sourceById('cms-rates-cy2026').url,
          detail: sourceById('cms-rates-cy2026').detail,
          dateLabel: `Published ${sourceById('cms-rates-cy2026').publishedAt}`,
        },
        {
          name: sourceById('ssa-irmaa-tables').name,
          href: sourceById('ssa-irmaa-tables').url,
          detail: sourceById('ssa-irmaa-tables').detail,
          dateLabel: `Verified ${medicareSnapshot.verifiedAt}`,
        },
        {
          name: sourceById('ssa-lower-irmaa').name,
          href: sourceById('ssa-lower-irmaa').url,
          detail: sourceById('ssa-lower-irmaa').detail,
          dateLabel: `Verified ${medicareSnapshot.verifiedAt}`,
        },
      ]}
    >
      <MedicareCalculator />
    </ToolPage>
  );
}
