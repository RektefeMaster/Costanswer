import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { irsRetirementLimits, irsRetirementSnapshot } from '@/lib/data/irs-retirement-snapshot';
import { K401_ENGINE_ID } from './finance/version';

export const k401InputSchema = z.object({
  currentBalance: finiteNumber('Current balance', 0, 100_000_000),
  salary: finiteNumber('Salary', 1, 10_000_000),
  employeePercent: finiteNumber('Employee contribution', 0, 100),
  matchRatePercent: finiteNumber('Employer match rate', 0, 100),
  matchSalaryCapPercent: finiteNumber('Match salary cap', 0, 100),
  years: finiteNumber('Years', 1, 50).refine(Number.isInteger, 'Years must be a whole number.'),
  assumedReturnPercent: finiteNumber('Assumed annual return', 0, 20),
  salaryGrowthPercent: finiteNumber('Salary growth', 0, 20),
});

export function calculate401k(rawInput: unknown): CalculationResult<{
  endingBalance: number;
  totalEmployee: number;
  totalEmployer: number;
  modeledGrowth: number;
  firstYearEmployee: number;
  firstYearEmployer: number;
}> {
  const input = k401InputSchema.parse(rawInput);
  const annualReturn = input.assumedReturnPercent / 100;
  const salaryGrowth = input.salaryGrowthPercent / 100;
  let salary = input.salary;
  let balance = input.currentBalance;
  let totalEmployee = 0;
  let totalEmployer = 0;
  let firstYearEmployee = 0;
  let firstYearEmployer = 0;

  for (let year = 1; year <= input.years; year += 1) {
    const employee = salary * (input.employeePercent / 100);
    const matchable = salary * (input.matchSalaryCapPercent / 100);
    const employer = Math.min(employee, matchable) * (input.matchRatePercent / 100);
    if (year === 1) {
      firstYearEmployee = employee;
      firstYearEmployer = employer;
    }
    balance = balance * (1 + annualReturn) + employee + employer;
    totalEmployee += employee;
    totalEmployer += employer;
    salary *= 1 + salaryGrowth;
  }

  const modeledGrowth = balance - input.currentBalance - totalEmployee - totalEmployer;
  return {
    value: {
      endingBalance: round(balance, 0),
      totalEmployee: round(totalEmployee, 0),
      totalEmployer: round(totalEmployer, 0),
      modeledGrowth: round(modeledGrowth, 0),
      firstYearEmployee: round(firstYearEmployee),
      firstYearEmployer: round(firstYearEmployer),
    },
    calculationVersion: K401_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'First-year employee deferral', value: formatMoney(firstYearEmployee, 0), detail: `${formatNumber(input.employeePercent, { maximumFractionDigits: 2 })}% of salary` },
      { label: 'First-year employer match', value: formatMoney(firstYearEmployer, 0), detail: `${formatNumber(input.matchRatePercent, { maximumFractionDigits: 2 })}% of deferrals up to ${formatNumber(input.matchSalaryCapPercent, { maximumFractionDigits: 2 })}% of salary` },
      { label: 'Projected balance', value: formatMoney(balance, 0), detail: `${input.years} years at ${formatNumber(input.assumedReturnPercent, { maximumFractionDigits: 2 })}% assumed return` },
    ],
    assumptions: [
      'Under these assumptions only. This is not tax, plan, or investment advice.',
      'Employer match is a simple rate on employee deferrals, capped at a percent of salary. Plans differ.',
      'Each year applies the assumed return to the existing balance, then adds that year’s employee and employer amounts.',
      `IRS tax year ${irsRetirementSnapshot.observationPeriod} elective deferral limit is ${formatMoney(irsRetirementLimits.electiveDeferral401k, 0)}. Age 50+ catch-up is ${formatMoney(irsRetirementLimits.catchUp401kAge50, 0)}; ages 60, 61, 62, or 63 catch-up is ${formatMoney(irsRetirementLimits.catchUp401kAges60to63, 0)}. Combined defined-contribution limit is ${formatMoney(irsRetirementLimits.definedContributionOverall, 0)}. Beginning in ${irsRetirementSnapshot.observationPeriod}, catch-up contributions for employees whose prior-year FICA wages exceeded ${formatMoney(irsRetirementLimits.rothCatchUpPriorYearFicaWageThreshold, 0)} must be Roth. This projection does not cap contributions or apply those rules. Official copy: ${irsRetirementSnapshot.snapshotId}.`,
    ],
  };
}
