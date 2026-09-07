import { describe, expect, it } from 'vitest';
import { AUTO_COVERAGE_ENGINE_ID, calculateAutoCoverage } from '@/lib/calculations/auto-coverage';
import { getInsuranceStateRate, insuranceSnapshot } from '@/lib/data/insurance-snapshot';

const base = {
  stateCode: 'TX',
  vehicleValue: 6_000,
  collisionDeductible: 1_000,
  comprehensiveDeductible: 500,
  premiumBasis: 'benchmark' as const,
};

describe('collision and comprehensive worth-it comparison', () => {
  it('uses the published state coverage premiums rather than the combined figure', () => {
    const result = calculateAutoCoverage(base);
    const texas = getInsuranceStateRate('TX');
    expect(result.value.annualCollisionPremium).toBe(texas.autoCollisionAnnualPremium);
    expect(result.value.annualComprehensivePremium).toBe(texas.autoComprehensiveAnnualPremium);
    expect(result.value.annualPhysicalDamagePremium)
      .toBeCloseTo(texas.autoCollisionAnnualPremium + texas.autoComprehensiveAnnualPremium, 2);
    // Liability is reported for context but never folded into the comparison.
    expect(result.value.annualLiabilityPremium).toBe(texas.autoLiabilityAnnualPremium);
    expect(result.value.annualPhysicalDamagePremium).not.toBe(texas.autoCombinedAnnualPremium);
    expect(result.datasetSnapshotIds).toEqual([insuranceSnapshot.snapshotId]);
    expect(result.calculationVersion).toBe(AUTO_COVERAGE_ENGINE_ID);
  });

  it('caps each payout at the car value less that coverage own deductible', () => {
    const result = calculateAutoCoverage(base);
    expect(result.value.collisionMaximumPayout).toBe(5_000);
    // Comprehensive carries the lower deductible, so it can pay more.
    expect(result.value.comprehensiveMaximumPayout).toBe(5_500);
    const premium = result.value.annualPhysicalDamagePremium;
    expect(result.value.yearsOfPremiumToEqualPayout).toBeCloseTo(5_500 / premium, 2);
    expect(result.value.premiumAsPercentOfValue).toBeCloseTo((premium / 6_000) * 100, 2);
  });

  it('says the cover cannot pay at all once a deductible reaches the car value', () => {
    const spent = calculateAutoCoverage({ ...base, vehicleValue: 800, collisionDeductible: 1_000, comprehensiveDeductible: 1_000 });
    expect(spent.value.coverageIsWorthless).toBe(true);
    expect(spent.value.collisionMaximumPayout).toBe(0);
    expect(spent.value.comprehensiveMaximumPayout).toBe(0);
    // No payout is possible, so there is no break-even to report rather than a zero.
    expect(spent.value.yearsOfPremiumToEqualPayout).toBeNull();
    expect(spent.breakdown.find((step) => step.label.startsWith('Years of premium'))?.value).toBe('No payout is possible');

    // Exactly at the deductible the payout is zero too, not a negative number.
    const exact = calculateAutoCoverage({ ...base, vehicleValue: 1_000, collisionDeductible: 1_000, comprehensiveDeductible: 1_000 });
    expect(exact.value.collisionMaximumPayout).toBe(0);
    expect(exact.value.coverageIsWorthless).toBe(true);
  });

  it('flags a ceiling worth less than ten years of premium, and not a healthy one', () => {
    const thin = calculateAutoCoverage({ ...base, vehicleValue: 3_000 });
    expect(thin.value.payoutBelowTenTimesPremium).toBe(true);
    const healthy = calculateAutoCoverage({ ...base, vehicleValue: 45_000 });
    expect(healthy.value.payoutBelowTenTimesPremium).toBe(false);
    expect(healthy.value.coverageIsWorthless).toBe(false);
  });

  it('switches to entered premiums and drops the snapshot claim with them', () => {
    const custom = calculateAutoCoverage({
      ...base, premiumBasis: 'custom', annualCollisionPremium: '400', annualComprehensivePremium: '200',
    });
    expect(custom.value.usesBenchmark).toBe(false);
    expect(custom.value.annualPhysicalDamagePremium).toBe(600);
    // 5,500 of cover against 600 a year.
    expect(custom.value.yearsOfPremiumToEqualPayout).toBeCloseTo(5_500 / 600, 2);
    expect(custom.datasetSnapshotIds).toEqual([]);
    // A state average must not be described as the reader's own premium.
    expect(custom.value.annualLiabilityPremium).toBeNull();
    expect(custom.assumptions.join(' ')).toContain('the amounts you entered');
    expect(custom.assumptions.join(' ')).not.toContain('NAIC 2023 average written premium');
  });

  it('keeps every state priceable and carries state caveats into the assumptions', () => {
    for (const stateCode of ['CA', 'FL', 'NY', 'MI', 'DC']) {
      const result = calculateAutoCoverage({ ...base, stateCode });
      expect(result.value.annualPhysicalDamagePremium).toBeGreaterThan(0);
    }
    // Texas exposures are estimated, and the snapshot keeps that note per state.
    expect(calculateAutoCoverage(base).assumptions.join(' ')).toContain('Texas auto exposures are approximated');
  });

  it('rejects inputs that would silently become free coverage or a free car', () => {
    for (const value of [null, true, '', [], undefined, NaN, Infinity, -1]) {
      expect(() => calculateAutoCoverage({ ...base, vehicleValue: value })).toThrow();
      expect(() => calculateAutoCoverage({ ...base, collisionDeductible: value })).toThrow();
    }
    expect(() => calculateAutoCoverage({ ...base, stateCode: 'PR' })).toThrow();
    expect(() => calculateAutoCoverage({ ...base, premiumBasis: 'custom' })).toThrow();
    expect(() => calculateAutoCoverage({ ...base, premiumBasis: 'custom', annualCollisionPremium: 'abc', annualComprehensivePremium: '10' })).toThrow();
  });

  it('keeps the disclosures a coverage decision needs', () => {
    const text = calculateAutoCoverage(base).assumptions.join(' ');
    expect(text).toContain('not advice to keep or drop coverage');
    expect(text).toContain('actual cash value');
    expect(text).toContain('breaches the loan or lease');
    expect(text).toContain('Liability coverage is not part of this comparison');
  });
});
