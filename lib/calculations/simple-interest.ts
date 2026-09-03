import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { simpleInterest } from './finance/interest';
import { INTEREST_ENGINE_ID } from './finance/version';

export const simpleInterestInputSchema = z.object({
  principal: finiteNumber('Principal', 0, 100_000_000),
  annualRatePercent: finiteNumber('Annual interest rate', 0, 100),
  years: finiteNumber('Time in years', 0, 100),
});

export function calculateSimpleInterest(rawInput: unknown): CalculationResult<{
  interest: number;
  endingAmount: number;
  years: number;
}> {
  const input = simpleInterestInputSchema.parse(rawInput);
  const interest = simpleInterest(input.principal, input.annualRatePercent, input.years);
  const endingAmount = input.principal + interest;
  return {
    value: {
      interest: round(interest),
      endingAmount: round(endingAmount),
      years: input.years,
    },
    calculationVersion: INTEREST_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Principal', value: formatMoney(input.principal) },
      { label: 'Interest', value: formatMoney(interest), detail: `${formatMoney(input.principal)} × ${formatNumber(input.annualRatePercent, { maximumFractionDigits: 3 })}% × ${formatNumber(input.years, { maximumFractionDigits: 4 })} years` },
      { label: 'Ending amount', value: formatMoney(endingAmount) },
    ],
    assumptions: [
      'This calculator uses simple interest: principal × annual rate × time.',
      'It does not compound. For compounding, use the Compound Interest Calculator.',
      'For recurring contributions, use the Investment Calculator.',
      'Taxes and fees are not included.',
    ],
  };
}
