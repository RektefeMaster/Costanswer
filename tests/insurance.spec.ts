import { describe, expect, it } from 'vitest';
import {
  calculateDeductibleComparison,
  calculateInsuranceBudget,
  deductibleComparisonInputSchema,
  insuranceBudgetInputSchema,
  type InsuranceBenchmarkContext,
} from '@/lib/calculations/insurance';
import { getInsuranceStateRate, insuranceSnapshot } from '@/lib/data/insurance-snapshot';
import { STATE_CODES } from '@/lib/location/states';

const benchmark: InsuranceBenchmarkContext = {
  stateCode: 'CA', stateName: 'California', snapshotId: 'insurance-test-fixture-2023', observationPeriod: '2023',
  homeownersAnnualPremium: 1_800, rentersAnnualPremium: 180, autoAnnualExpenditure: 1_200,
  autoUnit: 'insured-vehicle', caveats: ['Fixture source caveat.'],
};

const budgetInput = {
  stateCode: 'CA', housingType: 'homeowners', includeAuto: true, vehicleCount: 2,
  housingBasis: 'benchmark', housingFrequency: 'annual', autoBasis: 'benchmark', autoFrequency: 'annual',
  planningBufferPercent: 0,
} as const;

const deductibleInput = {
  annualPremiumA: 1_200, deductibleA: 500,
  annualPremiumB: 900, deductibleB: 1_500,
  coveredLossAmount: 5_000,
};

