export const MONTHS_PER_YEAR = 12;
export const LOAN_SIMULATION_MONTH_CAP = 1_200;
const BALANCE_EPSILON = 1e-9;

function monthlyRate(annualRatePercent: number): number {
  return annualRatePercent / 100 / MONTHS_PER_YEAR;
}

export function monthlyPaymentFactor(annualRatePercent: number, paymentCount: number): number {
  if (paymentCount === 0) throw new Error('Loan term must include at least one payment.');
  if (annualRatePercent === 0) return 1 / paymentCount;
  const rate = monthlyRate(annualRatePercent);
  const growth = (1 + rate) ** paymentCount;
  return rate * growth / (growth - 1);
}

export function monthlyPrincipalAndInterest(
  loanAmount: number,
  annualRatePercent: number,
  paymentCount: number,
): number {
  return loanAmount * monthlyPaymentFactor(annualRatePercent, paymentCount);
}

export function loanFromMonthlyPrincipalAndInterest(
  monthlyPayment: number,
  annualRatePercent: number,
  paymentCount: number,
): number {
  const factor = monthlyPaymentFactor(annualRatePercent, paymentCount);
  if (factor === 0) throw new Error('The payment factor is zero.');
  return monthlyPayment / factor;
}

export function remainingBalance(
  loanAmount: number,
  annualRatePercent: number,
  paymentCount: number,
  paymentsMade: number,
): number {
  if (paymentCount < 1) throw new Error('Loan term must include at least one payment.');
  if (paymentsMade <= 0) return loanAmount;
  if (paymentsMade >= paymentCount) return 0;
  if (annualRatePercent === 0) return loanAmount * (1 - paymentsMade / paymentCount);
  const rate = monthlyRate(annualRatePercent);
  const payment = monthlyPrincipalAndInterest(loanAmount, annualRatePercent, paymentCount);
  const growth = (1 + rate) ** paymentsMade;
  return loanAmount * growth - payment * (growth - 1) / rate;
}

export type ExtraPaymentPlan = {
  recurringMonthly?: number;
  oneTime?: ReadonlyArray<{ period: number; amount: number }>;
};

export type AmortizationPayment = {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  extraPrincipal: number;
  remainingBalance: number;
};

export type AmortizationSummary = {
  scheduledMonthlyPayment: number;
  scheduledPeriods: number;
  actualPeriods: number;
  totalInterest: number;
  totalPaid: number;
  interestSaved: number;
  periodsSaved: number;
  paidOff: boolean;
  firstPayment: AmortizationPayment;
  finalPayment: AmortizationPayment;
};

function extraPlanHasPayments(extra: ExtraPaymentPlan): boolean {
  const recurring = extra.recurringMonthly ?? 0;
  if (recurring < 0) throw new Error('Extra payments cannot be negative.');
  if (recurring > 0) return true;
  return Boolean(extra.oneTime?.some((item) => item.amount > 0 && item.period > 0));
}

function closedFormFirstPayment(
  loanAmount: number,
  annualRatePercent: number,
  scheduledMonthlyPayment: number,
  paymentCount: number,
): AmortizationPayment {
  const interest = loanAmount * monthlyRate(annualRatePercent);
  const principal = scheduledMonthlyPayment - interest;
  const remaining = remainingBalance(loanAmount, annualRatePercent, paymentCount, 1);
  return {
    period: 1,
    payment: scheduledMonthlyPayment,
    principal,
    interest,
    extraPrincipal: 0,
    remainingBalance: remaining,
  };
}

function closedFormFinalPayment(
  loanAmount: number,
  annualRatePercent: number,
  scheduledMonthlyPayment: number,
  paymentCount: number,
): AmortizationPayment {
  const remainingBeforeLast = remainingBalance(loanAmount, annualRatePercent, paymentCount, paymentCount - 1);
  const interest = remainingBeforeLast * monthlyRate(annualRatePercent);
  const payment = remainingBeforeLast + interest;
  return {
    period: paymentCount,
    payment,
    principal: remainingBeforeLast,
    interest,
    extraPrincipal: 0,
    remainingBalance: 0,
  };
}

type SimulatedAmortization = AmortizationSummary & { rows: AmortizationPayment[] };

