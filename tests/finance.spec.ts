import { describe, expect, it } from 'vitest';
import { calculateCompoundInterest } from '@/lib/calculations/compound-interest';
import { finiteNumber, round } from '@/lib/calculations/contracts';
import { calculateDebtPayoff, formatPayoffDuration } from '@/lib/calculations/debt-payoff';
import { DEBT_PAYOFF_MONTH_CAP, simulateDebtPayoff } from '@/lib/calculations/finance/debt-payoff';
import { compoundInterestGrowth, simpleInterest } from '@/lib/calculations/finance/interest';
import {
  loanFromMonthlyPrincipalAndInterest,
  monthlyPrincipalAndInterest,
  remainingBalance,
  summarizeAmortization,
} from '@/lib/calculations/finance/loan';
import { calculateLoan } from '@/lib/calculations/loan';
import { calculateMortgage, monthlyPrincipalAndInterest as mortgagePayment } from '@/lib/calculations/mortgage';

describe('fixed-rate loan primitives', () => {
  it('matches the canonical 6% 30-year $200,000 payment used by mortgage', () => {
    const payment = monthlyPrincipalAndInterest(200_000, 6, 360);
    expect(round(payment)).toBe(1_199.1);
    expect(mortgagePayment(200_000, 6, 360)).toBe(payment);
    expect(loanFromMonthlyPrincipalAndInterest(payment, 6, 360)).toBeCloseTo(200_000, 6);
  });

  it('splits a 0% loan evenly, including a 1-month term', () => {
    expect(round(monthlyPrincipalAndInterest(120_000, 0, 360))).toBe(333.33);
    expect(monthlyPrincipalAndInterest(5_000, 0, 1)).toBe(5_000);
    const month = summarizeAmortization(5_000, 0, 1);
    expect(month.actualPeriods).toBe(1);
    expect(month.totalInterest).toBe(0);
    expect(month.totalPaid).toBe(5_000);
    expect(month.finalPayment.remainingBalance).toBe(0);
  });

  it('keeps remaining balance at principal before any payment and at zero after the last', () => {
    expect(remainingBalance(200_000, 6, 360, 0)).toBe(200_000);
    expect(remainingBalance(200_000, 6, 360, 360)).toBe(0);
    expect(remainingBalance(200_000, 0, 360, 180)).toBe(100_000);
    const afterOne = remainingBalance(200_000, 6, 360, 1);
    const firstInterest = 200_000 * 0.06 / 12;
    const firstPrincipal = monthlyPrincipalAndInterest(200_000, 6, 360) - firstInterest;
    expect(afterOne).toBeCloseTo(200_000 - firstPrincipal, 8);
  });

  it('closes the amortization balance at the final scheduled payment', () => {
    const summary = summarizeAmortization(200_000, 6, 360);
    expect(summary.paidOff).toBe(true);
    expect(summary.finalPayment.remainingBalance).toBe(0);
    expect(summary.actualPeriods).toBe(360);
    expect(round(summary.scheduledMonthlyPayment)).toBe(1_199.1);
    expect(summary.totalPaid).toBe(summary.scheduledMonthlyPayment * 360);
  });

  it('accepts a very high rate without leaving a leftover balance', () => {
    const summary = summarizeAmortization(10_000, 40, 24);
    expect(summary.paidOff).toBe(true);
    expect(summary.finalPayment.remainingBalance).toBe(0);
    expect(summary.totalInterest).toBeGreaterThan(0);
  });

  it('pays off a long 40-year term with the scheduled payment', () => {
    const summary = summarizeAmortization(200_000, 6, 480);
    expect(summary.paidOff).toBe(true);
    expect(summary.actualPeriods).toBe(480);
    expect(summary.finalPayment.remainingBalance).toBe(0);
    expect(summary.totalInterest).toBeGreaterThan(0);
  });
});

