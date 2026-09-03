import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { MONTHS_PER_YEAR, summarizeAmortization } from './finance/loan';
import { LOAN_ENGINE_ID } from './finance/version';

export { LOAN_ENGINE_ID };

const termUnitSchema = z.enum(['years', 'months']);

export const loanInputSchema = z.object({
  loanAmount: finiteNumber('Loan amount', 1, 100_000_000),
  annualRatePercent: finiteNumber('Interest rate', 0, 40),
  termLength: finiteNumber('Loan term', 1, 480),
  termUnit: termUnitSchema,
  extraMonthlyPayment: finiteNumber('Extra monthly payment', 0, 10_000_000),
}).superRefine((input, context) => {
  if (!Number.isInteger(input.termLength)) {
    context.addIssue({ code: 'custom', path: ['termLength'], message: 'Loan term must be a whole number.' });
  }
  if (input.termUnit === 'years' && input.termLength > 40) {
    context.addIssue({ code: 'custom', path: ['termLength'], message: 'Loan term must be at most 40 years.' });
  }
});

export type LoanInput = z.infer<typeof loanInputSchema>;

export type LoanPaymentSlice = {
  period: number;
  payment: number;
  principal: number;
  interest: number;
};

export type LoanValue = {
  loanAmount: number;
  monthlyPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  totalRepayment: number;
  scheduledPeriods: number;
  actualPeriods: number;
  extraMonthlyPayment: number;
  interestSaved: number;
  periodsSaved: number;
  paidOff: boolean;
  firstPayment: LoanPaymentSlice;
  finalPayment: LoanPaymentSlice;
};

function paymentCountFor(termLength: number, termUnit: LoanInput['termUnit']): number {
  switch (termUnit) {
    case 'years':
      return termLength * MONTHS_PER_YEAR;
    case 'months':
      return termLength;
    default: {
      const exhaustive: never = termUnit;
      throw new Error(`Unhandled loan term unit: ${exhaustive}`);
    }
  }
}

function termLabel(termLength: number, termUnit: LoanInput['termUnit']): string {
  switch (termUnit) {
    case 'years':
      return `${termLength}-year`;
    case 'months':
      return `${termLength}-month`;
    default: {
      const exhaustive: never = termUnit;
      throw new Error(`Unhandled loan term unit: ${exhaustive}`);
    }
  }
}

function roundSlice(slice: { period: number; payment: number; principal: number; interest: number }): LoanPaymentSlice {
  return {
    period: slice.period,
    payment: round(slice.payment),
    principal: round(slice.principal),
    interest: round(slice.interest),
  };
}

export function calculateLoan(rawInput: unknown): CalculationResult<LoanValue> {
  const input = loanInputSchema.parse(rawInput);
  const paymentCount = paymentCountFor(input.termLength, input.termUnit);
  const summary = summarizeAmortization(input.loanAmount, input.annualRatePercent, paymentCount, {
    recurringMonthly: input.extraMonthlyPayment,
  });
  const firstPayment = roundSlice(summary.firstPayment);
  const finalPayment = roundSlice(summary.finalPayment);
  const extraNote = input.extraMonthlyPayment > 0
    ? `Including ${formatMoney(input.extraMonthlyPayment)} extra principal each month`
    : 'Scheduled principal and interest only';

  return {
    value: {
      loanAmount: round(input.loanAmount),
      monthlyPayment: round(summary.scheduledMonthlyPayment),
      totalPrincipal: round(input.loanAmount),
      totalInterest: round(summary.totalInterest),
      totalRepayment: round(summary.totalPaid),
      scheduledPeriods: summary.scheduledPeriods,
      actualPeriods: summary.actualPeriods,
      extraMonthlyPayment: round(input.extraMonthlyPayment),
      interestSaved: round(summary.interestSaved),
      periodsSaved: summary.periodsSaved,
      paidOff: summary.paidOff,
      firstPayment,
      finalPayment,
    },
    calculationVersion: LOAN_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      {
        label: 'Monthly payment',
        value: formatMoney(summary.scheduledMonthlyPayment),
        detail: `${termLabel(input.termLength, input.termUnit)} fixed at ${formatNumber(input.annualRatePercent, { maximumFractionDigits: 3 })}%`,
      },
      {
        label: 'Total interest',
        value: formatMoney(summary.totalInterest),
        detail: extraNote,
      },
      {
        label: 'Total repayment',
        value: formatMoney(summary.totalPaid),
        detail: `${formatMoney(input.loanAmount)} principal + interest`,
      },
    ],
    assumptions: [
      'This is a fixed-rate amortizing loan. It is not a lender quote, APR, or an offer to lend.',
      'The rate is a nominal annual interest rate, not APR. Origination fees and prepaid finance charges are left out.',
      'Payments are monthly. Interest is compounded monthly.',
      input.extraMonthlyPayment > 0
        ? 'Extra principal is added to every monthly payment until the loan is paid off. The last payment is only the remaining balance plus that month’s interest.'
        : 'No extra principal payments are included.',
      'Taxes, insurance, and fees are not included.',
    ],
  };
}
