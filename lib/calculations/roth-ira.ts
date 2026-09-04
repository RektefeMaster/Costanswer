import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { irsRetirementLimits, irsRetirementSnapshot } from '@/lib/data/irs-retirement-snapshot';
import { ROTH_IRA_ENGINE_ID } from './finance/version';

export const rothIraInputSchema = z.object({
  currentBalance: finiteNumber('Current balance', 0, 100_000_000),
  monthlyContribution: finiteNumber('Monthly contribution', 0, 100_000),
  years: finiteNumber('Years', 1, 80).refine(Number.isInteger, 'Years must be a whole number.'),
  assumedReturnPercent: finiteNumber('Assumed annual return', 0, 20),
  currentAge: finiteNumber('Current age', 16, 99).refine(Number.isInteger, 'Age must be a whole number.'),
});

/** The IRA contribution limit that applies at a given age, catch-up included. */
export function iraContributionLimitForAge(age: number): number {
  return irsRetirementLimits.iraLimit + (age >= 50 ? irsRetirementLimits.catchUpIraAge50 : 0);
}

export function calculateRothIra(rawInput: unknown): CalculationResult<{
  endingBalance: number;
  totalContributions: number;
  modeledGrowth: number;
  annualContribution: number;
  requestedAnnualContribution: number;
  firstYearLimit: number;
  yearsLimited: number;
  endingAge: number;
}> {
  const input = rothIraInputSchema.parse(rawInput);
  const requestedAnnual = input.monthlyContribution * 12;
  const monthlyReturn = (1 + input.assumedReturnPercent / 100) ** (1 / 12) - 1;

  let balance = input.currentBalance;
  let totalContributions = 0;
  let yearsLimited = 0;
  let firstYearContribution = 0;

  for (let year = 1; year <= input.years; year += 1) {
    const age = input.currentAge + year - 1;
    const limit = iraContributionLimitForAge(age);
    // The limit is a legal ceiling, not a preference: projecting past it would
    // model a contribution the IRS does not allow.
    const annual = Math.min(requestedAnnual, limit);
    if (annual < requestedAnnual) yearsLimited += 1;
    if (year === 1) firstYearContribution = annual;
    const monthly = annual / 12;
    for (let month = 0; month < 12; month += 1) {
      balance = (balance + monthly) * (1 + monthlyReturn);
    }
    totalContributions += annual;
  }

  const firstYearLimit = iraContributionLimitForAge(input.currentAge);
  const modeledGrowth = balance - input.currentBalance - totalContributions;

  return {
    value: {
      endingBalance: round(balance, 0),
      totalContributions: round(totalContributions, 0),
      modeledGrowth: round(modeledGrowth, 0),
      annualContribution: round(firstYearContribution),
      requestedAnnualContribution: round(requestedAnnual),
      firstYearLimit,
      yearsLimited,
      endingAge: input.currentAge + input.years - 1,
    },
    calculationVersion: ROTH_IRA_ENGINE_ID,
    datasetSnapshotIds: [irsRetirementSnapshot.snapshotId],
    breakdown: [
      {
        label: 'Annual contribution used',
        value: formatMoney(firstYearContribution, 0),
        detail: firstYearContribution < requestedAnnual
          ? `Capped at the age-${input.currentAge} IRA limit of ${formatMoney(firstYearLimit, 0)}, below the ${formatMoney(requestedAnnual, 0)} you entered`
          : `${formatMoney(input.monthlyContribution)} per month`,
      },
      { label: 'Total contributions', value: formatMoney(totalContributions, 0) },
      {
        label: 'Projected balance',
        value: formatMoney(balance, 0),
        detail: `${formatNumber(input.assumedReturnPercent, { maximumFractionDigits: 2 })}% assumed return, contributed monthly`,
      },
    ],
    assumptions: [
      'This is a projected Roth IRA balance under the return you typed. It is not a determination of eligibility, and not investment advice.',
      `IRS tax year ${irsRetirementSnapshot.observationPeriod} limits are applied: ${formatMoney(irsRetirementLimits.iraLimit, 0)} a year, plus ${formatMoney(irsRetirementLimits.catchUpIraAge50, 0)} catch-up from age 50. Contributions above the limit for your age are reduced to it. Official copy: ${irsRetirementSnapshot.snapshotId}.`,
      ...(yearsLimited > 0
        ? [`The amount you entered is above the limit in ${yearsLimited} of ${input.years} projected years, so those years use the limit.`]
        : []),
      'Those limits are held flat for the whole projection. The IRS indexes them for inflation, so later years are understated rather than guessed at.',
      'Roth eligibility phases out by filing status and modified adjusted gross income. Those ranges are not modeled here, so a high earner may be able to contribute less than this shows, or nothing directly.',
      'Contributions are assumed to be made monthly in equal amounts, and to earn the assumed return from the month they go in.',
      'Taxes, penalties, withdrawal rules, and conversions are not included.',
    ],
  };
}