describe('extra principal payments', () => {
  const base = summarizeAmortization(200_000, 6, 360);

  it('does not change the schedule when extra is zero', () => {
    const none = summarizeAmortization(200_000, 6, 360, { recurringMonthly: 0, oneTime: [] });
    expect(none.actualPeriods).toBe(base.actualPeriods);
    expect(none.totalInterest).toBe(base.totalInterest);
    expect(none.interestSaved).toBe(0);
  });

  it('shortens the loan and saves interest with a recurring extra payment', () => {
    const extra = summarizeAmortization(200_000, 6, 360, { recurringMonthly: 200 });
    expect(extra.paidOff).toBe(true);
    expect(extra.actualPeriods).toBeLessThan(base.actualPeriods);
    expect(extra.totalInterest).toBeLessThan(base.totalInterest);
    expect(extra.interestSaved).toBeGreaterThan(0);
    expect(extra.periodsSaved).toBe(base.actualPeriods - extra.actualPeriods);
    expect(extra.finalPayment.remainingBalance).toBe(0);
    expect(extra.finalPayment.payment).toBeLessThanOrEqual(extra.scheduledMonthlyPayment + 200 + 1e-9);
  });

  it('applies a one-time extra payment in the named period', () => {
    const lump = summarizeAmortization(50_000, 6, 60, { oneTime: [{ period: 1, amount: 10_000 }] });
    expect(lump.paidOff).toBe(true);
    expect(lump.actualPeriods).toBeLessThan(60);
    expect(lump.firstPayment.extraPrincipal).toBeGreaterThan(0);
    expect(lump.interestSaved).toBeGreaterThan(0);
  });

  it('caps the final payment at the remaining balance plus interest', () => {
    const extra = summarizeAmortization(1_000, 0, 12, { recurringMonthly: 5_000 });
    expect(extra.actualPeriods).toBe(1);
    expect(extra.finalPayment.payment).toBe(1_000);
    expect(extra.finalPayment.remainingBalance).toBe(0);
    expect(extra.paidOff).toBe(true);
  });
});

describe('compound and simple interest primitives', () => {
  it('matches a known annual compound example with no contributions', () => {
    const growth = compoundInterestGrowth({
      principal: 10_000,
      annualRatePercent: 5,
      years: 10,
      contribution: 0,
      compounding: 'annually',
      contributionFrequency: 'annually',
    });
    expect(round(growth.endingBalance)).toBe(16_288.95);
    expect(growth.totalContributions).toBe(0);
    expect(round(growth.totalGrowth)).toBe(6_288.95);
  });

  it('uses end-of-period contributions for monthly deposits', () => {
    const growth = compoundInterestGrowth({
      principal: 0,
      annualRatePercent: 6,
      years: 1,
      contribution: 100,
      compounding: 'monthly',
      contributionFrequency: 'monthly',
    });
    const expected = 100 * (((1.005) ** 12 - 1) / 0.005);
    expect(growth.endingBalance).toBeCloseTo(expected, 8);
    expect(growth.totalContributions).toBe(1_200);
  });

  it('leaves principal unchanged at 0% with no contributions, and adds deposits only at 0%', () => {
    const none = compoundInterestGrowth({
      principal: 8_000,
      annualRatePercent: 0,
      years: 5,
      contribution: 0,
      compounding: 'monthly',
      contributionFrequency: 'monthly',
    });
    expect(none.endingBalance).toBe(8_000);
    const deposits = compoundInterestGrowth({
      principal: 1_000,
      annualRatePercent: 0,
      years: 2,
      contribution: 50,
      compounding: 'monthly',
      contributionFrequency: 'monthly',
    });
    expect(deposits.endingBalance).toBe(2_200);
    expect(deposits.totalGrowth).toBe(0);
  });

  it('compounds more often when monthly compounding is compared with annual', () => {
    const annual = compoundInterestGrowth({
      principal: 10_000,
      annualRatePercent: 6,
      years: 5,
      contribution: 0,
      compounding: 'annually',
      contributionFrequency: 'annually',
    });
    const monthly = compoundInterestGrowth({
      principal: 10_000,
      annualRatePercent: 6,
      years: 5,
      contribution: 0,
      compounding: 'monthly',
      contributionFrequency: 'monthly',
    });
    expect(monthly.endingBalance).toBeGreaterThan(annual.endingBalance);
  });

  it('adds mixed-frequency contributions after interest when the dates line up', () => {
    const growth = compoundInterestGrowth({
      principal: 1_000,
      annualRatePercent: 12,
      years: 1,
      contribution: 100,
      compounding: 'annually',
      contributionFrequency: 'monthly',
    });
    expect(growth.totalContributions).toBe(1_200);
    expect(round(growth.endingBalance)).toBe(2_452);
  });

  it('computes simple interest without compounding', () => {
    expect(simpleInterest(1_000, 5, 3)).toBe(150);
    expect(simpleInterest(2_000, 0, 10)).toBe(0);
  });
});

