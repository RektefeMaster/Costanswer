import { describe, expect, it } from 'vitest';
import { MARKETPLACE_PLANS_ENGINE_ID, calculateMarketplacePlanCost } from '@/lib/calculations/marketplace-plans';

const spread = (low: number, median: number, high: number) => ({ low, median, high });
const base = {
  metals: [
    { metal: 'bronze' as const, monthlyPremium: 300, individualDeductible: spread(6_000, 7_500, 7_500), individualMaximumOutOfPocket: spread(8_450, 10_150, 10_600) },
    { metal: 'silver' as const, monthlyPremium: 500, individualDeductible: spread(4_000, 6_000, 6_500), individualMaximumOutOfPocket: spread(8_400, 8_950, 10_600) },
    { metal: 'gold' as const, monthlyPremium: 600, individualDeductible: spread(1_000, 2_000, 3_000), individualMaximumOutOfPocket: spread(4_000, 5_000, 6_000) },
  ],
};

const planFor = (result: ReturnType<typeof calculateMarketplacePlanCost>, metal: string) =>
  result.value.plans.find((plan) => plan.metal === metal)!;

describe('marketplace plan cost scenarios', () => {
  it('separates the healthy year from the ceiling, and names both winners', () => {
    const result = calculateMarketplacePlanCost({ ...base, expectedAnnualCareSpend: 0 });
    const bronze = planFor(result, 'bronze');
    const gold = planFor(result, 'gold');
    expect(bronze.healthyYearCost).toBe(3_600);
    expect(bronze.worstYearCost).toBe(3_600 + 10_600);
    expect(gold.healthyYearCost).toBe(7_200);
    expect(gold.worstYearCost).toBe(7_200 + 6_000);

    // Bronze is cheapest if nothing happens; Gold has the lower ceiling. That
    // opposition is the whole point of the tool, so it is stated outright.
    expect(result.value.cheapestHealthyYear).toBe('bronze');
    expect(result.value.cheapestWorstYear).toBe('gold');
    expect(result.value.hasTradeoff).toBe(true);
    expect(result.value.ceilingWinnerDependsOnPlan).toBe(false);
    expect(result.value.healthyYearSpread).toBe(7_200 - 3_600);
    // Silver is dearest at the high ceiling (6,000 + 10,600); Gold is cheapest (7,200 + 6,000).
    expect(result.value.worstYearSpread).toBe(16_600 - 13_200);
    expect(result.calculationVersion).toBe(MARKETPLACE_PLANS_ENGINE_ID);
  });

  it('does not pair the cheapest premium with a median maximum the file does not attach to it', () => {
    const result = calculateMarketplacePlanCost({
      metals: [
        { metal: 'bronze' as const, monthlyPremium: 400, individualDeductible: spread(1_000, 2_000, 3_000), individualMaximumOutOfPocket: spread(2_000, 9_000, 15_000) },
        { metal: 'gold' as const, monthlyPremium: 500, individualDeductible: spread(1_000, 2_000, 3_000), individualMaximumOutOfPocket: spread(5_000, 5_500, 6_000) },
      ],
    });
    // The most a year can cost uses the highest maximum, so Gold wins that bound.
    expect(result.value.cheapestWorstYear).toBe('gold');
    expect(planFor(result, 'bronze').worstYearCost).toBe(4_800 + 15_000);
    expect(planFor(result, 'gold').worstYearCost).toBe(6_000 + 6_000);
    // Ranking by the lowest maximum would name Bronze, which is why the page
    // must not present the hybrid as one plan's ceiling.
    expect(result.value.ceilingWinnerDependsOnPlan).toBe(true);
    expect(result.assumptions.join(' ')).toContain('bound, not a single plan');
  });

  it('reports no trade-off when one level wins both ends', () => {
    const result = calculateMarketplacePlanCost({
      metals: [
        { metal: 'bronze' as const, monthlyPremium: 300, individualDeductible: spread(6_000, 7_500, 7_500), individualMaximumOutOfPocket: spread(5_000, 5_000, 5_000) },
        { metal: 'gold' as const, monthlyPremium: 600, individualDeductible: spread(1_000, 2_000, 3_000), individualMaximumOutOfPocket: spread(8_000, 8_000, 8_000) },
      ],
    });
    expect(result.value.cheapestHealthyYear).toBe('bronze');
    expect(result.value.cheapestWorstYear).toBe('bronze');
    expect(result.value.hasTradeoff).toBe(false);
  });

  it('caps entered care at the out-of-pocket maximum instead of modelling coinsurance', () => {
    const modest = calculateMarketplacePlanCost({ ...base, expectedAnnualCareSpend: 2_000 });
    expect(planFor(modest, 'bronze').expectedYearCost).toBe(3_600 + 2_000);

    // Care beyond the ceiling cannot raise the cost past premium plus maximum.
    const catastrophic = calculateMarketplacePlanCost({ ...base, expectedAnnualCareSpend: 500_000 });
    for (const plan of catastrophic.value.plans) {
      expect(plan.expectedYearCost).toBe(plan.worstYearCost);
    }
    expect(catastrophic.assumptions.join(' ')).toContain('does not model a deductible-then-coinsurance schedule');
  });

  it('subtracts a fixed credit from every level and never pays out below zero', () => {
    const result = calculateMarketplacePlanCost({ ...base, monthlyPremiumTaxCredit: 400 });
    // 300 - 400 floors at zero rather than becoming a refund.
    expect(planFor(result, 'bronze').monthlyPremiumAfterCredit).toBe(0);
    expect(planFor(result, 'bronze').healthyYearCost).toBe(0);
    expect(planFor(result, 'silver').monthlyPremiumAfterCredit).toBe(100);
    expect(planFor(result, 'gold').monthlyPremiumAfterCredit).toBe(200);

    // A fixed credit narrows the gaps rather than scaling them: the untouched
    // spread was $3,600 a year, and $400 a month closes it to $2,400.
    const without = calculateMarketplacePlanCost(base);
    expect(without.value.healthyYearSpread).toBe(3_600);
    expect(result.value.healthyYearSpread).toBe(2_400);
    // A credit cannot lower a ceiling, only the premium underneath it.
    expect(planFor(result, 'gold').individualMaximumOutOfPocket.median).toBe(5_000);
  });

  it('prorates a partial year of premium but not the ceiling', () => {
    const half = calculateMarketplacePlanCost({ ...base, coverageMonths: 6 });
    expect(planFor(half, 'silver').healthyYearCost).toBe(3_000);
    // The out-of-pocket maximum is a plan-year figure and is not halved with it.
    expect(planFor(half, 'silver').worstYearCost).toBe(3_000 + 10_600);
  });

  it('rejects inputs that would silently become free coverage', () => {
    for (const premium of [null, true, '', [], undefined, NaN, Infinity, -1]) {
      expect(() => calculateMarketplacePlanCost({ metals: [{ ...base.metals[0], monthlyPremium: premium }] })).toThrow();
    }
    expect(() => calculateMarketplacePlanCost({ metals: [] })).toThrow();
    expect(() => calculateMarketplacePlanCost({ ...base, coverageMonths: 0 })).toThrow();
    expect(() => calculateMarketplacePlanCost({ ...base, coverageMonths: 13 })).toThrow();
    expect(() => calculateMarketplacePlanCost({ ...base, monthlyPremiumTaxCredit: -5 })).toThrow();
    expect(() => calculateMarketplacePlanCost({ metals: [{ ...base.metals[0], metal: 'platinum' }] })).toThrow();
  });

  it('keeps the disclosures a coverage comparison needs', () => {
    const text = calculateMarketplacePlanCost(base).assumptions.join(' ');
    expect(text).toContain('not a quote');
    expect(text).toContain('Out-of-network care');
    expect(text).toContain('Provider networks, drug formularies');
    expect(text).toContain('individual medical amounts');
  });
});
