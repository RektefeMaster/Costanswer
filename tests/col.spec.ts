import { describe, expect, it } from 'vitest';
import { calculateCostOfLiving } from '@/lib/calculations/cost-of-living';
import { defaultFoodMembers, usdaFoodPlanMonthlyCost } from '@/lib/calculations/col/food';
import { usdaFoodSnapshot } from '@/lib/data/usda-food-snapshot';
import { composeColTransport } from '@/lib/calculations/col/transport';
import { getBeaMetroRpp } from '@/lib/data/bea-rpp-snapshot';
import { getGasolinePriceForState } from '@/lib/data/gasoline-snapshot';
import { getElectricityRate } from '@/lib/data/electricity-snapshot';
import { vehicleOperatingCost } from '@/lib/calculations/vehicle/operating';
import { estimateAnnualTaxLiability } from '@/lib/calculations/tax/annual';
import { COST_OF_LIVING_ENGINE_ID } from '@/lib/calculations/col/version';
import { HOME_AFFORDABILITY_VERSION } from '@/lib/calculations/home-affordability';
import { CAR_AFFORDABILITY_ENGINE_ID } from '@/lib/calculations/vehicle/version';
import { SALARY_AFTER_TAX_ENGINE_ID } from '@/lib/calculations/tax/version';
import { COL_SOURCE_MATRIX } from '@/lib/calculations/col/source-matrix';

describe('USDA food plan household fixture', () => {
  it('uses official July 2026 Moderate-Cost amounts and household-size factors', () => {
    const members = defaultFoodMembers(2, 0);
    expect(members.map((row) => row.group)).toEqual(['male_20_50', 'female_20_50']);
    const result = usdaFoodPlanMonthlyCost({
      snapshot: usdaFoodSnapshot,
      plan: 'moderate-cost',
      members,
      state: 'TX',
    });
    expect(result.monthly).toBeCloseTo((398.7 + 337.1) * 1.1, 5);
    expect(result.geographyLabel).toMatch(/national/i);
    expect(() => defaultFoodMembers(0, 0)).toThrow(/at least one person/);
  });
});

describe('COL composition arithmetic', () => {
  it('matches the independent 1800+700+400+100 fixture', () => {
    const result = calculateCostOfLiving({
      locationId: 'place:4805000',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'manual',
      manualHousing: 1800,
      manualFood: 700,
      transportMode: 'manual',
      manualTransport: 400,
      otherEssentials: 100,
      incomeMode: 'take-home',
      monthlyTakeHome: 5000,
      asOf: '2026-09-02',
    });
    expect(result.value.comparison.total).toBe(3000);
    expect(result.value.income.incomeShare).toBe(0.6);
    expect(result.value.income.remainingAfterModeledCosts).toBe(2000);
    expect(result.value.housing.calculationSource).toBe('manual');
    expect(result.value.food.calculationSource).toBe('manual');
    expect(result.value.transportation.calculationSource).toBe('manual');
    expect(result.datasetSnapshotIds.some((id) => id.startsWith('hud-fmr'))).toBe(false);
    expect(result.datasetSnapshotIds.some((id) => id.startsWith('usda-food'))).toBe(false);
    expect(result.datasetSnapshotIds.some((id) => id.startsWith('eia-'))).toBe(false);
  });
});