describe('loan calculator contract', () => {
  it('returns the canonical amortizing payment with empty dataset ids', () => {
    const result = calculateLoan({
      loanAmount: 200_000,
      annualRatePercent: 6,
      termLength: 30,
      termUnit: 'years',
      extraMonthlyPayment: 0,
    });
    expect(result.value.monthlyPayment).toBe(1_199.1);
    expect(result.value.totalPrincipal).toBe(200_000);
    expect(result.calculationVersion).toBe('loan-v1.0.0');
    expect(result.datasetSnapshotIds).toEqual([]);
    expect(result.assumptions.some((line) => line.includes('not APR'))).toBe(true);
  });

  it('accepts a term in months and reports extra-payment savings', () => {
    const result = calculateLoan({
      loanAmount: 12_000,
      annualRatePercent: 8,
      termLength: 24,
      termUnit: 'months',
      extraMonthlyPayment: 100,
    });
    expect(result.value.scheduledPeriods).toBe(24);
    expect(result.value.actualPeriods).toBeLessThan(24);
    expect(result.value.interestSaved).toBeGreaterThan(0);
    expect(result.value.paidOff).toBe(true);
  });

  it('rejects a zero-term and a negative principal', () => {
    expect(() => calculateLoan({
      loanAmount: 1_000,
      annualRatePercent: 5,
      termLength: 0,
      termUnit: 'years',
      extraMonthlyPayment: 0,
    })).toThrow();
    expect(() => calculateLoan({
      loanAmount: -1,
      annualRatePercent: 5,
      termLength: 5,
      termUnit: 'years',
      extraMonthlyPayment: 0,
    })).toThrow();
    expect(() => calculateLoan({
      loanAmount: 1_000,
      annualRatePercent: Number.NaN,
      termLength: 5,
      termUnit: 'years',
      extraMonthlyPayment: 0,
    })).toThrow();
    expect(() => calculateLoan({
      loanAmount: 1_000,
      annualRatePercent: Number.POSITIVE_INFINITY,
      termLength: 5,
      termUnit: 'years',
      extraMonthlyPayment: 0,
    })).toThrow();
  });
});

describe('compound interest calculator contract', () => {
  it('pins the same engine id used by the registry and states contribution timing', () => {
    const result = calculateCompoundInterest({
      principal: 10_000,
      annualRatePercent: 5,
      years: 10,
      contribution: 0,
      compounding: 'annually',
      contributionFrequency: 'annually',
    });
    expect(result.value.endingBalance).toBe(16_288.95);
    expect(result.calculationVersion).toBe('compound-interest-v1.0.0');
    expect(result.datasetSnapshotIds).toEqual([]);
    expect(result.assumptions[0]).toContain('end of each contribution period');
  });

  it('keeps a 0-year horizon at the starting amount', () => {
    const result = calculateCompoundInterest({
      principal: 5_000,
      annualRatePercent: 7,
      years: 0,
      contribution: 100,
      compounding: 'monthly',
      contributionFrequency: 'monthly',
    });
    expect(result.value.endingBalance).toBe(5_000);
    expect(result.value.totalContributions).toBe(0);
    expect(result.value.totalGrowth).toBe(0);
  });
});

describe('debt payoff primitives', () => {
  it('pays a single 0% debt in exact minimum-payment months', () => {
    const result = simulateDebtPayoff([
      { id: 'card', label: 'Card', balance: 1_000, annualRatePercent: 0, minimumPayment: 100, originalIndex: 0 },
    ], 0, 'snowball');
    expect(result.status).toBe('paid-off');
    expect(result.months).toBe(10);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(1_000);
  });

  it('orders snowball by smallest balance and avalanche by highest rate', () => {
    const debts = [
      { id: 'big-low', label: 'Auto', balance: 8_000, annualRatePercent: 4, minimumPayment: 200, originalIndex: 0 },
      { id: 'small-high', label: 'Card', balance: 2_000, annualRatePercent: 22, minimumPayment: 50, originalIndex: 1 },
    ];
    const snowball = simulateDebtPayoff(debts, 150, 'snowball');
    const avalanche = simulateDebtPayoff(debts, 150, 'avalanche');
    expect(snowball.status).toBe('paid-off');
    expect(avalanche.status).toBe('paid-off');
    expect(snowball.payoffOrder[0]).toBe('small-high');
    expect(avalanche.payoffOrder[0]).toBe('small-high');
    expect(avalanche.totalInterest).toBeLessThanOrEqual(snowball.totalInterest);
  });

  it('keeps a stable order when rates and balances are equal', () => {
    const debts = [
      { id: 'a', label: 'A', balance: 500, annualRatePercent: 10, minimumPayment: 25, originalIndex: 0 },
      { id: 'b', label: 'B', balance: 500, annualRatePercent: 10, minimumPayment: 25, originalIndex: 1 },
    ];
    expect(simulateDebtPayoff(debts, 0, 'snowball').payoffOrder[0]).toBe('a');
    expect(simulateDebtPayoff(debts, 0, 'avalanche').payoffOrder[0]).toBe('a');
  });

  it('detects a minimum payment that cannot cover interest', () => {
    const result = simulateDebtPayoff([
      { id: 'trap', label: 'Trap', balance: 10_000, annualRatePercent: 24, minimumPayment: 10, originalIndex: 0 },
    ], 0, 'avalanche');
    expect(result.status).toBe('does-not-pay-off');
    expect(result.stopReason).toBe('negative-amortization');
    expect(result.months).toBe(DEBT_PAYOFF_MONTH_CAP);
  });

  it('uses additional monthly payment to finish faster', () => {
    const debts = [
      { id: 'card', label: 'Card', balance: 3_000, annualRatePercent: 18, minimumPayment: 75, originalIndex: 0 },
    ];
    const minimumOnly = simulateDebtPayoff(debts, 0, 'snowball');
    const withExtra = simulateDebtPayoff(debts, 200, 'snowball');
    expect(minimumOnly.status).toBe('paid-off');
    expect(withExtra.status).toBe('paid-off');
    expect(withExtra.months).toBeLessThan(minimumOnly.months);
    expect(withExtra.totalInterest).toBeLessThan(minimumOnly.totalInterest);
  });
});

