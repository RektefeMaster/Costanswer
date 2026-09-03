export const DEBT_PAYOFF_STRATEGIES = ['snowball', 'avalanche'] as const;
export type DebtPayoffStrategy = (typeof DEBT_PAYOFF_STRATEGIES)[number];
export const DEBT_PAYOFF_MONTH_CAP = 600;
const BALANCE_EPSILON = 1e-8;

export type DebtAccount = {
  id: string;
  label: string;
  balance: number;
  annualRatePercent: number;
  minimumPayment: number;
  originalIndex: number;
};

export type DebtPayoffStatus = 'paid-off' | 'does-not-pay-off';
export type DebtPayoffStopReason = 'negative-amortization' | 'horizon-exceeded';

export type DebtStrategyResult = {
  strategy: DebtPayoffStrategy;
  status: DebtPayoffStatus;
  months: number;
  totalInterest: number;
  totalPaid: number;
  payoffOrder: string[];
  stopReason?: DebtPayoffStopReason;
};

type WorkingDebt = DebtAccount & { balance: number };

function monthlyInterest(debt: WorkingDebt): number {
  if (debt.balance <= BALANCE_EPSILON || debt.annualRatePercent === 0) return 0;
  return debt.balance * (debt.annualRatePercent / 100 / 12);
}

function compareSnowball(left: WorkingDebt, right: WorkingDebt): number {
  const balanceDelta = left.balance - right.balance;
  if (balanceDelta !== 0 && Number.isFinite(balanceDelta)) return balanceDelta;
  const rateDelta = right.annualRatePercent - left.annualRatePercent;
  if (rateDelta !== 0 && Number.isFinite(rateDelta)) return rateDelta;
  return left.originalIndex - right.originalIndex;
}

function compareAvalanche(left: WorkingDebt, right: WorkingDebt): number {
  const rateDelta = right.annualRatePercent - left.annualRatePercent;
  if (rateDelta !== 0 && Number.isFinite(rateDelta)) return rateDelta;
  const balanceDelta = left.balance - right.balance;
  if (balanceDelta !== 0 && Number.isFinite(balanceDelta)) return balanceDelta;
  return left.originalIndex - right.originalIndex;
}

function compareForStrategy(strategy: DebtPayoffStrategy): (left: WorkingDebt, right: WorkingDebt) => number {
  switch (strategy) {
    case 'snowball':
      return compareSnowball;
    case 'avalanche':
      return compareAvalanche;
    default: {
      const exhaustive: never = strategy;
      throw new Error(`Unhandled debt payoff strategy: ${exhaustive}`);
    }
  }
}

function sortLiving(debts: WorkingDebt[], strategy: DebtPayoffStrategy): WorkingDebt[] {
  return debts.filter((debt) => debt.balance > BALANCE_EPSILON).sort(compareForStrategy(strategy));
}

export function simulateDebtPayoff(
  debts: readonly DebtAccount[],
  additionalMonthlyPayment: number,
  strategy: DebtPayoffStrategy,
): DebtStrategyResult {
  if (!Number.isFinite(additionalMonthlyPayment) || additionalMonthlyPayment < 0) {
    throw new Error('Additional monthly payment cannot be negative.');
  }
  if (debts.length === 0) throw new Error('Add at least one debt.');

  const working: WorkingDebt[] = debts.map((debt) => ({ ...debt, balance: debt.balance }));
  const monthlyBudget = working.reduce((sum, debt) => sum + debt.minimumPayment, 0) + additionalMonthlyPayment;
  if (monthlyBudget <= 0) {
    return {
      strategy,
      status: 'does-not-pay-off',
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      payoffOrder: [],
      stopReason: 'negative-amortization',
    };
  }

  let months = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const payoffOrder: string[] = [];
  let sawUnservicedInterest = false;

  for (let month = 1; month <= DEBT_PAYOFF_MONTH_CAP; month += 1) {
    if (!working.some((debt) => debt.balance > BALANCE_EPSILON)) {
      return {
        strategy,
        status: 'paid-off',
        months,
        totalInterest,
        totalPaid,
        payoffOrder,
      };
    }

    months = month;
    let monthInterest = 0;
    for (const debt of working) {
      if (debt.balance <= BALANCE_EPSILON) continue;
      const interest = monthlyInterest(debt);
      debt.balance += interest;
      monthInterest += interest;
    }
    totalInterest += monthInterest;
    if (monthInterest > monthlyBudget + BALANCE_EPSILON) sawUnservicedInterest = true;

    const living = sortLiving(working, strategy);
    let remainingBudget = monthlyBudget;

    for (const debt of living) {
      const minPay = Math.min(debt.minimumPayment, debt.balance);
      const pay = Math.min(minPay, remainingBudget);
      debt.balance -= pay;
      remainingBudget -= pay;
      totalPaid += pay;
      if (debt.balance <= BALANCE_EPSILON) {
        debt.balance = 0;
        payoffOrder.push(debt.id);
      }
    }

    for (const debt of sortLiving(working, strategy)) {
      if (remainingBudget <= BALANCE_EPSILON) break;
      const extraPay = Math.min(remainingBudget, debt.balance);
      debt.balance -= extraPay;
      remainingBudget -= extraPay;
      totalPaid += extraPay;
      if (debt.balance <= BALANCE_EPSILON) {
        debt.balance = 0;
        if (!payoffOrder.includes(debt.id)) payoffOrder.push(debt.id);
      }
    }
  }

  const remainingInterest = working.reduce((sum, debt) => sum + monthlyInterest(debt), 0);
  return {
    strategy,
    status: 'does-not-pay-off',
    months: DEBT_PAYOFF_MONTH_CAP,
    totalInterest,
    totalPaid,
    payoffOrder,
    stopReason: sawUnservicedInterest || remainingInterest >= monthlyBudget - BALANCE_EPSILON
      ? 'negative-amortization'
      : 'horizon-exceeded',
  };
}

export function compareDebtPayoffStrategies(
  debts: readonly DebtAccount[],
  additionalMonthlyPayment: number,
): { snowball: DebtStrategyResult; avalanche: DebtStrategyResult } {
  return {
    snowball: simulateDebtPayoff(debts, additionalMonthlyPayment, 'snowball'),
    avalanche: simulateDebtPayoff(debts, additionalMonthlyPayment, 'avalanche'),
  };
}
