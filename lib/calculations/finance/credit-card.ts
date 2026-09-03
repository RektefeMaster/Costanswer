import { MONTHS_PER_YEAR } from './loan';

export const CREDIT_CARD_MONTH_CAP = 600;
const BALANCE_EPSILON = 1e-9;

export type CreditCardPayoffStatus = 'paid-off' | 'does-not-pay-off';
export type CreditCardStopReason = 'payment-at-or-below-interest' | 'horizon-exceeded' | 'zero-payment';

export type CreditCardPayoff = {
  status: CreditCardPayoffStatus;
  months: number;
  totalInterest: number;
  totalPaid: number;
  monthlyPayment: number;
  monthlyInterestFirst: number;
  stopReason?: CreditCardStopReason;
};

function monthlyRate(aprPercent: number): number {
  return aprPercent / 100 / MONTHS_PER_YEAR;
}

export function creditCardPayoff(input: {
  balance: number;
  aprPercent: number;
  monthlyPayment: number;
}): CreditCardPayoff {
  const { balance, aprPercent, monthlyPayment } = input;
  if (!(balance > 0) || !Number.isFinite(balance)) throw new Error('Balance must be a positive finite number.');
  if (!Number.isFinite(aprPercent) || aprPercent < 0 || aprPercent > 80) {
    throw new Error('APR must be a finite number from 0 to 80.');
  }
  if (!Number.isFinite(monthlyPayment) || monthlyPayment < 0) {
    throw new Error('Monthly payment must be a finite number that is at least 0.');
  }

  const firstInterest = balance * monthlyRate(aprPercent);
  if (monthlyPayment === 0) {
    return {
      status: 'does-not-pay-off',
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      monthlyPayment,
      monthlyInterestFirst: firstInterest,
      stopReason: 'zero-payment',
    };
  }
  if (monthlyPayment <= firstInterest + BALANCE_EPSILON && balance > monthlyPayment) {
    return {
      status: 'does-not-pay-off',
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      monthlyPayment,
      monthlyInterestFirst: firstInterest,
      stopReason: 'payment-at-or-below-interest',
    };
  }

  let remaining = balance;
  let months = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  while (remaining > BALANCE_EPSILON && months < CREDIT_CARD_MONTH_CAP) {
    months += 1;
    const interest = remaining * monthlyRate(aprPercent);
    const amountDue = remaining + interest;
    const payment = Math.min(monthlyPayment, amountDue);
    if (payment <= interest + BALANCE_EPSILON && remaining > payment) {
      return {
        status: 'does-not-pay-off',
        months,
        totalInterest,
        totalPaid,
        monthlyPayment,
        monthlyInterestFirst: firstInterest,
        stopReason: 'payment-at-or-below-interest',
      };
    }
    remaining = amountDue - payment;
    if (remaining < BALANCE_EPSILON) remaining = 0;
    totalInterest += interest;
    totalPaid += payment;
  }

  if (remaining > BALANCE_EPSILON) {
    return {
      status: 'does-not-pay-off',
      months,
      totalInterest,
      totalPaid,
      monthlyPayment,
      monthlyInterestFirst: firstInterest,
      stopReason: 'horizon-exceeded',
    };
  }

  return {
    status: 'paid-off',
    months,
    totalInterest,
    totalPaid,
    monthlyPayment,
    monthlyInterestFirst: firstInterest,
  };
}
