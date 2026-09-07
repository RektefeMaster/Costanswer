import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { monthlyPrincipalAndInterest, remainingBalance } from './finance/loan';
import { REFINANCE_ENGINE_ID } from './finance/version';

export const refinanceInputSchema = z.object({
  currentBalance: finiteNumber('Current loan balance', 1, 100_000_000),
  currentRatePercent: finiteNumber('Current interest rate', 0, 25),
  currentTermYears: finiteNumber('Original term', 1, 50),
  monthsAlreadyPaid: finiteNumber('Months already paid', 0, 600).refine(Number.isInteger, 'Payments already made must be a whole number of months.'),
  newRatePercent: finiteNumber('New interest rate', 0, 25),
  newTermYears: finiteNumber('New term', 1, 50),
  closingCosts: finiteNumber('Closing costs', 0, 1_000_000),
  /** Rolling costs into the loan means borrowing them, not avoiding them. */
  financeClosingCosts: z.boolean(),
}).refine((input) => input.monthsAlreadyPaid < Math.round(input.currentTermYears * 12), {
  message: 'Payments already made must be less than the original loan term.',
  path: ['monthsAlreadyPaid'],
});

export type RefinanceInput = z.infer<typeof refinanceInputSchema>;

export type RefinanceValue = {
  currentMonthlyPayment: number;
  newMonthlyPayment: number;
  monthlyChange: number;
  newLoanAmount: number;
  /** Months of payment savings needed to cover what the refinance costs. */
  breakEvenMonths: number | null;
  monthsLeftOnCurrentLoan: number;
  newPaymentCount: number;
  currentRemainingInterest: number;
  newTotalInterest: number;
  lifetimeInterestChange: number;
  /** True when the new loan costs less every month but more in total interest. */
  lowerPaymentHigherInterest: boolean;
  cashOutlay: number;
};

/**
 * Compare a mortgage you already have with one you could replace it with.
 *
 * The number that decides a refinance is not the new payment, it is how long
 * the lower payment takes to pay back the closing costs, and whether stretching
 * the term back out costs more interest than the lower rate saves. Both are
 * easy to get wrong by eye and neither is what a payment calculator shows.
 */
export function calculateRefinance(rawInput: unknown): CalculationResult<RefinanceValue> {
  const input = refinanceInputSchema.parse(rawInput);
  const currentPaymentCount = Math.round(input.currentTermYears * 12);
  const paid = input.monthsAlreadyPaid;
  const monthsLeft = currentPaymentCount - paid;

  // The balance is what the reader typed; the payment is the one that amortizes
  // the original loan, so it has to be derived from the original principal.
  const originalPrincipal = paid === 0
    ? input.currentBalance
    : originalPrincipalFromRemaining(input.currentBalance, input.currentRatePercent, currentPaymentCount, paid);
  const currentMonthlyPayment = monthlyPrincipalAndInterest(originalPrincipal, input.currentRatePercent, currentPaymentCount);
  const currentRemainingInterest = currentMonthlyPayment * monthsLeft - input.currentBalance;

  const newLoanAmount = input.financeClosingCosts ? input.currentBalance + input.closingCosts : input.currentBalance;
  const newPaymentCount = Math.round(input.newTermYears * 12);
  const newMonthlyPayment = monthlyPrincipalAndInterest(newLoanAmount, input.newRatePercent, newPaymentCount);
  const newTotalInterest = newMonthlyPayment * newPaymentCount - newLoanAmount;

  const monthlyChange = currentMonthlyPayment - newMonthlyPayment;
  const cashOutlay = input.financeClosingCosts ? 0 : input.closingCosts;
  // Financed costs are still paid, just inside the new payment, so break-even
  // is always measured against the full closing costs.
  const breakEvenMonths = monthlyChange > 0 ? Math.ceil(input.closingCosts / monthlyChange) : null;
  const lifetimeInterestChange = newTotalInterest + input.closingCosts - currentRemainingInterest;

  return {
    value: {
      currentMonthlyPayment: round(currentMonthlyPayment),
      newMonthlyPayment: round(newMonthlyPayment),
      monthlyChange: round(monthlyChange),
      newLoanAmount: round(newLoanAmount),
      breakEvenMonths,
      monthsLeftOnCurrentLoan: monthsLeft,
      newPaymentCount,
      currentRemainingInterest: round(currentRemainingInterest),
      newTotalInterest: round(newTotalInterest),
      lifetimeInterestChange: round(lifetimeInterestChange),
      lowerPaymentHigherInterest: monthlyChange > 0 && lifetimeInterestChange > 0,
      cashOutlay: round(cashOutlay),
    },
    calculationVersion: REFINANCE_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      {
        label: 'Payment you have now',
        value: formatMoney(currentMonthlyPayment),
        detail: `${formatNumber(input.currentRatePercent, { maximumFractionDigits: 3 })}% with ${monthsLeft} payments left`,
      },
      {
        label: 'Payment after refinancing',
        value: formatMoney(newMonthlyPayment),
        detail: `${formatMoney(newLoanAmount, 0)} at ${formatNumber(input.newRatePercent, { maximumFractionDigits: 3 })}% over ${input.newTermYears} years`,
      },
      {
        label: monthlyChange >= 0 ? 'Monthly saving' : 'Monthly increase',
        value: formatMoney(Math.abs(monthlyChange)),
        detail: input.financeClosingCosts ? 'Closing costs are inside the new loan' : `${formatMoney(input.closingCosts, 0)} paid at closing`,
      },
      {
        label: 'Break-even',
        value: breakEvenMonths === null ? 'Never' : `${breakEvenMonths} months`,
        detail: breakEvenMonths === null
          ? 'The new payment is not lower, so closing costs are never recovered by payment savings'
          : 'Months of lower payments needed to cover the closing costs',
      },
      {
        label: lifetimeInterestChange <= 0 ? 'Interest saved over the life' : 'Extra interest over the life',
        value: formatMoney(Math.abs(lifetimeInterestChange), 0),
        detail: 'Remaining interest on the loan you have, against interest plus closing costs on the new one',
      },
    ],
    assumptions: [
      'Both loans are fixed-rate and are compared on principal and interest only. Property tax, insurance, HOA, and PMI are unchanged by refinancing and are left out.',
      'Break-even is closing costs divided by the monthly saving. It ignores what that money could have earned elsewhere, and assumes you keep the loan that long.',
      input.financeClosingCosts
        ? 'Closing costs are rolled into the new balance. That does not avoid them: you borrow them and pay interest on them, and break-even still counts the full amount.'
        : 'Closing costs are paid up front and are not added to the new balance.',
      'The lifetime comparison assumes both loans run to the end of their terms. Selling, moving, or refinancing again changes it.',
      'A refinance that lowers the payment by stretching the term can still cost more in total interest. Both figures are shown so the trade is visible.',
      'This is not a loan estimate. Rate, costs, and eligibility come from a lender.',
    ],
  };
}

/**
 * Recover the original principal from a remaining balance.
 *
 * Someone refinancing knows what they owe today and when they started, not what
 * they borrowed, so the payment has to be reconstructed from the balance rather
 * than assuming the balance is the original loan.
 */
function originalPrincipalFromRemaining(
  balance: number,
  annualRatePercent: number,
  paymentCount: number,
  paymentsMade: number,
): number {
  const unitRemaining = remainingBalance(1, annualRatePercent, paymentCount, paymentsMade);
  if (unitRemaining <= 0) throw new Error('This loan would already be paid off after that many payments.');
  return balance / unitRemaining;
}
