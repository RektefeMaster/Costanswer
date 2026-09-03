import { K401Calculator } from '@/components/calculators/K401Calculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { irsRetirementLimits, irsRetirementPublishedLabel, irsRetirementSnapshot } from '@/lib/data/irs-retirement-snapshot';
import { formatMoney } from '@/lib/calculations/contracts';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('401k');
export const metadata = toolMetadata(tool);

const deferral = formatMoney(irsRetirementLimits.electiveDeferral401k, 0);
const catchUp50 = formatMoney(irsRetirementLimits.catchUp401kAge50, 0);
const catchUp60 = formatMoney(irsRetirementLimits.catchUp401kAges60to63, 0);
const overall = formatMoney(irsRetirementLimits.definedContributionOverall, 0);
const rothWage = formatMoney(irsRetirementLimits.rothCatchUpPriorYearFicaWageThreshold, 0);
const year = irsRetirementSnapshot.observationPeriod;

export default function K401Page() {
  return (
    <ToolPage
      tool={tool}
      caution="Employer match is a simple configurable rule. Catch-up, Roth-catch-up, and eligibility are not modeled. Limits are context, not an enforcement engine."
      methodology={[
        { title: 'Each year', body: 'Employee deferral is salary × contribution percent. Employer match is the match rate on deferrals, capped at a percent of salary. The assumed return then grows the balance before the next year.' },
        { title: 'Salary growth', body: 'If you enter a salary-growth percent, next year’s salary is last year’s times (1 + growth). The return is still an assumption, not a market path.' },
        {
          title: 'IRS context',
          body: `Tax year ${year} elective deferral limit is ${deferral}. Age 50+ catch-up is ${catchUp50}. For ages 60, 61, 62, or 63 the catch-up limit is ${catchUp60}. Combined defined-contribution limit is ${overall}. Beginning in ${year}, catch-up contributions for employees whose prior-year FICA wages exceeded ${rothWage} must be Roth. This calculator does not cap your typed percent and does not apply those rules.`,
        },
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
      <K401Calculator />
    </ToolPage>
  );
}
