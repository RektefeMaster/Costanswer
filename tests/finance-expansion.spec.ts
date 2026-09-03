import { describe, expect, it } from 'vitest';
import { calculateAmortization } from '@/lib/calculations/amortization';
import { calculateAutoLoan } from '@/lib/calculations/auto-loan';
import { calculateCd } from '@/lib/calculations/cd';
import { calculateCreditCardPayoff } from '@/lib/calculations/credit-card-payoff';
import { round } from '@/lib/calculations/contracts';
import { CREDIT_CARD_MONTH_CAP, creditCardPayoff } from '@/lib/calculations/finance/credit-card';
import { apyGrowth, compoundInterestGrowth, simpleInterest } from '@/lib/calculations/finance/interest';
import { amortizationSchedule, monthlyPrincipalAndInterest, summarizeAmortization } from '@/lib/calculations/finance/loan';
import { calculateInvestment } from '@/lib/calculations/investment';
import { calculate401k } from '@/lib/calculations/k401';
import { calculateMortgagePayoff } from '@/lib/calculations/mortgage-payoff';
import { calculateRetirement } from '@/lib/calculations/retirement';
import { calculateRothIra } from '@/lib/calculations/roth-ira';
import { calculateSimpleInterest } from '@/lib/calculations/simple-interest';
import { irsRetirementLimits, irsRetirementSnapshot } from '@/lib/data/irs-retirement-snapshot';
import { calculateLoan } from '@/lib/calculations/loan';
import { calculateCompoundInterest } from '@/lib/calculations/compound-interest';

describe('auto loan and amortization reuse', () => {
  it('locks $24,000 at 6% for 60 months near $463.99 using the shared factor', () => {
    const rate = 0.06 / 12;
    const growth = (1 + rate) ** 60;
    const independent = 24_000 * rate * growth / (growth - 1);
    expect(round(independent)).toBe(463.99);
    expect(round(monthlyPrincipalAndInterest(24_000, 6, 60))).toBe(463.99);
    const auto = calculateAutoLoan({
      mode: 'financed',
      vehiclePrice: 0,
      downPayment: 0,
      tradeInValue: 0,
      taxesAndFees: 0,
      financedAmount: 24_000,
      annualRatePercent: 6,
      termMonths: 60,
    });
    expect(auto.value.monthlyPayment).toBe(463.99);
    expect(auto.calculationVersion).toBe('auto-loan-v1.0.0');
    const schedule = calculateAmortization({
      principal: 24_000,
      annualRatePercent: 6,
      termMonths: 60,
      extraMonthlyPayment: 0,
      startDate: '',
    });
    expect(schedule.value.monthlyPayment).toBe(463.99);
    expect(schedule.value.schedule).toHaveLength(60);
    expect(amortizationSchedule(24_000, 6, 60)[0]?.payment).toBe(monthlyPrincipalAndInterest(24_000, 6, 60));
  });

  it('does not fork a second payment formula away from Loan Calculator', () => {
    const loan = calculateLoan({
      loanAmount: 24_000,
      annualRatePercent: 6,
      termLength: 60,
      termUnit: 'months',
      extraMonthlyPayment: 0,
    });
    expect(loan.value.monthlyPayment).toBe(463.99);
  });
});

describe('interest family', () => {
  it('locks simple interest $10,000 × 5% × 3 years = $1,500', () => {
    expect(simpleInterest(10_000, 5, 3)).toBe(1_500);
    const result = calculateSimpleInterest({ principal: 10_000, annualRatePercent: 5, years: 3 });
    expect(result.value.interest).toBe(1_500);
    expect(result.value.endingAmount).toBe(11_500);
    expect(result.assumptions.join(' ')).toMatch(/does not compound/i);
  });

  it('locks CD APY $10,000 at 5% for one year as $10,500', () => {
    expect(apyGrowth(10_000, 5, 1)).toBe(10_500);
    expect(calculateCd({ principal: 10_000, apyPercent: 5, years: 1 }).value.endingBalance).toBe(10_500);
  });

  it('locks $10,000 at 7% annual compounding for 10 years with no contributions', () => {
    const independent = 10_000 * (1.07 ** 10);
    expect(round(independent)).toBe(19_671.51);
    const growth = compoundInterestGrowth({
      principal: 10_000,
      annualRatePercent: 7,
      years: 10,
      contribution: 0,
      compounding: 'annually',
      contributionFrequency: 'annually',
      contributionTiming: 'end',
    });
    expect(round(growth.endingBalance)).toBe(19_671.51);
    expect(calculateInvestment({
      principal: 10_000,
      contribution: 0,
      contributionFrequency: 'annually',
      contributionTiming: 'end',
      annualReturnPercent: 7,
      years: 10,
      compounding: 'annually',
    }).value.endingValue).toBe(19_671.51);
  });

  it('leaves the existing compound-interest zero-contribution fixture unchanged', () => {
    const existing = calculateCompoundInterest({
      principal: 10_000,
      annualRatePercent: 5,
      years: 10,
      contribution: 0,
      compounding: 'annually',
      contributionFrequency: 'annually',
    });
    expect(existing.value.endingBalance).toBe(16_288.95);
  });
});

