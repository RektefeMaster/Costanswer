import { describe, expect, it } from 'vitest';
import { calculateEffectiveTaxRate } from '@/lib/calculations/tax/effective-rate';
import { estimateAnnualTaxLiability } from '@/lib/calculations/tax/annual';
import { EFFECTIVE_TAX_RATE_ENGINE_ID } from '@/lib/calculations/tax/version';

const base = { filingStatus: 'single' as const, taxYear: 2026 };
const run = (annualGrossSalary: number, state: string) =>
  calculateEffectiveTaxRate({ ...base, annualGrossSalary, state });

describe('effective tax rate', () => {
  it('separates the bracket from the share of income actually taken', () => {
    const { value } = run(100_000, 'TX');
    // $100,000 less the $16,100 standard deduction lands in the 22% bracket,
    // but 22% is charged on the top slice only.
    expect(value.statutoryFederalBracket).toBe(22);
    expect(value.effectiveFederalRate).toBeCloseTo(13.17, 2);
    expect(value.bracketMinusEffectiveFederal).toBeCloseTo(22 - value.effectiveFederalRate, 2);
    expect(value.effectiveFederalRate).toBeLessThan(value.statutoryFederalBracket);
  });

  it('measures the next $1,000 as bracket plus FICA in a state with no wage tax', () => {
    const { value } = run(100_000, 'TX');
    // 22% federal + 6.2% Social Security + 1.45% Medicare.
    expect(value.nextThousandRate).toBeCloseTo(29.65, 2);
    expect(value.nextThousandTax).toBeCloseTo(296.5, 0);
    expect(value.effectiveStateRate).toBe(0);
  });

  it('adds the additional Medicare tax to the next $1,000 once past its threshold', () => {
    const { value } = run(250_000, 'OR');
    // Above the Social Security wage base and past $200,000, so the marginal
    // FICA is 1.45% + 0.9% rather than 7.65%.
    expect(value.nextThousandRate).toBeCloseTo(44.25, 2);
    expect(value.statutoryFederalBracket).toBe(32);
  });

  it('counts a state zero bracket as zero rather than skipping the state', () => {
    // North Dakota's 0% band reaches $48,475 of taxable income, which $60,000
    // of wages does not clear.
    const { value } = run(60_000, 'ND');
    expect(value.stateTaxStatus).toBe('supported');
    expect(value.stateIncomeTax).toBe(0);
    expect(value.effectiveStateRate).toBe(0);
    expect(value.nextThousandRate).toBeCloseTo(19.65, 2);
  });

  it('agrees with the take-home engine it is built on', () => {
    for (const state of ['CA', 'TX', 'MD', 'OR', 'AR']) {
      const liability = estimateAnnualTaxLiability({ ...base, annualGrossSalary: 120_000, state });
      const { value } = run(120_000, state);
      expect(value.totalTax, state).toBeCloseTo(liability.totalTax, 2);
      expect(value.takeHome, state).toBeCloseTo(liability.takeHome, 2);
    }
  });

  it('never reports a rate above 100% or below zero', () => {
    for (const gross of [0, 1, 15_000, 100_000, 5_000_000]) {
      const { value } = run(gross, 'CA');
      for (const rate of [value.effectiveTotalRate, value.effectiveFederalRate, value.effectiveFicaRate, value.effectiveStateRate]) {
        expect(rate, `${gross}`).toBeGreaterThanOrEqual(0);
        expect(rate, `${gross}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('reports zero rather than dividing by zero at no income', () => {
    const { value } = run(0, 'CA');
    expect(value.effectiveTotalRate).toBe(0);
    expect(value.totalTax).toBe(0);
  });

  it('keeps the effective rate at or below the next-dollar rate as income rises', () => {
    // Not a claim that tax is monotonic in income — it is the weaker and true
    // statement that averaging in the lower brackets cannot exceed the top one.
    for (const gross of [40_000, 90_000, 180_000, 400_000]) {
      const { value } = run(gross, 'TX');
      expect(value.effectiveTotalRate, `${gross}`).toBeLessThanOrEqual(value.nextThousandRate);
    }
  });

  it('says a state is omitted rather than reporting it as zero tax', () => {
    // Every state is supported today; this asserts the shape survives if one is
    // ever withdrawn, since "unsupported" and "no tax" must not look alike.
    const { value } = run(90_000, 'NY');
    expect(['supported', 'unsupported']).toContain(value.stateTaxStatus);
    if (value.stateTaxStatus === 'unsupported') expect(value.stateIncomeTax).toBe(0);
  });

  it('carries its version and the snapshot the numbers came from', () => {
    const result = run(85_000, 'MN');
    expect(result.calculationVersion).toBe(EFFECTIVE_TAX_RATE_ENGINE_ID);
    expect(result.datasetSnapshotIds).toContain('us-tax-2026-v1');
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.assumptions.some((line) => /effective tax rate here means/i.test(line))).toBe(true);
  });

  it('refuses input it cannot compute rather than guessing', () => {
    expect(() => calculateEffectiveTaxRate({ ...base, annualGrossSalary: -1, state: 'CA' })).toThrow();
    expect(() => calculateEffectiveTaxRate({ ...base, annualGrossSalary: 50_000, state: 'ZZ' })).toThrow();
    expect(() => calculateEffectiveTaxRate({ annualGrossSalary: 50_000, state: 'CA', filingStatus: 'single' })).toThrow();
  });
});