describe('debt payoff calculator contract', () => {
  it('compares snowball and avalanche without a dataset claim', () => {
    const result = calculateDebtPayoff({
      additionalMonthlyPayment: 100,
      debts: [
        { id: 'card', label: 'Card', balance: 4_000, annualRatePercent: 21.99, minimumPayment: 120 },
        { id: 'loan', label: 'Loan', balance: 9_000, annualRatePercent: 6.5, minimumPayment: 220 },
      ],
    });
    expect(result.value.bothPaidOff).toBe(true);
    expect(result.value.avalanche.totalInterest).toBeLessThanOrEqual(result.value.snowball.totalInterest);
    expect(result.value.interestDifference).toBe(round(result.value.snowball.totalInterest - result.value.avalanche.totalInterest));
    expect(result.calculationVersion).toBe('debt-payoff-v1.0.0');
    expect(result.datasetSnapshotIds).toEqual([]);
    expect(result.breakdown[2]?.detail).toMatch(/Avalanche saves|Both orders cost the same/);
  });

  it('shows an interest gap when the small balance is not the high-rate debt', () => {
    const result = calculateDebtPayoff({
      additionalMonthlyPayment: 100,
      debts: [
        { id: 'loan', label: 'Personal loan', balance: 3_500, annualRatePercent: 7.5, minimumPayment: 110 },
        { id: 'card', label: 'Credit card', balance: 6_500, annualRatePercent: 21.99, minimumPayment: 160 },
      ],
    });
    expect(result.value.bothPaidOff).toBe(true);
    expect(result.value.interestDifference).toBeGreaterThan(0);
    expect(result.breakdown[2]?.detail).toMatch(/Avalanche saves/);
  });

  it('rejects duplicate debt ids and reports a duration helper', () => {
    expect(() => calculateDebtPayoff({
      additionalMonthlyPayment: 0,
      debts: [
        { id: 'same', label: 'One', balance: 100, annualRatePercent: 0, minimumPayment: 10 },
        { id: 'same', label: 'Two', balance: 100, annualRatePercent: 0, minimumPayment: 10 },
      ],
    })).toThrow(/unique id/);
    expect(formatPayoffDuration(15)).toBe('1 year 3 months');
    expect(formatPayoffDuration(1)).toBe('1 month');
  });
});

describe('mortgage still uses the shared primitive', () => {
  it('keeps the canonical mortgage fixture after the extract', () => {
    const result = calculateMortgage({
      homePrice: 200_000,
      downPayment: 0,
      termYears: 30,
      annualRatePercent: 6,
      annualPropertyTax: 0,
      annualHomeInsurance: 0,
      monthlyHoa: 0,
      includePmiEstimate: false,
    });
    expect(result.value.monthlyPrincipalAndInterest).toBe(1_199.1);
    expect(result.calculationVersion).toBe('mortgage-amortization-v1.0.0');
  });
});

describe('validation bounds', () => {
  it('rejects non-finite rates through the shared number helper', () => {
    expect(finiteNumber('Rate', 0, 40).safeParse(Number.NaN).success).toBe(false);
    expect(finiteNumber('Rate', 0, 40).safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
  });
});