describe('payoff tools', () => {
  it('saves months and interest when extra principal is applied', () => {
    const baseline = summarizeAmortization(250_000, 6, 300);
    const extra = summarizeAmortization(250_000, 6, 300, { recurringMonthly: 200 });
    expect(extra.actualPeriods).toBeLessThan(baseline.actualPeriods);
    const result = calculateMortgagePayoff({
      currentPrincipal: 250_000,
      annualRatePercent: 6,
      remainingMonths: 300,
      extraMonthlyPayment: 200,
      startDate: '2026-09-01',
    });
    expect(result.value.monthsSaved).toBe(extra.periodsSaved);
    expect(result.value.interestSaved).toBe(round(extra.interestSaved));
  });

  it('caps a credit-card loop and detects a payment below interest', () => {
    expect(CREDIT_CARD_MONTH_CAP).toBe(600);
    const stuck = creditCardPayoff({ balance: 5_000, aprPercent: 24, monthlyPayment: 10 });
    expect(stuck.status).toBe('does-not-pay-off');
    expect(stuck.stopReason).toBe('payment-at-or-below-interest');
    const zero = calculateCreditCardPayoff({
      mode: 'payment',
      balance: 1_000,
      aprPercent: 20,
      monthlyPayment: 0,
      targetMonths: 12,
    });
    expect(zero.value.status).toBe('does-not-pay-off');
    expect(zero.value.stopReason).toBe('zero-payment');
  });
});

describe('retirement family', () => {
  it('projects 401(k) match without claiming IRS limits were enforced', () => {
    expect(irsRetirementSnapshot.snapshotId).toBe('irs-retirement-limits-2026-v1');
    expect(irsRetirementSnapshot.observationPeriod).toBe('2026');
    expect(irsRetirementLimits.electiveDeferral401k).toBe(24_500);
    expect(irsRetirementLimits.catchUp401kAge50).toBe(8_000);
    expect(irsRetirementLimits.catchUp401kAges60to63).toBe(11_250);
    expect(irsRetirementLimits.definedContributionOverall).toBe(72_000);
    expect(irsRetirementLimits.iraLimit).toBe(7_500);
    expect(irsRetirementLimits.catchUpIraAge50).toBe(1_100);
    expect(irsRetirementLimits.rothCatchUpPriorYearFicaWageThreshold).toBe(150_000);
    const result = calculate401k({
      currentBalance: 0,
      salary: 80_000,
      employeePercent: 6,
      matchRatePercent: 50,
      matchSalaryCapPercent: 6,
      years: 1,
      assumedReturnPercent: 0,
      salaryGrowthPercent: 0,
    });
    expect(result.value.firstYearEmployee).toBe(4_800);
    expect(result.value.firstYearEmployer).toBe(2_400);
    expect(result.datasetSnapshotIds).toEqual([]);
    expect(result.assumptions.join(' ')).toMatch(/does not cap/i);
    expect(result.assumptions.join(' ')).toMatch(/11,250/);
    expect(result.assumptions.join(' ')).toMatch(/150,000/);
    expect(result.assumptions.join(' ')).toMatch(/irs-retirement-limits-2026-v1/);
  });

  it('projects Roth growth without an eligibility verdict', () => {
    const result = calculateRothIra({
      currentBalance: 0,
      monthlyContribution: 0,
      years: 1,
      assumedReturnPercent: 0,
    });
    expect(result.value.endingBalance).toBe(0);
    expect(result.assumptions.join(' ')).not.toMatch(/you are eligible/i);
    expect(result.datasetSnapshotIds).toEqual([]);
  });

  it('compares a retirement projection with a modeled goal, not a readiness label', () => {
    const result = calculateRetirement({
      currentAge: 40,
      retirementAge: 41,
      currentSavings: 10_000,
      monthlyContribution: 0,
      assumedReturnPercent: 0,
      goalAmount: 12_000,
    });
    expect(result.value.projectedBalance).toBe(10_000);
    expect(result.value.gap).toBe(-2_000);
    expect(result.assumptions.join(' ')).toMatch(/under these assumptions/i);
  });
});
