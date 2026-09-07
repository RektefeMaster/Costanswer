import { RothIraCalculator } from '@/components/calculators/money/RothIraCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { irsRetirementLimits, irsRetirementPublishedLabel, irsRetirementSnapshot } from '@/lib/data/irs-retirement-snapshot';
import { formatMoney } from '@/lib/calculations/contracts';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('roth-ira');
export const metadata = toolMetadata(tool);

const ira = formatMoney(irsRetirementLimits.iraLimit, 0);
const iraCatchUp = formatMoney(irsRetirementLimits.catchUpIraAge50, 0);
const year = irsRetirementSnapshot.observationPeriod;

export default function RothIraPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This does not determine Roth eligibility. MAGI and filing status are outside this projection."
      methodology={[
        { title: 'Growth only', body: 'Current balance plus monthly contributions compound monthly at the assumed return, using the shared contribution-growth primitive.' },
        {
          title: 'Contribution-limit context',
          body: `The IRS tax year ${year} IRA contribution limit is ${ira} (plus ${iraCatchUp} catch-up at age 50+). Those caps are not enforced in the math.`,
        },
        { title: 'Eligibility', body: 'Roth IRA contribution eligibility depends on filing status and modified AGI. This page will not say you are eligible to contribute a stated amount.' },
      ]}
      sources={[
        {
          name: irsRetirementSnapshot.provider,
          detail: `${irsRetirementSnapshot.attribution} Snapshot ${irsRetirementSnapshot.snapshotId}.`,
          href: irsRetirementSnapshot.sourceUrl,
          dateLabel: irsRetirementPublishedLabel(),
        },
      ]}
    >
      <RothIraCalculator />
    </ToolPage>
  );
}
