import { K401Calculator } from '@/components/calculators/money/K401Calculator';
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
      caution="Employer match is a configurable formula. Elective deferral and age-based catch-up limits are modeled and capped, but plan-specific eligibility, vesting schedules, and high-wage mandatory Roth catch-up rules are not modeled."
      methodology={[
        { title: 'Each year', body: 'Employee deferral is salary × contribution percent. Employer match is the match rate on deferrals, capped at a percent of salary. The assumed return then grows the balance before the next year.' },
        { title: 'Salary growth', body: 'If you enter a salary-growth percent, next year’s salary is last year’s times (1 + growth). The return is still an assumption, not a market path.' },
        {
          title: 'IRS limits and catch-up caps',
          body: `Tax year ${year} elective deferral limit is ${deferral}. For employees age 50 and older, the catch-up limit increases allowable deferrals by ${catchUp50} (or ${catchUp60} for ages 60 through 63 under SECURE 2.0). The combined defined-contribution limit is ${overall}. The calculation engine applies these limits to cap annual deferrals based on your age. High-wage mandatory Roth catch-up rules and plan-specific vesting are not modeled.`,
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
