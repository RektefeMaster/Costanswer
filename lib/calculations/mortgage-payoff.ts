import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { addCalendarMonths, formatDateOnly, isValidDateOnly, parseDateOnly } from './datetime/calendar';
import { monthlyPrincipalAndInterest, summarizeAmortization } from './finance/loan';
import { MORTGAGE_PAYOFF_ENGINE_ID } from './finance/version';

const optionalDate = z.string().refine((value) => value === '' || isValidDateOnly(value), 'Use a valid start date.');

export const mortgagePayoffInputSchema = z.object({
  currentPrincipal: finiteNumber('Current principal', 1, 100_000_000),
  annualRatePercent: finiteNumber('Interest rate', 0, 40),
  remainingMonths: finiteNumber('Remaining term', 1, 480).refine(Number.isInteger, 'Remaining term must be a whole number of months.'),
  extraMonthlyPayment: finiteNumber('Extra monthly principal', 0, 10_000_000),
  startDate: optionalDate,
});

export function calculateMortgagePayoff(rawInput: unknown): CalculationResult<{
  scheduledPayment: number;
  baselineMonths: number;
  acceleratedMonths: number;
  monthsSaved: number;
  baselineInterest: number;
  acceleratedInterest: number;
  interestSaved: number;
  baselinePayoffDate?: string;
  acceleratedPayoffDate?: string;
}> {
  const input = mortgagePayoffInputSchema.parse(rawInput);
  const scheduledPayment = monthlyPrincipalAndInterest(input.currentPrincipal, input.annualRatePercent, input.remainingMonths);
  const baseline = summarizeAmortization(input.currentPrincipal, input.annualRatePercent, input.remainingMonths);
  const accelerated = summarizeAmortization(
    input.currentPrincipal,
    input.annualRatePercent,
    input.remainingMonths,
    { recurringMonthly: input.extraMonthlyPayment },
  );
  const start = input.startDate ? parseDateOnly(input.startDate) : null;
  const baselinePayoffDate = start ? formatDateOnly(addCalendarMonths(start, baseline.actualPeriods - 1)) : undefined;
  const acceleratedPayoffDate = start ? formatDateOnly(addCalendarMonths(start, accelerated.actualPeriods - 1)) : undefined;
  return {
    value: {
      scheduledPayment: round(scheduledPayment),
      baselineMonths: baseline.actualPeriods,
      acceleratedMonths: accelerated.actualPeriods,
      monthsSaved: accelerated.periodsSaved,
      baselineInterest: round(baseline.totalInterest),
      acceleratedInterest: round(accelerated.totalInterest),
      interestSaved: round(accelerated.interestSaved),
      baselinePayoffDate,
      acceleratedPayoffDate,
    },
    calculationVersion: MORTGAGE_PAYOFF_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Scheduled P&I', value: formatMoney(scheduledPayment) },
      { label: 'Months saved', value: `${accelerated.periodsSaved}`, detail: `${formatNumber(accelerated.periodsSaved / 12, { maximumFractionDigits: 1 })} years sooner` },
      { label: 'Interest saved', value: formatMoney(accelerated.interestSaved) },
    ],
    assumptions: [
      'The remaining payment is derived from the current balance, rate, and remaining term using the same amortization primitive as the Mortgage Payment Calculator.',
      'Extra principal is added every month. Taxes, insurance, and escrow are not included.',
      'This is not a lender recast, refinance analysis, or financial advice.',
    ],
  };
}