describe('insurance premium budget arithmetic and provenance', () => {
  it('combines one homeowners policy with a per-insured-vehicle auto benchmark', () => {
    const result = calculateInsuranceBudget(budgetInput, benchmark);
    expect(result.value).toMatchObject({
      housingAnnual: 1_800, autoAnnual: 2_400, annualTotal: 4_200, monthlyTotal: 350,
      annualWithBuffer: 4_200, monthlyWithBuffer: 350, annualBuffer: 0,
      stateCode: 'CA', stateName: 'California',
    });
    expect(result.value.annualPlanningRange).toEqual([4_200, 4_200]);
    expect(result.value.benchmarkUses).toEqual([
      { coverage: 'homeowners', annualPerUnit: 1_800, unit: 'policy', units: 1, observationPeriod: '2023', snapshotId: benchmark.snapshotId },
      { coverage: 'auto', annualPerUnit: 1_200, unit: 'insured-vehicle', units: 2, observationPeriod: '2023', snapshotId: benchmark.snapshotId },
    ]);
    expect(result.datasetSnapshotIds).toEqual([benchmark.snapshotId]);
    expect(result.calculationVersion).toBe('insurance-budget-v1.0.0');
    expect(result.assumptions).toContain('Fixture source caveat.');
    expect(result.assumptions.join(' ')).toContain('not current quotes');
  });

  it('switches homeowners to renters without retaining the previous housing premium', () => {
    const result = calculateInsuranceBudget({ ...budgetInput, housingType: 'renters' }, benchmark);
    expect(result.value.housingAnnual).toBe(180);
    expect(result.value.annualTotal).toBe(2_580);
    expect(result.value.monthlyTotal).toBe(215);
    expect(result.value.benchmarkUses.map((use) => use.coverage)).toEqual(['renters', 'auto']);
  });

  it('removes excluded lines, their benchmark usage, and irrelevant custom fields', () => {
    const autoOnly = calculateInsuranceBudget({ ...budgetInput, housingType: 'none', housingBasis: 'custom', housingPremium: '' }, benchmark);
    expect(autoOnly.value.housingAnnual).toBe(0);
    expect(autoOnly.value.annualTotal).toBe(2_400);
    expect(autoOnly.value.benchmarkUses.map((use) => use.coverage)).toEqual(['auto']);
    const housingOnly = calculateInsuranceBudget({ ...budgetInput, includeAuto: false, autoBasis: 'custom', autoPremium: null }, benchmark);
    expect(housingOnly.value.autoAnnual).toBe(0);
    expect(housingOnly.value.annualTotal).toBe(1_800);
    expect(housingOnly.value.benchmarkUses.map((use) => use.coverage)).toEqual(['homeowners']);
  });

  it.each([
    ['monthly', '100', 1_200], ['six-month', '700.25', 1_400.5], ['annual', '1250.55', 1_250.55],
  ] as const)('annualizes a custom %s premium', (housingFrequency, housingPremium, expected) => {
    const result = calculateInsuranceBudget({ ...budgetInput, includeAuto: false, housingBasis: 'custom', housingFrequency, housingPremium });
    expect(result.value.annualTotal).toBe(expected);
    expect(result.value.benchmarkUses).toEqual([]);
    expect(result.datasetSnapshotIds).toEqual([]);
  });

  it('does not multiply the entered all-vehicle auto premium by vehicle count', () => {
    for (const vehicleCount of [1, 2, 6]) {
      const result = calculateInsuranceBudget({
        ...budgetInput, housingType: 'none', autoBasis: 'custom', autoPremium: '900', autoFrequency: 'six-month', vehicleCount,
      });
      expect(result.value.autoAnnual).toBe(1_800);
      expect(result.value.monthlyTotal).toBe(150);
      expect(result.datasetSnapshotIds).toEqual([]);
    }
  });

  it('cites only benchmark lines in mixed source calculations', () => {
    const ownHome = calculateInsuranceBudget({ ...budgetInput, housingBasis: 'custom', housingPremium: 2_100 }, benchmark);
    expect(ownHome.value.annualTotal).toBe(4_500);
    expect(ownHome.value.benchmarkUses.map((use) => use.coverage)).toEqual(['auto']);
    const ownAuto = calculateInsuranceBudget({ ...budgetInput, autoBasis: 'custom', autoPremium: 1_400 }, benchmark);
    expect(ownAuto.value.annualTotal).toBe(3_200);
    expect(ownAuto.value.benchmarkUses.map((use) => use.coverage)).toEqual(['homeowners']);
    const ownBoth = calculateInsuranceBudget({
      ...budgetInput, housingBasis: 'custom', housingPremium: 2_100, autoBasis: 'custom', autoPremium: 1_400,
    }, benchmark);
    expect(ownBoth.value.annualTotal).toBe(3_500);
    expect(ownBoth.datasetSnapshotIds).toEqual([]);
    expect(ownBoth.assumptions).not.toContain('Fixture source caveat.');
  });

  it('uses the buffer exclusively as an explicit additional budget scenario', () => {
    const result = calculateInsuranceBudget({ ...budgetInput, planningBufferPercent: '12.5' }, benchmark);
    expect(result.value).toMatchObject({
      annualTotal: 4_200, monthlyTotal: 350, annualBuffer: 525, annualWithBuffer: 4_725, monthlyWithBuffer: 393.75,
    });
    expect(result.value.annualPlanningRange).toEqual([4_200, 4_725]);
    expect(result.value.monthlyPlanningRange).toEqual([350, 393.75]);
    expect(result.assumptions.join(' ')).toContain('not a statistical range');
    expect(calculateInsuranceBudget({ ...budgetInput, planningBufferPercent: 100 }, benchmark).value.annualWithBuffer).toBe(8_400);
    const noBuffer = { ...budgetInput, planningBufferPercent: undefined };
    expect(calculateInsuranceBudget(noBuffer, benchmark).value.annualBuffer).toBe(0);
  });

  it('retains cents through annualization before deriving monthly display values', () => {
    const result = calculateInsuranceBudget({
      ...budgetInput, housingBasis: 'custom', housingPremium: '99.99', housingFrequency: 'monthly',
      autoBasis: 'custom', autoPremium: '600.01', autoFrequency: 'six-month', planningBufferPercent: 10,
    });
    expect(result.value).toMatchObject({
      housingAnnual: 1_199.88, autoAnnual: 1_200.02, annualTotal: 2_399.9,
      monthlyTotal: 199.99, annualBuffer: 239.99, annualWithBuffer: 2_639.89, monthlyWithBuffer: 219.99,
    });
  });

  it('uses the verified state expenditure metric, not the separately averaged coverage sum', () => {
    const state = getInsuranceStateRate('CA');
    const result = calculateInsuranceBudget({ ...budgetInput, housingType: 'none', vehicleCount: 1 });
    expect(result.value.autoAnnual).toBe(state.autoAnnualExpenditure);
    expect(result.value.autoAnnual).not.toBe(state.autoCombinedAnnualPremium);
    expect(result.datasetSnapshotIds).toEqual([insuranceSnapshot.snapshotId]);
    expect(result.value.benchmarkUses[0]?.observationPeriod).toBe('2023');
    expect(result.assumptions.join(' ')).toContain('California auto figures are preliminary');
  });

  it('resolves published state data for all 50 states and DC without a national fallback', () => {
    for (const stateCode of STATE_CODES) {
      const result = calculateInsuranceBudget({ ...budgetInput, stateCode });
      expect(result.value.stateCode).toBe(stateCode);
      expect(result.value.benchmarkUses).toHaveLength(2);
      expect(result.value.annualTotal).toBeGreaterThan(0);
    }
  });
});

