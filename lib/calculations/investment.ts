import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import {
  COMPOUNDING_FREQUENCIES,
  compoundInterestGrowth,
  type CompoundingFrequency,
  type ContributionTiming,
} from './finance/interest';
import { INVESTMENT_ENGINE_ID } from './finance/version';

const frequencySchema = z.enum(COMPOUNDING_FREQUENCIES);
const timingSchema = z.enum(['end', 'beginning']);

export const investmentInputSchema = z.object({
  principal: finiteNumber('Starting amount', 0, 100_000_000),
  contribution: finiteNumber('Recurring contribution', 0, 10_000_000),
  contributionFrequency: frequencySchema,
  contributionTiming: timingSchema,
  annualReturnPercent: finiteNumber('Assumed annual return', 0, 40),
  years: finiteNumber('Years', 0, 80),
  compounding: frequencySchema,
});

export function calculateInvestment(rawInput: unknown): CalculationResult<{
  endingValue: number;
  startingPrincipal: number;
  totalContributions: number;
  modeledGrowth: number;
}> {
  const input = investmentInputSchema.parse(rawInput);
  const growth = compoundInterestGrowth({
    principal: input.principal,
    annualRatePercent: input.annualReturnPercent,
    years: input.years,
    contribution: input.contribution,
    compounding: input.compounding,
    contributionFrequency: input.contributionFrequency,
    contributionTiming: input.contributionTiming as ContributionTiming,
  });
  return {
    value: {
      endingValue: round(growth.endingBalance),
      startingPrincipal: round(growth.startingPrincipal),
      totalContributions: round(growth.totalContributions),
      modeledGrowth: round(growth.totalGrowth),
    },
    calculationVersion: INVESTMENT_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Starting amount', value: formatMoney(growth.startingPrincipal) },
      { label: 'Total contributions', value: formatMoney(growth.totalContributions) },
      { label: 'Modeled growth', value: formatMoney(growth.totalGrowth), detail: `${formatNumber(input.annualReturnPercent, { maximumFractionDigits: 3 })}% assumed return` },
    ],
    assumptions: [
      'The return is an assumption you typed, not a forecast, guarantee, or market quote.',
      `Contributions are added at the ${input.contributionTiming === 'end' ? 'end' : 'beginning'} of each contribution period.`,
      'Taxes, fees, and inflation are not included.',
      'This is not investment advice.',
    ],
  };
}

export { COMPOUNDING_FREQUENCIES };
export type { CompoundingFrequency, ContributionTiming };
