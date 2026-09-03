import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';
import { creditCardPayoff } from './finance/credit-card';
import { monthlyPrincipalAndInterest } from './finance/loan';
import { CREDIT_CARD_PAYOFF_ENGINE_ID } from './finance/version';

export const creditCardPayoffInputSchema = z.object({
  mode: z.enum(['payment', 'target-months']),
  balance: finiteNumber('Balance', 0.01, 10_000_000),
  aprPercent: finiteNumber('APR', 0, 80),
  monthlyPayment: finiteNumber('Monthly payment', 0, 1_000_000),
  targetMonths: finiteNumber('Target months', 1, 600).refine(Number.isInteger, 'Target months must be a whole number.'),
});

export function calculateCreditCardPayoff(rawInput: unknown): CalculationResult<{
  status: 'paid-off' | 'does-not-pay-off';
  months: number;
  totalInterest: number;
  totalPaid: number;
  monthlyPayment: number;
  stopReason?: string;
}> {
  const input = creditCardPayoffInputSchema.parse(rawInput);
  const monthlyPayment = input.mode === 'target-months'
    ? monthlyPrincipalAndInterest(input.balance, input.aprPercent, input.targetMonths)
    : input.monthlyPayment;
  const result = creditCardPayoff({
    balance: input.balance,
    aprPercent: input.aprPercent,
    monthlyPayment,
  });
  return {
    value: {
      status: result.status,
      months: result.months,
      totalInterest: round(result.totalInterest),
      totalPaid: round(result.totalPaid),
      monthlyPayment: round(monthlyPayment),
      stopReason: result.stopReason,
    },
    calculationVersion: CREDIT_CARD_PAYOFF_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Monthly payment', value: formatMoney(monthlyPayment) },
      { label: result.status === 'paid-off' ? 'Months to payoff' : 'Payoff', value: result.status === 'paid-off' ? `${result.months}` : 'Does not pay off in range' },
      { label: 'Total interest', value: formatMoney(result.totalInterest) },
    ],
    assumptions: [
      'This is a single revolving balance with a constant monthly payment and a nominal monthly rate of APR ÷ 12.',
      'Issuer compounding, grace periods, fees, and penalty APRs are not modeled.',
      'If the payment is at or below the first month’s interest, the balance does not pay down.',
      'For several debts and payoff order, use the Debt Payoff Calculator.',
    ],
  };
}
