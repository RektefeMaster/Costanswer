import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { irsRetirementLimits, irsRetirementSnapshot } from '@/lib/data/irs-retirement-snapshot';
import { K401_ENGINE_ID } from './finance/version';

export const PAY_FREQUENCIES = ['weekly', 'biweekly', 'semimonthly', 'monthly'] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every two weeks',
  semimonthly: 'Twice a month',
  monthly: 'Monthly',
};

export const k401InputSchema = z.object({
  currentBalance: finiteNumber('Current balance', 0, 100_000_000),
  salary: finiteNumber('Salary', 1, 10_000_000),
  employeePercent: finiteNumber('Employee contribution', 0, 100),
  matchRatePercent: finiteNumber('Employer match rate', 0, 100),
  matchSalaryCapPercent: finiteNumber('Match salary cap', 0, 100),
  years: finiteNumber('Years', 1, 50).refine(Number.isInteger, 'Years must be a whole number.'),
  assumedReturnPercent: finiteNumber('Assumed annual return', 0, 20),
  salaryGrowthPercent: finiteNumber('Salary growth', 0, 20),
  currentAge: finiteNumber('Current age', 16, 99).refine(Number.isInteger, 'Age must be a whole number.'),
  payFrequency: z.enum(PAY_FREQUENCIES),
});

export type K401Input = z.infer<typeof k401InputSchema>;

/**
 * The elective-deferral limit that applies at a given age.
 *
 * Catch-up contributions step up at 50 and again for the ages 60 through 63
 * window, then drop back to the age-50 amount at 64. The published limits are
 * for one tax year and are not projected forward: Congress indexes them, so a
 * long projection understates later years rather than inventing a schedule.
 */
export function electiveDeferralLimitForAge(age: number): { base: number; catchUp: number } {
  const base = irsRetirementLimits.electiveDeferral401k;
  if (age >= 60 && age <= 63) return { base, catchUp: irsRetirementLimits.catchUp401kAges60to63 };
  if (age >= 50) return { base, catchUp: irsRetirementLimits.catchUp401kAge50 };
  return { base, catchUp: 0 };
}

export type K401YearRow = {
  year: number;
  age: number;
  salary: number;
  employee: number;
  employer: number;
  deferralLimited: boolean;
  overallLimited: boolean;
};

