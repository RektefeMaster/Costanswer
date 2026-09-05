import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import {
  compareDebtPayoffStrategies,
  DEBT_PAYOFF_MONTH_CAP,
  type DebtAccount,
  type DebtPayoffStopReason,
  type DebtStrategyResult,
} from './finance/debt-payoff';
import { DEBT_PAYOFF_ENGINE_ID } from './finance/version';

export { DEBT_PAYOFF_ENGINE_ID, DEBT_PAYOFF_MONTH_CAP };

export const MAX_DEBT_ACCOUNTS = 10;

const debtAccountSchema = z.object({
  id: z.string().min(1, 'Each debt needs an id.'),
  label: z.string().trim().min(1, 'Give each debt a name.').max(80, 'Debt names must be 80 characters or fewer.'),
  balance: finiteNumber('Debt balance', 0.01, 10_000_000),
  annualRatePercent: finiteNumber('Interest rate', 0, 80),
  minimumPayment: finiteNumber('Minimum payment', 0, 1_000_000),
});

export const debtPayoffInputSchema = z.object({
  debts: z.array(debtAccountSchema).min(1, 'Add at least one debt.').max(MAX_DEBT_ACCOUNTS, `You can compare up to ${MAX_DEBT_ACCOUNTS} debts.`),
  additionalMonthlyPayment: finiteNumber('Additional monthly payment', 0, 10_000_000),
}).superRefine((input, context) => {
  const ids = new Set<string>();
  for (const [index, debt] of input.debts.entries()) {
    if (ids.has(debt.id)) {
      context.addIssue({ code: 'custom', path: ['debts', index, 'id'], message: 'Each debt needs a unique id.' });
    }
    ids.add(debt.id);
  }
});

export type DebtPayoffInput = z.infer<typeof debtPayoffInputSchema>;

export type DebtPayoffStrategyView = {
  status: DebtStrategyResult['status'];
  months: number;
  totalInterest: number;
  totalPaid: number;
  payoffOrder: string[];
  stopReason?: DebtPayoffStopReason;
};

export type DebtPayoffValue = {
  snowball: DebtPayoffStrategyView;
  avalanche: DebtPayoffStrategyView;
  interestDifference: number;
  monthsDifference: number;
  bothPaidOff: boolean;
  additionalMonthlyPayment: number;
  debtCount: number;
};

function roundStrategy(result: DebtStrategyResult): DebtPayoffStrategyView {
  return {
    status: result.status,
    months: result.months,
    totalInterest: round(result.totalInterest),
    totalPaid: round(result.totalPaid),
    payoffOrder: result.payoffOrder,
    ...(result.stopReason ? { stopReason: result.stopReason } : {}),
  };
}

export function formatPayoffDuration(months: number): string {
  if (months <= 0) return '0 months';
  const years = Math.floor(months / 12);
  const leftover = months % 12;
  if (years === 0) return leftover === 1 ? '1 month' : `${leftover} months`;
  const yearLabel = years === 1 ? '1 year' : `${years} years`;
  if (leftover === 0) return yearLabel;
  return leftover === 1 ? `${yearLabel} 1 month` : `${yearLabel} ${leftover} months`;
}

function stopReasonDetail(reason: DebtPayoffStopReason | undefined): string {
  switch (reason) {
    case 'negative-amortization':
      return 'The monthly budget never covers the interest, so balances can grow.';
    case 'horizon-exceeded':
      return `The debts were still open after ${DEBT_PAYOFF_MONTH_CAP} months.`;
    case undefined:
      return 'The debts were still open at the safety limit.';
    default: {
      const exhaustive: never = reason;
      throw new Error(`Unhandled payoff stop reason: ${exhaustive}`);
    }
  }
}

function accountsFromInput(input: DebtPayoffInput): DebtAccount[] {
  return input.debts.map((debt, originalIndex) => ({
    id: debt.id,
    label: debt.label,
    balance: debt.balance,
    annualRatePercent: debt.annualRatePercent,
    minimumPayment: debt.minimumPayment,
    originalIndex,
  }));
}

export function calculateDebtPayoff(rawInput: unknown): CalculationResult<DebtPayoffValue> {
  const input = debtPayoffInputSchema.parse(rawInput);
  const comparison = compareDebtPayoffStrategies(accountsFromInput(input), input.additionalMonthlyPayment);
  const snowball = roundStrategy(comparison.snowball);
  const avalanche = roundStrategy(comparison.avalanche);
  const bothPaidOff = snowball.status === 'paid-off' && avalanche.status === 'paid-off';
  const interestDifference = bothPaidOff ? round(comparison.snowball.totalInterest - comparison.avalanche.totalInterest) : 0;
  const monthsDifference = bothPaidOff ? snowball.months - avalanche.months : 0;
  const comparisonDetail = !bothPaidOff
    ? 'One or both methods do not pay the debts off inside the safety limit.'
    : interestDifference > 0
      ? `Avalanche saves ${formatMoney(interestDifference)} of interest versus snowball.`
      : interestDifference < 0
        ? `Snowball saves ${formatMoney(Math.abs(interestDifference))} of interest versus avalanche.`
        : 'Both orders cost the same interest on these numbers.';

  return {
    value: {
      snowball,
      avalanche,
      interestDifference,
      monthsDifference,
      bothPaidOff,
      additionalMonthlyPayment: round(input.additionalMonthlyPayment),
      debtCount: input.debts.length,
    },
    calculationVersion: DEBT_PAYOFF_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      {
        label: 'Snowball',
        value: snowball.status === 'paid-off' ? formatPayoffDuration(snowball.months) : 'Does not pay off',
        detail: snowball.status === 'paid-off'
          ? `${formatMoney(snowball.totalInterest)} interest · smallest balance first`
          : stopReasonDetail(snowball.stopReason),
      },
      {
        label: 'Avalanche',
        value: avalanche.status === 'paid-off' ? formatPayoffDuration(avalanche.months) : 'Does not pay off',
        detail: avalanche.status === 'paid-off'
          ? `${formatMoney(avalanche.totalInterest)} interest · highest rate first`
          : stopReasonDetail(avalanche.stopReason),
      },
      {
        label: 'Interest comparison',
        value: bothPaidOff ? formatMoney(Math.abs(interestDifference)) : 'n/a',
        detail: comparisonDetail,
      },
    ],
    assumptions: [
      'Snowball pays the smallest remaining balance first. Avalanche pays the highest interest rate first. Ties use the original list order.',
      'Each month, interest is added first. Then every open debt gets its minimum, and any leftover budget, including minimums freed after a debt is paid off, goes to the current target.',
      `The monthly budget stays at the original minimums plus the extra ${formatMoney(input.additionalMonthlyPayment)} you typed, even after a debt is gone.`,
      'Rates are nominal annual rates charged monthly. This is not an APR quote and does not include fees or penalty interest.',
      `The simulation stops at ${formatNumber(DEBT_PAYOFF_MONTH_CAP)} months so a payment that cannot cover interest cannot run forever.`,
    ],
  };
}
