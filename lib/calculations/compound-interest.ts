import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import {
  COMPOUNDING_FREQUENCIES,
  compoundInterestGrowth,
  type CompoundingFrequency,
} from './finance/interest';
import { COMPOUND_INTEREST_ENGINE_ID } from './finance/version';

export { COMPOUND_INTEREST_ENGINE_ID, COMPOUNDING_FREQUENCIES };
export type { CompoundingFrequency };

const frequencySchema = z.enum(COMPOUNDING_FREQUENCIES);

export const compoundInterestInputSchema = z.object({
  principal: finiteNumber('Starting amount', 0, 100_000_000),
  annualRatePercent: finiteNumber('Interest rate', 0, 40),
  years: finiteNumber('Years', 0, 80),
  contribution: finiteNumber('Recurring contribution', 0, 10_000_000),
  compounding: frequencySchema,
  contributionFrequency: frequencySchema,
});

export type CompoundInterestInput = z.infer<typeof compoundInterestInputSchema>;

export type CompoundInterestValue = {
  endingBalance: number;
  startingPrincipal: number;
  totalContributions: number;
  totalGrowth: number;
  compounding: CompoundingFrequency;
  contributionFrequency: CompoundingFrequency;
};

function frequencyLabel(frequency: CompoundingFrequency): string {
  switch (frequency) {
    case 'annually':
      return 'annually';
    case 'semiannually':
      return 'twice a year';
    case 'quarterly':
      return 'quarterly';
    case 'monthly':
      return 'monthly';
    case 'weekly':
      return 'weekly';
    default: {
      const exhaustive: never = frequency;
      throw new Error(`Unhandled compounding frequency: ${exhaustive}`);
    }
  }
}

export function calculateCompoundInterest(rawInput: unknown): CalculationResult<CompoundInterestValue> {
  const input = compoundInterestInputSchema.parse(rawInput);
  const growth = compoundInterestGrowth({
    principal: input.principal,
    annualRatePercent: input.annualRatePercent,
    years: input.years,
    contribution: input.contribution,
    compounding: input.compounding,
    contributionFrequency: input.contributionFrequency,
  });

  return {
    value: {
      endingBalance: round(growth.endingBalance),
      startingPrincipal: round(growth.startingPrincipal),
      totalContributions: round(growth.totalContributions),
      totalGrowth: round(growth.totalGrowth),
      compounding: input.compounding,
      contributionFrequency: input.contributionFrequency,
    },
    calculationVersion: COMPOUND_INTEREST_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      {
        label: 'Starting amount',
        value: formatMoney(growth.startingPrincipal),
      },
      {
        label: 'Total contributions',
        value: formatMoney(growth.totalContributions),
        detail: input.contribution > 0
          ? `${formatMoney(input.contribution)} ${frequencyLabel(input.contributionFrequency)}, added at the end of each contribution period`
          : 'No recurring contributions',
      },
      {
        label: 'Ending balance',
        value: formatMoney(growth.endingBalance),
        detail: `${formatNumber(input.annualRatePercent, { maximumFractionDigits: 3 })}% compounded ${frequencyLabel(input.compounding)} for ${formatNumber(input.years, { maximumFractionDigits: 2 })} years`,
      },
    ],
    assumptions: [
      'Contributions are added at the end of each contribution period, after interest for that compounding step is applied when the dates line up.',
      'The rate is a nominal annual interest rate, not a bank APY quote and not APR.',
      'This does not include taxes, fees, or inflation.',
      'This is a savings-growth estimate, not investment advice.',
    ],
  };
}
