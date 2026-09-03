import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { irsRetirementLimits, irsRetirementSnapshot } from '@/lib/data/irs-retirement-snapshot';
import { compoundInterestGrowth } from './finance/interest';
import { ROTH_IRA_ENGINE_ID } from './finance/version';

export const rothIraInputSchema = z.object({
  currentBalance: finiteNumber('Current balance', 0, 100_000_000),
  monthlyContribution: finiteNumber('Monthly contribution', 0, 100_000),
  years: finiteNumber('Years', 1, 80),
  assumedReturnPercent: finiteNumber('Assumed annual return', 0, 20),
});

export function calculateRothIra(rawInput: unknown): CalculationResult<{
  endingBalance: number;
  totalContributions: number;
  modeledGrowth: number;
  annualContribution: number;
}> {
  const input = rothIraInputSchema.parse(rawInput);
  const growth = compoundInterestGrowth({
    principal: input.currentBalance,
    annualRatePercent: input.assumedReturnPercent,
    years: input.years,
    contribution: input.monthlyContribution,
    compounding: 'monthly',
    contributionFrequency: 'monthly',
    contributionTiming: 'end',
  });
  const annualContribution = input.monthlyContribution * 12;
  return {
    value: {
      endingBalance: round(growth.endingBalance, 0),
      totalContributions: round(growth.totalContributions, 0),
      modeledGrowth: round(growth.totalGrowth, 0),
      annualContribution: round(annualContribution),
    },
    calculationVersion: ROTH_IRA_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Annual contribution pace', value: formatMoney(annualContribution, 0), detail: `${formatMoney(input.monthlyContribution)} per month` },
      { label: 'Total contributions', value: formatMoney(growth.totalContributions, 0) },
      { label: 'Projected balance', value: formatMoney(growth.endingBalance, 0), detail: `${formatNumber(input.assumedReturnPercent, { maximumFractionDigits: 2 })}% assumed return` },
    ],
    assumptions: [
      'This is a projected Roth IRA growth estimate under the return you typed, not a determination of eligibility.',
      `The IRS tax year ${irsRetirementSnapshot.observationPeriod} IRA contribution limit is ${formatMoney(irsRetirementLimits.iraLimit, 0)} (${formatMoney(irsRetirementLimits.catchUpIraAge50, 0)} additional catch-up at age 50+). This page does not enforce those caps. Official copy: ${irsRetirementSnapshot.snapshotId}.`,
      'Roth eligibility depends on filing status and MAGI. Those rules are not modeled here.',
      'Taxes, penalties, and conversion rules are not included.',
    ],
  };
}
