import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';
import { compoundInterestGrowth } from './finance/interest';
import { RETIREMENT_ENGINE_ID } from './finance/version';

export const retirementInputSchema = z.object({
  currentAge: finiteNumber('Current age', 18, 100).refine(Number.isInteger, 'Age must be a whole number.'),
  retirementAge: finiteNumber('Retirement age', 18, 100).refine(Number.isInteger, 'Age must be a whole number.'),
  currentSavings: finiteNumber('Current savings', 0, 100_000_000),
  monthlyContribution: finiteNumber('Monthly contribution', 0, 1_000_000),
  assumedReturnPercent: finiteNumber('Assumed annual return', 0, 20),
  goalAmount: finiteNumber('Modeled goal', 0, 100_000_000),
}).superRefine((input, context) => {
  if (input.retirementAge <= input.currentAge) {
    context.addIssue({ code: 'custom', message: 'Retirement age must be after current age.' });
  }
});

export function calculateRetirement(rawInput: unknown): CalculationResult<{
  years: number;
  projectedBalance: number;
  totalContributions: number;
  startingSavings: number;
  futureContributions: number;
  totalInvested: number;
  modeledGrowth: number;
  goalAmount: number;
  gap: number;
}> {
  const input = retirementInputSchema.parse(rawInput);
  const years = input.retirementAge - input.currentAge;
  const growth = compoundInterestGrowth({
    principal: input.currentSavings,
    annualRatePercent: input.assumedReturnPercent,
    years,
    contribution: input.monthlyContribution,
    compounding: 'monthly',
    contributionFrequency: 'monthly',
    contributionTiming: 'end',
  });
  const gap = growth.endingBalance - input.goalAmount;
  const futureContributions = round(growth.totalContributions, 0);
  const startingSavings = round(input.currentSavings, 0);
  const totalInvested = round(startingSavings + futureContributions, 0);

  return {
    value: {
      years,
      projectedBalance: round(growth.endingBalance, 0),
      totalContributions: totalInvested,
      startingSavings,
      futureContributions,
      totalInvested,
      modeledGrowth: round(growth.totalGrowth, 0),
      goalAmount: round(input.goalAmount, 0),
      gap: round(gap, 0),
    },
    calculationVersion: RETIREMENT_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Years until retirement', value: `${years}` },
      { label: 'Starting savings', value: formatMoney(startingSavings, 0) },
      { label: 'Future contributions', value: formatMoney(futureContributions, 0), detail: `${years * 12} monthly contributions` },
      { label: 'Total principal invested', value: formatMoney(totalInvested, 0) },
      { label: 'Projected balance', value: formatMoney(growth.endingBalance, 0), detail: 'Under the return assumption you entered' },
      { label: 'Modeled goal', value: formatMoney(input.goalAmount, 0), detail: gap >= 0 ? 'Projected balance meets or exceeds this goal' : 'Projected balance is below this goal' },
    ],
    assumptions: [
      'Under these assumptions only. This is not a retirement recommendation or a claim about the future.',
      'The return is a constant assumed rate, not a market forecast. Taxes, inflation, Social Security, pensions, and health costs are not modeled.',
      'Monthly contributions are added at the end of each month. The goal is a number you typed, not a calculated spending need.',
    ],
  };
}