describe('insurance budget runtime validation', () => {
  it('rejects empty, nonnumeric, coerced, nonfinite, negative, zero, and fractional-cent active premiums', () => {
    for (const badValue of ['', ' ', null, undefined, true, false, [], {}, '0x20', 'not a number', NaN, Infinity, -1, 0, 1.001, 1_000_001]) {
      for (const field of ['housingPremium', 'autoPremium']) {
        const result = insuranceBudgetInputSchema.safeParse({
          ...budgetInput, housingBasis: 'custom', housingPremium: 1_000, autoBasis: 'custom', autoPremium: 1_000,
          [field]: badValue,
        });
        expect(result.success, `${field}: ${String(badValue)}`).toBe(false);
      }
    }
  });

  it('accepts decimal form strings and checks maximum amounts without floating point rejection', () => {
    const result = insuranceBudgetInputSchema.parse({
      ...budgetInput, vehicleCount: '6', housingBasis: 'custom', housingPremium: ' 999999.99 ',
      autoBasis: 'custom', autoPremium: '.01', planningBufferPercent: '2.25',
    });
    expect(result.housingPremium).toBe(999_999.99);
    expect(result.autoPremium).toBe(0.01);
    expect(result.vehicleCount).toBe(6);
  });

  it('rejects unknown states, missing selections, malformed booleans, and unsupported frequencies', () => {
    for (const patch of [
      { stateCode: '' }, { stateCode: 'XX' }, { stateCode: 'ca' }, { stateCode: 'US' },
      { housingType: 'none', includeAuto: false }, { includeAuto: 'false' }, { includeAuto: 0 },
      { housingType: 'condo' }, { housingBasis: 'estimate' }, { autoFrequency: 'weekly' },
    ]) {
      expect(insuranceBudgetInputSchema.safeParse({ ...budgetInput, ...patch }).success, JSON.stringify(patch)).toBe(false);
    }
  });

  it('rejects invalid buffer and vehicle count without treating empty fields as zero', () => {
    for (const vehicleCount of ['', null, false, 0, 7, 1.5, NaN, Infinity]) {
      expect(insuranceBudgetInputSchema.safeParse({ ...budgetInput, vehicleCount }).success).toBe(false);
    }
    for (const planningBufferPercent of ['', null, false, -0.01, 100.01, NaN, Infinity]) {
      expect(insuranceBudgetInputSchema.safeParse({ ...budgetInput, planningBufferPercent }).success).toBe(false);
    }
  });

  it('refuses missing or mismatched benchmark provenance and missing active figures', () => {
    for (const patch of [
      { stateCode: 'NY' }, { snapshotId: '' }, { observationPeriod: '2026-07' },
      { homeownersAnnualPremium: null }, { autoAnnualExpenditure: NaN }, { autoAnnualExpenditure: 0 },
    ]) {
      expect(() => calculateInsuranceBudget(budgetInput, { ...benchmark, ...patch })).toThrow();
    }
    expect(() => calculateInsuranceBudget(budgetInput, {
      ...benchmark, autoUnit: 'driver',
    } as unknown as InsuranceBenchmarkContext)).toThrow('per insured vehicle');
  });

  it('allows a missing inactive benchmark metric without silently filling an active one', () => {
    const input = { ...budgetInput, housingType: 'renters', includeAuto: false };
    const result = calculateInsuranceBudget(input, { ...benchmark, homeownersAnnualPremium: null, autoAnnualExpenditure: null });
    expect(result.value.annualTotal).toBe(180);
    expect(() => calculateInsuranceBudget({ ...input, includeAuto: true }, { ...benchmark, autoAnnualExpenditure: null })).toThrow();
  });
});

