import { describe, expect, it } from 'vitest';
import { calculateHomeAffordability, monthlyHousingCost, verdictForHousing } from '@/lib/calculations/home-affordability';
import { calculateMortgage } from '@/lib/calculations/mortgage';
import { calculateMortgagePayoff } from '@/lib/calculations/mortgage-payoff';
import { calculateRefinance } from '@/lib/calculations/refinance';
import { monthlyPrincipalAndInterest, remainingBalance } from '@/lib/calculations/finance/loan';

const profile = {
  mode: 'this-house' as const,
  homePrice: 420_000.35,
  monthlyNetIncome: 6_500,
  monthlyExistingDebt: 0,
  monthlyOtherExpenses: 0,
  downPayment: 50_000.75,
  termYears: 30 as const,
  annualRatePercent: 6,
  annualPropertyTax: 0,
  annualHomeInsurance: 0,
  monthlyHoa: 0,
  includePmiEstimate: true,
  maintenanceAnnualPercent: 0,
  closingCostPercent: 3,
};

describe('housing affordability regression checks', () => {
  it('never describes an impossible comfortable budget as already comfortable', () => {
    const result = calculateHomeAffordability({ ...profile, monthlyNetIncome: 1_000, monthlyOtherExpenses: 2_000 });
    expect(result.value.verdict).toBe('risky');
    expect(result.value.comfortableHomePrice).toBe(0);
    expect(result.value.pathToComfortable).toEqual({ priceCut: null, extraDownPayment: null });
    const comfortable = result.breakdown.find((step) => step.label === 'Comfortable home price');
    expect(comfortable?.value).toBe('None');
    expect(comfortable?.detail).toContain('cannot reach');
    expect(comfortable?.detail).not.toContain('already fits');
  });

  it('returns the smallest whole-dollar changes even when the price and deposit include cents', () => {
    const result = calculateHomeAffordability(profile);
    const { priceCut, extraDownPayment } = result.value.pathToComfortable!;
    expect(priceCut).not.toBeNull();
    expect(extraDownPayment).not.toBeNull();
    expect(Number.isInteger(priceCut)).toBe(true);
    expect(Number.isInteger(extraDownPayment)).toBe(true);
    const comfortable = (homePrice: number, downPayment: number) => verdictForHousing(
      monthlyHousingCost(homePrice, { ...profile, downPayment }).monthlyHousingTotal, profile,
    ) === 'comfortable';
    expect(comfortable(profile.homePrice - priceCut!, profile.downPayment)).toBe(true);
    expect(comfortable(profile.homePrice - priceCut! + 1, profile.downPayment)).toBe(false);
    expect(comfortable(profile.homePrice, profile.downPayment + extraDownPayment!)).toBe(true);
    expect(comfortable(profile.homePrice, profile.downPayment + extraDownPayment! - 1)).toBe(false);
  });

  it('applies the full advertised one-point stress at the highest accepted input rate', () => {
    const result = calculateHomeAffordability({ ...profile, annualRatePercent: 25 });
    const principal = profile.homePrice - profile.downPayment;
    const expectedBump = monthlyPrincipalAndInterest(principal, 26, 360) - monthlyPrincipalAndInterest(principal, 25, 360);
    expect(result.value.stress?.rateBumpMonthly).toBeCloseTo(expectedBump, 2);
    expect(result.value.stress?.rateBumpMonthly).toBeGreaterThan(0);
  });

  it('discloses PMI when inverse price estimates include it', () => {
    const result = calculateHomeAffordability({ ...profile, mode: 'how-much-house', downPayment: 0 });
    expect(result.value.comfortableHomePrice).toBeGreaterThan(0);
    expect(result.assumptions.some((text) => text.startsWith('Estimated PMI uses'))).toBe(true);
    expect(result.assumptions.some((text) => text.startsWith('PMI is omitted'))).toBe(false);
  });
});

describe('mortgage numeric boundaries', () => {
  /**
   * An independent reference for the discounted balance, expanding 1 - e^-x as a
   * series instead of through expm1/log1p. A positive rate front-loads interest,
   * so the balance halfway through the term sits slightly *above* half the
   * principal: about 1.3 cents at 1e-6%, shrinking with the rate. Asserting that
   * the balance is simply half the principal would assert something untrue of
   * every rate above zero, so the check is against the real value.
   */
  function discountedBalance(loanAmount: number, annualRatePercent: number, paymentCount: number, paymentsMade: number): number {
    const logGrowth = Math.log1p(annualRatePercent / 100 / 12);
    if (logGrowth === 0) return loanAmount * (1 - paymentsMade / paymentCount);
    const oneMinusDiscount = (months: number) => {
      const x = months * logGrowth;
      return x - x ** 2 / 2 + x ** 3 / 6 - x ** 4 / 24;
    };
    return loanAmount * oneMinusDiscount(paymentCount - paymentsMade) / oneMinusDiscount(paymentCount);
  }

  it.each([1e-6, 1e-12, 1e-16, Number.MIN_VALUE])('keeps payment and balance stable as the rate approaches zero: %s', (rate) => {
    const payment = monthlyPrincipalAndInterest(360_000, rate, 360);
    expect(Number.isFinite(payment)).toBe(true);
    expect(payment).toBeCloseTo(1_000, 3);
    const halfway = remainingBalance(360_000, rate, 360, 180);
    expect(halfway).toBeGreaterThanOrEqual(180_000);
    expect(halfway).toBeCloseTo(discountedBalance(360_000, rate, 360, 180), 6);
    expect(halfway - 180_000).toBeLessThan(0.02);
    expect(remainingBalance(360_000, rate, 360, 359)).toBeCloseTo(1_000, 3);
    const mortgage = calculateMortgage({ ...profile, homePrice: 400_000, downPayment: 40_000, annualRatePercent: rate });
    expect(mortgage.value.monthlyPrincipalAndInterest).toBe(1_000);
    const payoff = calculateMortgagePayoff({ currentPrincipal: 360_000, annualRatePercent: rate, remainingMonths: 360, extraMonthlyPayment: 1_000, startDate: '' });
    expect(payoff.value.acceleratedMonths).toBeLessThanOrEqual(181);
    expect(payoff.value.scheduledPayment).toBe(1_000);
  });
});

describe('refinance payment history validation', () => {
  const refinance = {
    currentBalance: 200_000,
    currentRatePercent: 6,
    currentTermYears: 30,
    monthsAlreadyPaid: 36,
    newRatePercent: 5,
    newTermYears: 30,
    closingCosts: 5_000,
    financeClosingCosts: false,
  };

  it.each([360, 400, 600])('rejects a completed original loan instead of silently inventing one remaining payment: %s', (paid) => {
    expect(() => calculateRefinance({ ...refinance, monthsAlreadyPaid: paid })).toThrow('less than the original loan term');
  });

  it('rejects a fractional number of payments', () => {
    expect(() => calculateRefinance({ ...refinance, monthsAlreadyPaid: 35.5 })).toThrow('whole number');
  });

  it('reconstructs the current payment from the supplied balance and remaining term', () => {
    const result = calculateRefinance(refinance);
    expect(result.value.monthsLeftOnCurrentLoan).toBe(324);
    expect(result.value.currentMonthlyPayment).toBeCloseTo(monthlyPrincipalAndInterest(200_000, 6, 324), 2);
  });
});
