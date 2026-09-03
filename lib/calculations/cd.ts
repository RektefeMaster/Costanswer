import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { apyGrowth } from './finance/interest';
import { CD_ENGINE_ID } from './finance/version';

export const cdInputSchema = z.object({
  principal: finiteNumber('Principal', 0, 100_000_000),
  apyPercent: finiteNumber('APY', 0, 40),
  years: finiteNumber('Term in years', 0, 40),
});

export function calculateCd(rawInput: unknown): CalculationResult<{
  endingBalance: number;
  interestEarned: number;
  years: number;
}> {
  const input = cdInputSchema.parse(rawInput);
  const endingBalance = apyGrowth(input.principal, input.apyPercent, input.years);
  const interestEarned = endingBalance - input.principal;
  return {
    value: {
      endingBalance: round(endingBalance),
      interestEarned: round(interestEarned),
      years: input.years,
    },
    calculationVersion: CD_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Principal', value: formatMoney(input.principal) },
      { label: 'APY', value: `${formatNumber(input.apyPercent, { maximumFractionDigits: 3 })}%`, detail: 'Annual percentage yield you entered, not a live bank quote' },
      { label: 'Interest earned', value: formatMoney(interestEarned) },
    ],
    assumptions: [
      'The rate is APY. Ending value is principal × (1 + APY)^years, including partial years.',
      'This is not a live CD offer, early-withdrawal penalty model, or tax estimate.',
      'Bank compounding display is unnecessary once APY is the input: APY already includes compounding.',
    ],
  };
}