describe('double-count protections', () => {
  it('does not multiply HUD FMR by BEA housing or all-items RPP', () => {
    const result = calculateCostOfLiving({
      locationId: 'place:4805000',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'hud',
      transportMode: 'none',
      incomeMode: 'none',
      asOf: '2026-09-02',
    });
    const housingRpp = getBeaMetroRpp('12420', 'housingRents')!.value;
    const allItems = getBeaMetroRpp('12420', 'allItems')!.value;
    expect(result.value.housing.amount).toBe(1852);
    expect(result.value.housing.amount).not.toBeCloseTo(1852 * housingRpp / 100);
    expect(result.value.housing.amount).not.toBeCloseTo(1852 * allItems / 100);
    expect(result.value.housing.rppApplied).toBe(false);
    expect(result.value.housing.containsDefaultHouseholdElectricity).toBe(false);
    expect(result.value.regionalPriceContext.notAppliedToTotal).toBe(true);
  });

  it('does not add a default household electricity bill on top of HUD gross rent', () => {
    const result = calculateCostOfLiving({
      locationId: 'place:4805000',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'hud',
      transportMode: 'none',
      incomeMode: 'none',
      asOf: '2026-09-02',
    });
    const texasElectricity = getElectricityRate('TX').priceCentsPerKwh;
    expect(result.value.housing.amount).toBe(1852);
    expect(result.value.housing.amount).not.toBe(1852 + texasElectricity);
    expect(result.datasetSnapshotIds.some((id) => id.startsWith('eia-electricity'))).toBe(false);
  });

  it('does not multiply EIA gasoline by BEA RPP', () => {
    const result = calculateCostOfLiving({
      locationId: 'place:4805000',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'manual',
      manualHousing: 1800,
      transportMode: 'gas',
      annualMiles: 12000,
      mpg: 30,
      monthlyInsurance: 0,
      monthlyMaintenance: 0,
      annualRegistration: 0,
      incomeMode: 'none',
      asOf: '2026-09-02',
    });
    const gas = getGasolinePriceForState('TX').dollarsPerGallon;
    const expected = vehicleOperatingCost({
      energy: { powertrain: 'gas', annualMiles: 12000, mpg: 30, dollarsPerGallon: gas },
      monthlyInsurance: 0,
      monthlyMaintenance: 0,
      annualRegistration: 0,
    }).monthlyOperatingTotal;
    const rpp = getBeaMetroRpp('12420', 'allItems')!.value;
    expect(result.value.transportation.amount).toBeCloseTo(expected, 1);
    expect(result.value.transportation.amount).not.toBeCloseTo(expected * rpp / 100, 1);
    expect(result.value.transportation.rppApplied).toBe(false);
  });

  it('does not multiply EV charging electricity by BEA RPP', () => {
    const result = calculateCostOfLiving({
      locationId: 'place:4805000',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'manual',
      manualHousing: 1800,
      transportMode: 'ev',
      annualMiles: 12000,
      kwhPer100Miles: 30,
      chargingLossPercent: 10,
      monthlyInsurance: 0,
      monthlyMaintenance: 0,
      annualRegistration: 0,
      incomeMode: 'none',
      asOf: '2026-09-02',
    });
    const rate = getElectricityRate('TX').priceCentsPerKwh;
    const expected = vehicleOperatingCost({
      energy: { powertrain: 'ev', annualMiles: 12000, kwhPer100Miles: 30, electricityCentsPerKwh: rate, chargingLossPercent: 10 },
      monthlyInsurance: 0,
      monthlyMaintenance: 0,
      annualRegistration: 0,
    }).monthlyOperatingTotal;
    const rpp = getBeaMetroRpp('12420', 'allItems')!.value;
    expect(result.value.transportation.amount).toBeCloseTo(expected, 1);
    expect(result.value.transportation.amount).not.toBeCloseTo(expected * rpp / 100, 1);
  });

  it('does not silently multiply USDA food by BEA all-items RPP', () => {
    const result = calculateCostOfLiving({
      locationId: 'place:4805000',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'manual',
      manualHousing: 1800,
      transportMode: 'none',
      incomeMode: 'none',
      asOf: '2026-09-02',
    });
    const food = usdaFoodPlanMonthlyCost({
      snapshot: usdaFoodSnapshot,
      plan: 'moderate-cost',
      members: defaultFoodMembers(2, 0),
      state: 'TX',
    }).monthly;
    const rpp = getBeaMetroRpp('12420', 'allItems')!.value;
    expect(result.value.food.amount).toBeCloseTo(food, 6);
    expect(result.value.food.amount).not.toBeCloseTo(food * rpp / 100, 6);
    expect(result.value.food.rppApplied).toBe(false);
  });

  it('does not add income tax as a COL expense after converting gross salary to take-home', () => {
    const result = calculateCostOfLiving({
      locationId: 'place:4805000',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'manual',
      manualHousing: 1800,
      manualFood: 700,
      transportMode: 'manual',
      manualTransport: 400,
      incomeMode: 'gross-salary',
      annualGrossSalary: 80000,
      filingStatus: 'single',
      asOf: '2026-09-02',
    });
    const tax = estimateAnnualTaxLiability({
      annualGrossSalary: 80000,
      state: 'TX',
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(result.value.income.monthlyTakeHome).toBeCloseTo(tax.takeHome / 12, 2);
    expect(result.value.comparison.total).toBe(2900);
    expect(result.value.housing.amount! + result.value.food.amount! + result.value.transportation.amount!).toBe(2900);
    expect(result.assumptions.join(' ')).toMatch(/Tax is not added again as an expense|not added again as an expense|take-home/);
  });
});

describe('unsupported state tax and no-car semantics', () => {
  it('marks remaining income provisional when state income tax is omitted', () => {
    const result = calculateCostOfLiving({
      locationId: 'place:3651000',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'manual',
      manualHousing: 2000,
      transportMode: 'none',
      incomeMode: 'gross-salary',
      annualGrossSalary: 80000,
      filingStatus: 'single',
      asOf: '2026-09-02',
    });
    expect(result.value.income.stateTaxStatus).toBe('unsupported');
    expect(result.value.income.completeness).toBe('provisional');
    expect(result.value.incomplete).toBe(true);
  });

  it('does not report remaining cash when housing is unmapped', () => {
    const result = calculateCostOfLiving({
      locationId: 'state:TX',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'hud',
      transportMode: 'none',
      incomeMode: 'take-home',
      monthlyTakeHome: 5000,
      asOf: '2026-09-02',
    });
    expect(result.value.housing.included).toBe(false);
    expect(result.value.incomplete).toBe(true);
    expect(result.value.income.remainingAfterModeledCosts).toBeNull();
    expect(result.value.income.incomeShare).toBeNull();
    expect(result.value.income.completeness).toBe('provisional');
    expect(result.value.comparison.total).toBeNull();
    expect(result.value.comparison.comparable).toBe(false);
  });

  it('does not publish a food-only comparison total for unmapped city housing', () => {
    const result = calculateCostOfLiving({
      locationId: 'place:3651000',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'hud',
      transportMode: 'none',
      incomeMode: 'take-home',
      monthlyTakeHome: 5000,
      asOf: '2026-09-02',
    });
    expect(result.value.housing.included).toBe(false);
    expect(result.value.food.amount).toBeCloseTo(809.38, 2);
    expect(result.value.comparison.total).toBeNull();
    expect(result.value.comparison.comparable).toBe(false);
    expect(result.value.income.remainingAfterModeledCosts).toBeNull();
    expect(result.breakdown.some((row) => row.value === 'Not comparable')).toBe(true);
    const manhattan = calculateCostOfLiving({
      locationId: 'place:3651000',
      countyGeoid: '36061',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'hud',
      transportMode: 'none',
      incomeMode: 'take-home',
      monthlyTakeHome: 5000,
      asOf: '2026-09-02',
    });
    expect(manhattan.value.housing.included).toBe(true);
    expect(manhattan.value.comparison.comparable).toBe(true);
    expect(manhattan.value.comparison.total).toBe(manhattan.value.totalModeledMonthlyCost);
    expect(manhattan.value.comparison.total).not.toBe(manhattan.value.food.amount);
  });

  it('does not treat no personal vehicle as $0 transportation', () => {
    const result = calculateCostOfLiving({
      locationId: 'place:4805000',
      bedrooms: 'br2',
      adults: 2,
      children: 0,
      foodPlan: 'moderate-cost',
      housingMode: 'manual',
      manualHousing: 1800,
      transportMode: 'none',
      incomeMode: 'none',
      asOf: '2026-09-02',
    });
    expect(result.value.transportation.included).toBe(false);
    expect(result.value.transportation.amount).toBeNull();
    expect(composeColTransport({ mode: 'none' }).amount).toBeNull();
  });
});

describe('engine versions stay pinned', () => {
  it('does not bump existing calculator engines because COL reused shared data', () => {
    expect(COST_OF_LIVING_ENGINE_ID).toBe('cost-of-living-v1.0.0');
    expect(HOME_AFFORDABILITY_VERSION).toBe('home-affordability-v1.0.0');
    expect(CAR_AFFORDABILITY_ENGINE_ID).toBe('car-affordability-v1.0.0');
    expect(SALARY_AFTER_TAX_ENGINE_ID).toBe('salary-after-tax-v1.0.0');
    expect(COL_SOURCE_MATRIX.housing.rppApplied).toBe(false);
    expect(COL_SOURCE_MATRIX.housing.containsUtilities).toBe(true);
  });
});