function simulateAmortization(
  loanAmount: number,
  annualRatePercent: number,
  paymentCount: number,
  extra: ExtraPaymentPlan,
): SimulatedAmortization {
  const scheduledMonthlyPayment = monthlyPrincipalAndInterest(loanAmount, annualRatePercent, paymentCount);
  const oneTimeByPeriod = new Map<number, number>();
  for (const item of extra.oneTime ?? []) {
    if (item.period < 1 || item.amount <= 0) continue;
    oneTimeByPeriod.set(item.period, (oneTimeByPeriod.get(item.period) ?? 0) + item.amount);
  }
  const recurring = extra.recurringMonthly ?? 0;
  const baselineInterest = scheduledMonthlyPayment * paymentCount - loanAmount;
  const maxPeriods = Math.min(LOAN_SIMULATION_MONTH_CAP, Math.max(paymentCount, 1));

  let balance = loanAmount;
  let totalInterest = 0;
  let totalPaid = 0;
  let period = 0;
  const rows: AmortizationPayment[] = [];

  while (balance > BALANCE_EPSILON && period < maxPeriods) {
    period += 1;
    const interest = annualRatePercent === 0 ? 0 : balance * monthlyRate(annualRatePercent);
    const extraThisPeriod = recurring + (oneTimeByPeriod.get(period) ?? 0);
    const amountDue = balance + interest;
    const requestedPayment = scheduledMonthlyPayment + extraThisPeriod;
    const payment = Math.min(requestedPayment, amountDue);
    const principal = payment - interest;
    const extraPrincipal = Math.max(0, payment - scheduledMonthlyPayment);
    balance = amountDue - payment;
    if (balance < BALANCE_EPSILON) balance = 0;
    totalInterest += interest;
    totalPaid += payment;
    rows.push({
      period,
      payment,
      principal,
      interest,
      extraPrincipal,
      remainingBalance: balance,
    });
  }

  const firstPayment = rows[0];
  const finalPayment = rows.at(-1);
  if (!firstPayment || !finalPayment) {
    throw new Error('The loan produced no payments.');
  }

  return {
    scheduledMonthlyPayment,
    scheduledPeriods: paymentCount,
    actualPeriods: period,
    totalInterest,
    totalPaid,
    interestSaved: Math.max(0, baselineInterest - totalInterest),
    periodsSaved: Math.max(0, paymentCount - period),
    paidOff: balance <= BALANCE_EPSILON,
    firstPayment,
    finalPayment,
    rows,
  };
}

export function amortizationSchedule(
  loanAmount: number,
  annualRatePercent: number,
  paymentCount: number,
  extra: ExtraPaymentPlan = {},
): AmortizationPayment[] {
  if (!(loanAmount > 0) || !Number.isFinite(loanAmount)) {
    throw new Error('Loan amount must be a positive finite number.');
  }
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) {
    throw new Error('Interest rate must be a finite number that is at least 0.');
  }
  if (!Number.isInteger(paymentCount) || paymentCount < 1) {
    throw new Error('Loan term must include at least one payment.');
  }
  return simulateAmortization(loanAmount, annualRatePercent, paymentCount, extra).rows;
}

/** One pass: summary totals plus the payment rows used by schedule UIs. */
export function amortizeLoan(
  loanAmount: number,
  annualRatePercent: number,
  paymentCount: number,
  extra: ExtraPaymentPlan = {},
): SimulatedAmortization {
  if (!(loanAmount > 0) || !Number.isFinite(loanAmount)) {
    throw new Error('Loan amount must be a positive finite number.');
  }
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) {
    throw new Error('Interest rate must be a finite number that is at least 0.');
  }
  if (!Number.isInteger(paymentCount) || paymentCount < 1) {
    throw new Error('Loan term must include at least one payment.');
  }
  return simulateAmortization(loanAmount, annualRatePercent, paymentCount, extra);
}

export function summarizeAmortization(
  loanAmount: number,
  annualRatePercent: number,
  paymentCount: number,
  extra: ExtraPaymentPlan = {},
): AmortizationSummary {
  if (!(loanAmount > 0) || !Number.isFinite(loanAmount)) {
    throw new Error('Loan amount must be a positive finite number.');
  }
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) {
    throw new Error('Interest rate must be a finite number that is at least 0.');
  }
  if (!Number.isInteger(paymentCount) || paymentCount < 1) {
    throw new Error('Loan term must include at least one payment.');
  }

  const scheduledMonthlyPayment = monthlyPrincipalAndInterest(loanAmount, annualRatePercent, paymentCount);
  if (!extraPlanHasPayments(extra)) {
    const totalPaid = scheduledMonthlyPayment * paymentCount;
    return {
      scheduledMonthlyPayment,
      scheduledPeriods: paymentCount,
      actualPeriods: paymentCount,
      totalInterest: totalPaid - loanAmount,
      totalPaid,
      interestSaved: 0,
      periodsSaved: 0,
      paidOff: true,
      firstPayment: closedFormFirstPayment(loanAmount, annualRatePercent, scheduledMonthlyPayment, paymentCount),
      finalPayment: closedFormFinalPayment(loanAmount, annualRatePercent, scheduledMonthlyPayment, paymentCount),
    };
  }

  return simulateAmortization(loanAmount, annualRatePercent, paymentCount, extra);
}
