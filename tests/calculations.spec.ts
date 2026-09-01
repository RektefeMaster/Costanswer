import { describe, expect, it } from 'vitest';
import { calculateHourlySalary } from '@/lib/calculations/hourly-salary';
import { calculateElectricityCost } from '@/lib/calculations/electricity-cost';
import { calculateConcrete } from '@/lib/calculations/concrete';
import { calculateEvVsGas } from '@/lib/calculations/ev-vs-gas';
import { addBusinessDays, calculateBusinessDaysBetween, federalHolidaySet } from '@/lib/calculations/business-days';
import { calculateUnitPrices } from '@/lib/calculations/unit-price';
import { formatKitchenQuantity, parseQuantity, scaleRecipe } from '@/lib/calculations/recipe-scaler';

describe('hourly salary engine', () => {
  it('matches the canonical 2,080-hour fixture', () => {
    const result = calculateHourlySalary({ hourlyRate: 28, regularHoursPerWeek: 40, overtimeHoursPerWeek: 0, overtimeMultiplier: 1.5, weeksPerYear: 52 });
    expect(result.value.annual).toBe(58_240);
    expect(result.value.weekly).toBe(1_120);
    expect(result.value.biweekly).toBe(2_240);
    expect(result.calculationVersion).toBe('compensation-v1.0.0');
  });

  it('keeps overtime separate and rejects impossible weekly hours', () => {
    const result = calculateHourlySalary({ hourlyRate: 20, regularHoursPerWeek: 40, overtimeHoursPerWeek: 5, overtimeMultiplier: 1.5, weeksPerYear: 50 });
    expect(result.value.regularAnnual).toBe(40_000);
    expect(result.value.overtimeAnnual).toBe(7_500);
    expect(() => calculateHourlySalary({ hourlyRate: 20, regularHoursPerWeek: 160, overtimeHoursPerWeek: 20, overtimeMultiplier: 1.5, weeksPerYear: 52 })).toThrow();
  });
});

describe('energy engines', () => {
  it('converts cents per kWh without unit drift', () => {
    const result = calculateElectricityCost({ monthlyKwh: 900, rateCentsPerKwh: 15.1 }, 'fixture');
    expect(result.value.monthlyEnergyCost).toBe(135.9);
    expect(result.value.annualEnergyCost).toBe(1_630.8);
    expect(result.datasetSnapshotIds).toEqual(['fixture']);
  });

  it('does not claim a dataset when the caller supplies a manual rate', () => {
    const electricity = calculateElectricityCost({ monthlyKwh: 900, rateCentsPerKwh: 12.5 });
    const vehicle = calculateEvVsGas({
      annualMiles: 12_000,
      gasMpg: 30,
      gasPricePerGallon: 3.5,
      evKwhPer100Miles: 30,
      electricityCentsPerKwh: 12.5,
      chargingLossPercent: 10,
    });
    expect(electricity.datasetSnapshotIds).toEqual([]);
    expect(vehicle.datasetSnapshotIds).toEqual([]);
  });

  it('compares EV wall energy and gasoline on the same mileage', () => {
    const result = calculateEvVsGas({
      annualMiles: 12_000,
      gasMpg: 30,
      gasPricePerGallon: 3.5,
      evKwhPer100Miles: 30,
      electricityCentsPerKwh: 15,
      chargingLossPercent: 10,
    });
    expect(result.value.gasGallons).toBe(400);
    expect(result.value.wallKwh).toBe(4_000);
    expect(result.value.gasAnnualCost).toBe(1_400);
    expect(result.value.evAnnualCost).toBe(600);
    expect(result.value.annualDifference).toBe(800);
  });
});

describe('concrete estimator', () => {
  it('separates exact geometry from a planning range', () => {
    const result = calculateConcrete({ lengthFeet: 10, widthFeet: 10, thicknessInches: 4, wastePercent: 10, bagWeight: 80 });
    expect(result.value.exactCubicFeet).toBe(33.333);
    expect(result.value.lowBags).toBe(56);
    expect(result.value.typicalBags).toBe(62);
    expect(result.value.highBags).toBe(64);
  });
});

describe('business-day engine', () => {
  it('models the observed Independence Day holiday in 2026', () => {
    expect(federalHolidaySet(2026, 2026).has('2026-07-03')).toBe(true);
    const result = calculateBusinessDaysBetween({
      startDate: '2026-07-01', endDate: '2026-07-06', includeStart: false, includeEnd: true, excludeFederalHolidays: true,
    });
    expect(result.value.businessDays).toBe(2);
    expect(result.value.federalHolidays).toBe(1);
  });

  it('adds across an observed holiday and weekend', () => {
    const result = addBusinessDays({ startDate: '2026-07-02', businessDays: 1, excludeFederalHolidays: true });
    expect(result.value.resultDate).toBe('2026-07-06');
    expect(result.value.calendarDaysMoved).toBe(4);
  });

  it('does not project Juneteenth to years before it became federal', () => {
    const result = calculateBusinessDaysBetween({
      startDate: '2020-06-18', endDate: '2020-06-22', includeStart: false, includeEnd: true, excludeFederalHolidays: true,
    });
    expect(result.value.businessDays).toBe(2);
    expect(federalHolidaySet(2020, 2020).has('2020-06-19')).toBe(false);
  });

  it('keeps holiday coverage for long-range calculations', () => {
    const result = addBusinessDays({ startDate: '2026-01-02', businessDays: 10_000, excludeFederalHolidays: true });
    expect(result.value.resultDate).toBe('2066-01-08');
    expect(federalHolidaySet(2066, 2066).has('2066-01-01')).toBe(true);
  });
});

describe('unit-price and recipe engines', () => {
  it('normalizes pounds and ounces before ranking', () => {
    const result = calculateUnitPrices({ options: [
      { id: 'a', label: 'A', price: 8.99, quantity: 24, unit: 'oz' },
      { id: 'b', label: 'B', price: 12.49, quantity: 2, unit: 'lb' },
    ] });
    expect(result.value.winnerId).toBe('a');
    expect(result.value.ranked[0].unitPrice).toBeCloseTo(0.3746, 4);
    expect(() => calculateUnitPrices({ options: [
      { id: 'a', label: 'A', price: 1, quantity: 1, unit: 'lb' },
      { id: 'b', label: 'B', price: 1, quantity: 1, unit: 'gallon' },
    ] })).toThrow();
  });

  it('ranks on exact unit cost before rounding for display', () => {
    const result = calculateUnitPrices({ options: [
      { id: 'more-expensive', label: 'A', price: 0.10004, quantity: 1, unit: 'count' },
      { id: 'cheaper', label: 'B', price: 0.10003, quantity: 1, unit: 'count' },
    ] });
    expect(result.value.winnerId).toBe('cheaper');
  });

  it('parses and emits useful kitchen fractions', () => {
    expect(parseQuantity('1½')).toBe(1.5);
    expect(formatKitchenQuantity(1.125)).toBe('1 1/8');
    const result = scaleRecipe({
      originalServings: 4,
      desiredServings: 6,
      ingredients: [
        { id: 'flour', name: 'Flour', quantity: '2', unit: 'cups' },
        { id: 'sugar', name: 'Sugar', quantity: '3/4', unit: 'cup' },
      ],
    });
    expect(result.value.ingredients[0].displayQuantity).toBe('3');
    expect(result.value.ingredients[1].displayQuantity).toBe('1 1/8');
    expect(formatKitchenQuantity(0.01)).toBe('< 1/16');
  });
});
