import { z } from 'zod';
import { CMS_METALS, type CmsMetal, type CmsSpread } from '@/lib/data/cms-marketplace';
import { formatMoney, round, type CalculationResult } from './contracts';

export const MARKETPLACE_PLANS_ENGINE_ID = 'marketplace-plan-cost-v1.0.0';

const dollars = (label: string, maximum = 1_000_000) => z.number({ error: `${label} must be a number.` })
  .finite(`${label} must be finite.`).min(0, `${label} cannot be negative.`).max(maximum, `${label} is too large.`);

const metalInputSchema = z.object({
  metal: z.enum(CMS_METALS),
  /** Monthly premium for the whole household at this metal level, before any credit. */
  monthlyPremium: dollars('Monthly premium', 100_000),
  individualDeductible: z.object({ low: dollars('Deductible'), median: dollars('Deductible'), high: dollars('Deductible') }),
  individualMaximumOutOfPocket: z.object({ low: dollars('Out-of-pocket maximum'), median: dollars('Out-of-pocket maximum'), high: dollars('Out-of-pocket maximum') }),
}).strict();

export const marketplacePlanCostInputSchema = z.object({
  metals: z.array(metalInputSchema).min(1),
  /**
   * Credit applied to every level alike.
   *
   * The premium tax credit is a fixed dollar amount, not a percentage, so the
   * same figure comes off each metal level and is floored at that level's own
   * premium: a plan cheaper than the credit costs nothing rather than paying out.
   */
  monthlyPremiumTaxCredit: dollars('Premium tax credit', 100_000).default(0),
  /** Care the household expects to pay for before any deductible is met. */
  expectedAnnualCareSpend: dollars('Expected care spending', 1_000_000).default(0),
  coverageMonths: z.number().int().min(1).max(12).default(12),
});
export type MarketplacePlanCostInput = z.infer<typeof marketplacePlanCostInputSchema>;

export type MarketplacePlanCost = {
  metal: CmsMetal;
  monthlyPremium: number;
  monthlyPremiumAfterCredit: number;
  annualPremiumAfterCredit: number;
  individualDeductible: CmsSpread;
  individualMaximumOutOfPocket: CmsSpread;
  /** Premium only: a year in which no covered care is used. */
  healthyYearCost: number;
  /** Premium plus the care entered, capped by the highest out-of-pocket maximum. */
  expectedYearCost: number;
  /**
   * Premium plus the highest individual out-of-pocket maximum filed at this metal.
   *
   * The landscape file does not pair the cheapest premium with that plan's own
   * maximum, so this is a bound for the metal, not one plan's bill.
   */
  worstYearCost: number;
  /** Premium plus the lowest filed maximum at this metal. */
  worstYearCostLow: number;
};

export type MarketplacePlanCostValue = {
  plans: MarketplacePlanCost[];
  cheapestHealthyYear: CmsMetal;
  cheapestWorstYear: CmsMetal;
  cheapestExpectedYear: CmsMetal;
  /** True when no single level is cheapest in both a healthy and a bad year. */
  hasTradeoff: boolean;
  /**
   * True when ranking ceilings by the lowest vs highest maximum at each metal
   * names different winners. The cheapest premium and the maximums come from
   * different plans, so a single "worst year" winner would be a pairing the
   * file does not contain.
   */
  ceilingWinnerDependsOnPlan: boolean;
  healthyYearSpread: number;
  worstYearSpread: number;
};

/**
 * What a year of coverage costs at each metal level, in three scenarios.
 *
 * A premium comparison answers only the healthy-year question. The number that
 * decides whether a cheap plan was actually cheap is the ceiling: premium plus
 * the out-of-pocket maximum, which is the most the plan can cost in a year.
 * Bronze usually wins the first and loses the second, and this makes that
 * visible instead of leaving it in the small print.
 */
