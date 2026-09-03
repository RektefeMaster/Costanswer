import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { addCalendarMonths, formatDateOnly, isValidDateOnly, parseDateOnly } from './datetime/calendar';
import { amortizeLoan } from './finance/loan';
import { AMORTIZATION_ENGINE_ID } from './finance/version';

const optionalDate = z.string().refine((value) => value === '' || isValidDateOnly(value), 'Use a valid start date.');

export const amortizationInputSchema = z.object({
  principal: finiteNumber('Principal', 1, 100_000_000),
  annualRatePercent: finiteNumber('Interest rate', 0, 40),
  termMonths: finiteNumber('Term', 1, 480).refine(Number.isInteger, 'Term must be a whole number of months.'),
  extraMonthlyPayment: finiteNumber('Extra payment', 0, 10_000_000),
  startDate: optionalDate,
});

export type AmortizationRow = {
  period: number;
  date?: string;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
};

export function calculateAmortization(rawInput: unknown): CalculationResult<{
  monthlyPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  actualPeriods: number;
  schedule: AmortizationRow[];
}> {
  const input = amortizationInputSchema.parse(rawInput);
  const extra = { recurringMonthly: input.extraMonthlyPayment };
  const start = input.startDate ? parseDateOnly(input.startDate) : null;
  const simulated = amortizeLoan(input.principal, input.annualRatePercent, input.termMonths, extra);
  const schedule = simulated.rows.map((row) => ({
    period: row.period,
    date: start ? formatDateOnly(addCalendarMonths(start, row.period - 1)) : undefined,
    payment: round(row.payment),
    principal: round(row.principal),
    interest: round(row.interest),
    remainingBalance: round(row.remainingBalance),
  }));
  return {
    value: {
      monthlyPayment: round(simulated.scheduledMonthlyPayment),
      totalPrincipal: round(input.principal),
      totalInterest: round(simulated.totalInterest),
      actualPeriods: simulated.actualPeriods,
      schedule,
    },
    calculationVersion: AMORTIZATION_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Monthly payment', value: formatMoney(simulated.scheduledMonthlyPayment), detail: `${formatNumber(input.annualRatePercent, { maximumFractionDigits: 3 })}% for ${input.termMonths} scheduled months` },
      { label: 'Total interest', value: formatMoney(simulated.totalInterest) },
      { label: 'Payoff', value: `${simulated.actualPeriods} payments`, detail: simulated.periodsSaved > 0 ? `${simulated.periodsSaved} months sooner with extra principal` : 'Scheduled term' },
    ],
    assumptions: [
      'The schedule uses the same fixed-rate amortization primitive as the Loan Calculator.',
      'The rate is a nominal annual interest rate, compounded monthly, not APR.',
      'Extra principal, if entered, is added every month until the balance is gone.',
      'Dates, when shown, are calendar months from the start date with end-of-month clamping.',
    ],
  };
}
