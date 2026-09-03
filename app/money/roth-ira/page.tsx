import { RothIraCalculator } from '@/components/calculators/FinanceExpansionCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { IRS_RETIREMENT_LIMITS_2026 } from '@/lib/data/irs-retirement';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('roth-ira');
export const metadata = toolMetadata(tool);

export default function RothIraPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This does not determine Roth eligibility. MAGI and filing status are outside this projection."
      methodology={[
        { title: 'Growth only', body: 'Current balance plus monthly contributions compound monthly at the assumed return, using the shared contribution-growth primitive.' },
        { title: 'Contribution-limit context', body: `The IRS ${IRS_RETIREMENT_LIMITS_2026.taxYear} IRA contribution limit is $${IRS_RETIREMENT_LIMITS_2026.iraLimit.toLocaleString('en-US')} (plus $${IRS_RETIREMENT_LIMITS_2026.catchUpIraAge50.toLocaleString('en-US')} catch-up at age 50+). Those caps are not enforced in the math.` },
        { title: 'Eligibility', body: 'Roth IRA contribution eligibility depends on filing status and modified AGI. This page will not say you are eligible to contribute a stated amount.' },
      ]}
      sources={[
        {
          name: IRS_RETIREMENT_LIMITS_2026.sourceName,
          detail: IRS_RETIREMENT_LIMITS_2026.sourceDetail,
          href: IRS_RETIREMENT_LIMITS_2026.sourceUrl,
          dateLabel: IRS_RETIREMENT_LIMITS_2026.publishedLabel,
        },
      ]}
    >
      <RothIraCalculator />
    </ToolPage>
  );
}