export function calculateMarketplacePlanCost(rawInput: unknown): CalculationResult<MarketplacePlanCostValue> {
  const input = marketplacePlanCostInputSchema.parse(rawInput);
  const months = input.coverageMonths;

  const plans: MarketplacePlanCost[] = input.metals.map((entry) => {
    // The credit cannot exceed the premium of the plan it is applied to.
    const monthlyAfterCredit = round(Math.max(0, entry.monthlyPremium - input.monthlyPremiumTaxCredit));
    const annualPremium = round(monthlyAfterCredit * months);
    const moopHigh = entry.individualMaximumOutOfPocket.high;
    const moopLow = entry.individualMaximumOutOfPocket.low;
    return {
      metal: entry.metal,
      monthlyPremium: round(entry.monthlyPremium),
      monthlyPremiumAfterCredit: monthlyAfterCredit,
      annualPremiumAfterCredit: annualPremium,
      individualDeductible: entry.individualDeductible,
      individualMaximumOutOfPocket: entry.individualMaximumOutOfPocket,
      healthyYearCost: annualPremium,
      expectedYearCost: round(annualPremium + Math.min(input.expectedAnnualCareSpend, moopHigh)),
      worstYearCost: round(annualPremium + moopHigh),
      worstYearCostLow: round(annualPremium + moopLow),
    };
  });

  const cheapestBy = (pick: (plan: MarketplacePlanCost) => number): CmsMetal =>
    plans.reduce((best, plan) => (pick(plan) < pick(best) ? plan : best)).metal;
  const cheapestHealthyYear = cheapestBy((plan) => plan.healthyYearCost);
  const cheapestWorstYear = cheapestBy((plan) => plan.worstYearCost);
  const cheapestWorstYearLow = cheapestBy((plan) => plan.worstYearCostLow);
  const spread = (pick: (plan: MarketplacePlanCost) => number) =>
    round(Math.max(...plans.map(pick)) - Math.min(...plans.map(pick)));

  const value: MarketplacePlanCostValue = {
    plans,
    cheapestHealthyYear,
    cheapestWorstYear,
    cheapestExpectedYear: cheapestBy((plan) => plan.expectedYearCost),
    hasTradeoff: cheapestHealthyYear !== cheapestWorstYear,
    ceilingWinnerDependsOnPlan: cheapestWorstYear !== cheapestWorstYearLow,
    healthyYearSpread: spread((plan) => plan.healthyYearCost),
    worstYearSpread: spread((plan) => plan.worstYearCost),
  };

  const label = (metal: CmsMetal) => metal.charAt(0).toUpperCase() + metal.slice(1);
  return {
    value,
    calculationVersion: MARKETPLACE_PLANS_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      ...plans.map((plan) => ({
        label: `${label(plan.metal)}, a year with no claims`,
        value: formatMoney(plan.healthyYearCost),
        detail: `${formatMoney(plan.monthlyPremiumAfterCredit)} a month × ${months}`,
      })),
      ...plans.map((plan) => ({
        label: `${label(plan.metal)}, the most it can cost`,
        value: formatMoney(plan.worstYearCost),
        detail: `${formatMoney(plan.annualPremiumAfterCredit)} premium + ${formatMoney(plan.individualMaximumOutOfPocket.high, 0)} highest out-of-pocket maximum at this metal`,
      })),
    ],
    assumptions: [
      'Premiums, deductibles, and out-of-pocket maximums are the figures filed for this county and plan year. They are not a quote, and they do not confirm a plan is open to you.',
      'The premium tax credit is subtracted from every level alike and floored at that level’s premium, because it is a fixed dollar amount rather than a percentage off.',
      'A year with no claims costs the cheapest premium at that metal. The worst year adds the highest individual out-of-pocket maximum filed at that metal in this county, because the landscape file does not pair that cheapest premium with one plan’s own maximum. That figure is a bound, not a single plan’s bill.',
      'Deductible and out-of-pocket figures are the individual medical amounts, shown as the range across the county’s plans at that level. A family out-of-pocket maximum is higher, and drug deductibles can be separate.',
      'The middle scenario caps the care you enter at the highest out-of-pocket maximum. It does not model a deductible-then-coinsurance schedule: copays, coinsurance rates, and the split between covered services are not in the published file.',
      'Out-of-network care, services a plan excludes, balance billing, and anything above a plan’s limits sit outside the out-of-pocket maximum and outside this comparison.',
      'Provider networks, drug formularies, and prior-authorisation rules are not compared. Two plans at the same metal level and price can differ enormously on all three.',
    ],
  };
}