describe('same-coverage deductible comparison', () => {
  it('shows the premium versus covered-claim tradeoff and its arithmetic threshold', () => {
    const result = calculateDeductibleComparison(deductibleInput);
    expect(result.value).toEqual({
      noClaimCostA: 1_200, noClaimCostB: 900, oneClaimCostA: 1_700, oneClaimCostB: 2_400,
      outOfPocketA: 500, outOfPocketB: 1_500, noClaimWinner: 'b', oneClaimWinner: 'a',
      annualPremiumSavings: 300, lowerPremiumOption: 'b', additionalOutOfPocket: 1_000,
      breakEvenClaimsPerYear: 0.3, claimFreeYearsToRecover: 1_000 / 300,
    });
    expect(result.datasetSnapshotIds).toEqual([]);
    expect(result.assumptions.join(' ')).toContain('not a prediction or probability');
  });

  it('caps each deductible at the covered loss, including losses between the two deductibles', () => {
    const small = calculateDeductibleComparison({ ...deductibleInput, coveredLossAmount: 250 }).value;
    expect(small.outOfPocketA).toBe(250);
    expect(small.outOfPocketB).toBe(250);
    expect(small.oneClaimCostA).toBe(1_450);
    expect(small.oneClaimCostB).toBe(1_150);
    expect(small.breakEvenClaimsPerYear).toBeNull();
    const middle = calculateDeductibleComparison({ ...deductibleInput, coveredLossAmount: 800 }).value;
    expect(middle.outOfPocketA).toBe(500);
    expect(middle.outOfPocketB).toBe(800);
    expect(middle.oneClaimWinner).toBe('tie');
    expect(middle.additionalOutOfPocket).toBe(300);
    expect(middle.breakEvenClaimsPerYear).toBe(1);
  });

  it('treats zero covered loss as premiums only and never divides by zero', () => {
    const value = calculateDeductibleComparison({ ...deductibleInput, coveredLossAmount: 0 }).value;
    expect(value.oneClaimCostA).toBe(1_200);
    expect(value.oneClaimCostB).toBe(900);
    expect(value.outOfPocketA).toBe(0);
    expect(value.outOfPocketB).toBe(0);
    expect(value.breakEvenClaimsPerYear).toBeNull();
    expect(value.claimFreeYearsToRecover).toBeNull();
  });

  it('omits break-even when one option has both the lower premium and lower deductible', () => {
    const value = calculateDeductibleComparison({ ...deductibleInput, deductibleB: 250 }).value;
    expect(value.noClaimWinner).toBe('b');
    expect(value.oneClaimWinner).toBe('b');
    expect(value.additionalOutOfPocket).toBe(0);
    expect(value.breakEvenClaimsPerYear).toBeNull();
    expect(value.claimFreeYearsToRecover).toBeNull();
  });

  it('handles equal premiums or equal deductibles without a false saving period', () => {
    const equalPremiums = calculateDeductibleComparison({ ...deductibleInput, annualPremiumB: 1_200 }).value;
    expect(equalPremiums.noClaimWinner).toBe('tie');
    expect(equalPremiums.lowerPremiumOption).toBeNull();
    expect(equalPremiums.oneClaimWinner).toBe('a');
    expect(equalPremiums.breakEvenClaimsPerYear).toBeNull();
    const equalDeductibles = calculateDeductibleComparison({ ...deductibleInput, deductibleB: 500 }).value;
    expect(equalDeductibles.oneClaimWinner).toBe('b');
    expect(equalDeductibles.claimFreeYearsToRecover).toBeNull();
  });

  it('is symmetric when the two policy labels are swapped', () => {
    const normal = calculateDeductibleComparison(deductibleInput).value;
    const swapped = calculateDeductibleComparison({
      annualPremiumA: 900, deductibleA: 1_500, annualPremiumB: 1_200, deductibleB: 500, coveredLossAmount: 5_000,
    }).value;
    expect(swapped.noClaimWinner).toBe('a');
    expect(swapped.oneClaimWinner).toBe('b');
    expect(swapped.oneClaimCostA).toBe(normal.oneClaimCostB);
    expect(swapped.oneClaimCostB).toBe(normal.oneClaimCostA);
    expect(swapped.breakEvenClaimsPerYear).toBe(normal.breakEvenClaimsPerYear);
    expect(swapped.claimFreeYearsToRecover).toBe(normal.claimFreeYearsToRecover);
  });

  it('keeps a frequency above one as arithmetic instead of treating it as a probability', () => {
    const value = calculateDeductibleComparison({ ...deductibleInput, annualPremiumB: 500, deductibleB: 600 }).value;
    expect(value.breakEvenClaimsPerYear).toBe(7);
    expect(value.claimFreeYearsToRecover).toBe(1 / 7);
  });

  it('reconciles fractional dollar inputs and exact ties', () => {
    const value = calculateDeductibleComparison({
      annualPremiumA: '100.10', deductibleA: '.20', annualPremiumB: '100.20', deductibleB: '.10', coveredLossAmount: '1.00',
    }).value;
    expect(value.oneClaimCostA).toBe(100.3);
    expect(value.oneClaimCostB).toBe(100.3);
    expect(value.oneClaimWinner).toBe('tie');
    expect(value.annualPremiumSavings).toBe(0.1);
  });

  it('validates every numeric field without unsafe JavaScript coercion', () => {
    for (const field of Object.keys(deductibleInput)) {
      for (const value of ['', ' ', null, true, false, [], {}, NaN, Infinity, -1, 0.001, 10_000_001]) {
        expect(deductibleComparisonInputSchema.safeParse({ ...deductibleInput, [field]: value }).success, `${field}: ${String(value)}`).toBe(false);
      }
    }
    expect(deductibleComparisonInputSchema.safeParse({
      annualPremiumA: 0, annualPremiumB: 0, deductibleA: 0, deductibleB: 0, coveredLossAmount: 0,
    }).success).toBe(true);
  });
});