export function calculate401k(rawInput: unknown): CalculationResult<{
  endingBalance: number;
  totalEmployee: number;
  totalEmployer: number;
  modeledGrowth: number;
  firstYearEmployee: number;
  firstYearEmployer: number;
  perPeriodEmployee: number;
  perPeriodEmployer: number;
  periodsPerYear: number;
  yearsDeferralLimited: number;
  yearsOverallLimited: number;
  endingAge: number;
}> {
  const input = k401InputSchema.parse(rawInput);
  const periodsPerYear = PERIODS_PER_YEAR[input.payFrequency];
  const annualReturn = input.assumedReturnPercent / 100;
  // Same convention as every other projection on the site: a nominal annual
  // rate applied each period, matching `compoundInterestGrowth`. Two
  // calculators disagreeing on what "7% a year" means would be worse than
  // either convention on its own.
  const periodReturn = annualReturn / periodsPerYear;
  const salaryGrowth = input.salaryGrowthPercent / 100;

  let salary = input.salary;
  let balance = input.currentBalance;
  let totalEmployee = 0;
  let totalEmployer = 0;
  const rows: K401YearRow[] = [];

  for (let year = 1; year <= input.years; year += 1) {
    const age = input.currentAge + year - 1;
    const { base, catchUp } = electiveDeferralLimitForAge(age);
    const desiredEmployee = salary * (input.employeePercent / 100);

    // Catch-up money sits outside the 415(c) annual-additions limit, so the
    // base deferral and the catch-up are capped separately.
    const baseEmployee = Math.min(desiredEmployee, base);
    const catchUpEmployee = Math.min(Math.max(desiredEmployee - baseEmployee, 0), catchUp);
    const employee = baseEmployee + catchUpEmployee;
    const deferralLimited = employee < desiredEmployee;

    const matchable = salary * (input.matchSalaryCapPercent / 100);
    const desiredEmployer = Math.min(employee, matchable) * (input.matchRatePercent / 100);
    const employerRoom = Math.max(irsRetirementLimits.definedContributionOverall - baseEmployee, 0);
    const employer = Math.min(desiredEmployer, employerRoom);
    const overallLimited = employer < desiredEmployer;

    const employeePerPeriod = employee / periodsPerYear;
    const employerPerPeriod = employer / periodsPerYear;
    for (let period = 0; period < periodsPerYear; period += 1) {
      // A deferral lands on payday, at the end of the period worked, and earns
      // from there. Crediting it at the start of the period would pay a period
      // of return on money that has not been earned yet — and would make more
      // frequent pay produce a smaller balance, which is backwards.
      balance = balance * (1 + periodReturn) + employeePerPeriod + employerPerPeriod;
    }

    rows.push({ year, age, salary, employee, employer, deferralLimited, overallLimited });
    totalEmployee += employee;
    totalEmployer += employer;
    salary *= 1 + salaryGrowth;
  }

  const first = rows[0];
  const modeledGrowth = balance - input.currentBalance - totalEmployee - totalEmployer;
  const yearsDeferralLimited = rows.filter((row) => row.deferralLimited).length;
  const yearsOverallLimited = rows.filter((row) => row.overallLimited).length;
  const limitAssumptions: string[] = [];
  if (yearsDeferralLimited > 0) {
    limitAssumptions.push(
      `Your contribution percent exceeds the IRS elective-deferral limit in ${yearsDeferralLimited} of ${input.years} projected years. Those years are capped at the limit for your age.`,
    );
  }
  if (yearsOverallLimited > 0) {
    limitAssumptions.push(
      `Employee plus employer money reaches the ${formatMoney(irsRetirementLimits.definedContributionOverall, 0)} annual-additions limit in ${yearsOverallLimited} of ${input.years} projected years.`,
    );
  }

  return {
    value: {
      endingBalance: round(balance, 0),
      totalEmployee: round(totalEmployee, 0),
      totalEmployer: round(totalEmployer, 0),
      modeledGrowth: round(modeledGrowth, 0),
      firstYearEmployee: round(first.employee),
      firstYearEmployer: round(first.employer),
      perPeriodEmployee: round(first.employee / periodsPerYear),
      perPeriodEmployer: round(first.employer / periodsPerYear),
      periodsPerYear,
      yearsDeferralLimited,
      yearsOverallLimited,
      endingAge: input.currentAge + input.years - 1,
    },
    calculationVersion: K401_ENGINE_ID,
    datasetSnapshotIds: [irsRetirementSnapshot.snapshotId],
    breakdown: [
      {
        label: 'Contribution each paycheck',
        value: formatMoney(first.employee / periodsPerYear + first.employer / periodsPerYear),
        detail: `${formatMoney(first.employee / periodsPerYear)} you + ${formatMoney(first.employer / periodsPerYear)} employer, ${periodsPerYear} times a year`,
      },
      {
        label: 'First-year employee deferral',
        value: formatMoney(first.employee, 0),
        detail: first.deferralLimited
          ? `Capped at the age-${first.age} IRS limit, below ${formatNumber(input.employeePercent, { maximumFractionDigits: 2 })}% of salary`
          : `${formatNumber(input.employeePercent, { maximumFractionDigits: 2 })}% of salary`,
      },
      {
        label: 'First-year employer match',
        value: formatMoney(first.employer, 0),
        detail: `${formatNumber(input.matchRatePercent, { maximumFractionDigits: 2 })}% of deferrals up to ${formatNumber(input.matchSalaryCapPercent, { maximumFractionDigits: 2 })}% of salary`,
      },
      {
        label: 'Projected balance',
        value: formatMoney(balance, 0),
        detail: `${input.years} years at ${formatNumber(input.assumedReturnPercent, { maximumFractionDigits: 2 })}% assumed return`,
      },
    ],
    assumptions: [
      'Under these assumptions only. This is not tax, plan, or investment advice.',
      `Contributions go in every pay period (${PAY_FREQUENCY_LABELS[input.payFrequency].toLowerCase()}, ${periodsPerYear} a year) and land on payday and earn the assumed return from then on, which is how payroll deferrals actually work. The return you type is applied as a nominal annual rate compounded each pay period.`,
      'Employer match is a simple rate on employee deferrals, capped at a percent of salary. Plans differ, and vesting is not modeled.',
      ...limitAssumptions,
      `IRS tax year ${irsRetirementSnapshot.observationPeriod} limits are applied: ${formatMoney(irsRetirementLimits.electiveDeferral401k, 0)} elective deferral, ${formatMoney(irsRetirementLimits.catchUp401kAge50, 0)} catch-up at 50+, ${formatMoney(irsRetirementLimits.catchUp401kAges60to63, 0)} at ages 60 to 63, and a ${formatMoney(irsRetirementLimits.definedContributionOverall, 0)} annual-additions limit. Official copy: ${irsRetirementSnapshot.snapshotId}.`,
      `Those limits are held flat for the whole projection. Congress indexes them for inflation, so later years are understated rather than guessed at.`,
      `Beginning in ${irsRetirementSnapshot.observationPeriod}, catch-up contributions for employees whose prior-year FICA wages exceeded ${formatMoney(irsRetirementLimits.rothCatchUpPriorYearFicaWageThreshold, 0)} must be Roth. That changes the tax treatment, not the amount projected here.`,
    ],
  };
}
