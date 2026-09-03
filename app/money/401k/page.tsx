import { K401Calculator } from '@/components/calculators/FinanceExpansionCalculators';
import { ToolPage } from '@/components/tool/ToolPage';
import { IRS_RETIREMENT_LIMITS_2026 } from '@/lib/data/irs-retirement';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('401k');
export const metadata = toolMetadata(tool);

export default function K401Page() {
  return (
    <ToolPage
      tool={tool}
      caution="Employer match is a simple configurable rule. Catch-up, Roth-catch-up, and eligibility are not modeled. Limits are context, not an enforcement engine."
      methodology={[
        { title: 'Each year', body: 'Employee deferral is salary × contribution percent. Employer match is the match rate on deferrals, capped at a percent of salary. The assumed return then grows the balance before the next year.' },
        { title: 'Salary growth', body: 'If you enter a salary-growth percent, next year’s salary is last year’s times (1 + growth). The return is still an assumption, not a market path.' },
        { title: 'IRS context', body: `Tax year ${IRS_RETIREMENT_LIMITS_2026.taxYear} elective deferral limit is $${IRS_RETIREMENT_LIMITS_2026.electiveDeferral401k.toLocaleString('en-US')}. This calculator does not cap your typed percent and does not apply age-50 or ages 60–63 catch-up.` },
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
      <K401Calculator />
    </ToolPage>
  );
}
