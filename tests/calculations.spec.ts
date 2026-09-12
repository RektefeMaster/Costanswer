import { describe, expect, it } from 'vitest';
import { calculateHourlySalary } from '@/lib/calculations/hourly-salary';
import { calculateElectricityCost } from '@/lib/calculations/electricity-cost';
import { calculateConcrete } from '@/lib/calculations/concrete';
import { calculateEvVsGas } from '@/lib/calculations/ev-vs-gas';
import { addBusinessDays, businessDateSchema, calculateBusinessDaysBetween, federalHolidaySet } from '@/lib/calculations/business-days';
import { calculateUnitPrices } from '@/lib/calculations/unit-price';
import { formatKitchenQuantity, parseQuantity, scaleRecipe } from '@/lib/calculations/recipe-scaler';
import { compareWhereCheaper } from '@/lib/calculations/where-cheaper';
import { calculateMortgage, loanFromMonthlyPrincipalAndInterest, monthlyPrincipalAndInterest } from '@/lib/calculations/mortgage';
import {
  AFFORDABILITY_BANDS,
  calculateHomeAffordability,
  maxHomePriceForBand,
  monthlyHousingCost,
  STRESS_RATE_INCREASE_POINTS,
  STRESS_REPAIR_DOLLARS,
  STRESS_INCOME_DROP_RATE,
  verdictForHousing,
} from '@/lib/calculations/home-affordability';
import { calculateInflation } from '@/lib/calculations/inflation';
import { calculateRoadTripFuel } from '@/lib/calculations/road-trip-fuel';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { gasolineSnapshot } from '@/lib/data/gasoline-snapshot';
import { grocerySnapshot } from '@/lib/data/grocery-snapshot';
import { cpiSnapshot } from '@/lib/data/cpi-snapshot';
import { round } from '@/lib/calculations/contracts';

describe('hourly salary engine', () => {
  it('matches the canonical 2,080-hour fixture', () => {
    const result = calculateHourlySalary({ hourlyRate: 28, regularHoursPerWeek: 40, overtimeHoursPerWeek: 0, overtimeMultiplier: 1.5, weeksPerYear: 52 });
    expect(result.value.annual).toBe(58_240);
    expect(result.value.weekly).toBe(1_120);
    expect(result.value.biweekly).toBe(2_240);
    expect(result.calculationVersion).toBe('compensation-v1.1.0');
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

  it('cites only the snapshots whose published figures are actually in the result', () => {
    // The page now starts from the EIA pump and electricity averages, so each
    // id has to drop out the moment the reader types over that figure.
    const inputs = {
      annualMiles: 12_000, gasMpg: 30, gasPricePerGallon: 3.5,
      evKwhPer100Miles: 30, electricityCentsPerKwh: 15, chargingLossPercent: 10,
    };
    expect(calculateEvVsGas(inputs, ['eia-electricity-x', 'eia-gasoline-x']).datasetSnapshotIds)
      .toEqual(['eia-electricity-x', 'eia-gasoline-x']);
    expect(calculateEvVsGas(inputs, ['eia-electricity-x']).datasetSnapshotIds).toEqual(['eia-electricity-x']);
    expect(calculateEvVsGas(inputs).datasetSnapshotIds).toEqual([]);
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
    expect(result.datasetSnapshotIds).toEqual(['quikrete-packaged-concrete-yields-2026-09']);
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
    expect(result.datasetSnapshotIds).toEqual(['opm-federal-holiday-rules-2026-09']);
  });

  it('does not cite holiday rules when federal holidays stay included', () => {
    const result = calculateBusinessDaysBetween({
      startDate: '2026-07-01', endDate: '2026-07-06', includeStart: false, includeEnd: true, excludeFederalHolidays: false,
    });
    expect(result.datasetSnapshotIds).toEqual([]);
  });

  it('adds across an observed holiday and weekend', () => {
    const result = addBusinessDays({ startDate: '2026-07-02', businessDays: 1, excludeFederalHolidays: true });
    expect(result.value.resultDate).toBe('2026-07-06');
    expect(result.value.calendarDaysMoved).toBe(4);
    expect(result.datasetSnapshotIds).toEqual(['opm-federal-holiday-rules-2026-09']);
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

  it('rejects malformed and impossible dates without throwing from safeParse', () => {
    for (const value of ['', '2026-02-31', '2026-2-02', '1899-12-31', '2201-01-01']) {
      expect(businessDateSchema.safeParse(value).success, value).toBe(false);
    }
    expect(businessDateSchema.safeParse('2028-02-29').success).toBe(true);
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

  it('ranks on exact unit cost and does not treat display rounding as a tie', () => {
    const result = calculateUnitPrices({ options: [
      { id: 'more-expensive', label: 'A', price: 0.10004, quantity: 1, unit: 'count' },
      { id: 'cheaper', label: 'B', price: 0.10003, quantity: 1, unit: 'count' },
    ] });
    expect(result.value.winnerId).toBe('cheaper');
    expect(result.value.winnerIds).toEqual(['cheaper']);
    expect(result.calculationVersion).toBe('unit-normalization-v1.1.1');
  });

  it('treats equivalent normalized quantities as a tie and rejects duplicate IDs', () => {
    const tie = calculateUnitPrices({ options: [
      { id: 'kg', label: 'Kilogram', price: 10, quantity: 1, unit: 'kg' },
      { id: 'g', label: 'Grams', price: 10, quantity: 1000, unit: 'g' },
    ] });
    expect(tie.value.winnerIds).toEqual(['g', 'kg']);
    expect(() => calculateUnitPrices({ options: [
      { id: 'same', label: 'A', price: 1, quantity: 1, unit: 'count' },
      { id: 'same', label: 'B', price: 2, quantity: 1, unit: 'count' },
    ] })).toThrow(/unique/i);
  });

  it('supports tbsp and compares 3 or more packages accurately', () => {
    const multi = calculateUnitPrices({
      options: [
        { id: 'tbsp', label: 'Tablespoons', price: 4, quantity: 16, unit: 'tbsp' },
        { id: 'cup', label: '1 Cup', price: 4, quantity: 1, unit: 'cup' },
        { id: 'floz', label: '16 fl oz', price: 6, quantity: 16, unit: 'fl-oz' },
      ],
    });
    expect(multi.value.winnerId).toBe('floz');
    expect(multi.value.ranked).toHaveLength(3);
    expect(multi.value.ranked[0].id).toBe('floz');
  });

  it('parses and emits useful kitchen fractions', () => {
    expect(parseQuantity('1½')).toBe(1.5);
    expect(formatKitchenQuantity(1.125)).toBe('1 1/8');
    expect(formatKitchenQuantity(1 / 3)).toBe('1/3');
    expect(formatKitchenQuantity(2 / 3)).toBe('2/3');
    expect(formatKitchenQuantity(4 / 3)).toBe('1 1/3');
    expect(formatKitchenQuantity(5 / 16)).toBe('5/16');
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

  it('rejects duplicate ingredient IDs', () => {
    expect(() => scaleRecipe({
      originalServings: 2,
      desiredServings: 4,
      ingredients: [
        { id: 'same', name: 'A', quantity: '1', unit: 'cup' },
        { id: 'same', name: 'B', quantity: '1', unit: 'cup' },
      ],
    })).toThrow(/unique/i);
  });
});

describe('where-cheaper engine', () => {
  const datasets = {
    electricity: electricitySnapshot.states,
    electricitySnapshotId: electricitySnapshot.snapshotId,
    gasoline: gasolineSnapshot,
    grocery: grocerySnapshot,
  };

  it('ranks Texas electricity below California at the same kWh', () => {
    const result = compareWhereCheaper({
      kind: 'electricity', homeState: 'TX', compareState: 'CA', monthlyKwh: 900, monthlyGallons: 40,
    }, datasets);
    const texas = electricitySnapshot.states.find((row) => row.stateCode === 'TX');
    const california = electricitySnapshot.states.find((row) => row.stateCode === 'CA');
    expect(texas && california).toBeTruthy();
    expect(result.value.home.amount).toBe(round(900 * (texas?.priceCentsPerKwh ?? 0) / 100));
    expect(result.value.compare.amount).toBe(round(900 * (california?.priceCentsPerKwh ?? 0) / 100));
    expect(result.value.cheaperPlace).toBe('home');
    expect(result.value.savings).toBe(round(result.value.compare.amount - result.value.home.amount));
    expect(result.datasetSnapshotIds).toEqual([electricitySnapshot.snapshotId]);
    expect(result.calculationVersion).toBe('where-cheaper-v1.0.0');
  });

  it('ranks the geography the provider measured, not one row per state', () => {
    // BLS prices these staples for four census regions. Ranking all 51 states
    // off four numbers reported a state-level position that does not exist.
    const grocery = compareWhereCheaper({
      kind: 'grocery', homeState: 'TX', compareState: 'CA', monthlyKwh: 900, monthlyGallons: 40,
    }, datasets).value.geographyRanking;
    expect(grocery.total).toBe(4);
    expect(grocery.unitLabel).toBe('census regions');
    expect(grocery.homeLabel).toBe('South census region');
    expect(grocery.sharedAcrossStates).toBe(true);
    expect(grocery.statesSharing).toBe(17);
    expect(grocery.homeRank).toBeLessThanOrEqual(4);

    // Electricity really is published per state, so 51 positions are honest.
    const power = compareWhereCheaper({
      kind: 'electricity', homeState: 'TX', compareState: 'CA', monthlyKwh: 900, monthlyGallons: 40,
    }, datasets).value.geographyRanking;
    expect(power.total).toBe(51);
    expect(power.unitLabel).toBe('states');
    expect(power.sharedAcrossStates).toBe(false);
  });

  it('uses the Texas weekly series and a PADD average for Alabama gasoline', () => {
    const result = compareWhereCheaper({
      kind: 'gasoline', homeState: 'TX', compareState: 'AL', monthlyKwh: 900, monthlyGallons: 40,
    }, datasets);
    const texas = gasolineSnapshot.geographies.find((row) => row.code === 'STX');
    const gulf = gasolineSnapshot.geographies.find((row) => row.code === 'R30');
    expect(result.value.home.unitPrice).toBe(texas?.dollarsPerGallon);
    expect(result.value.compare.unitPrice).toBe(gulf?.dollarsPerGallon);
    expect(result.value.home.geographyKind).toBe('state');
    expect(result.value.compare.geographyKind).toBe('padd');
    expect(result.datasetSnapshotIds).toEqual([gasolineSnapshot.snapshotId]);
  });

  it('keeps unique breakdown labels when both states are the same', () => {
    const result = compareWhereCheaper({
      kind: 'grocery', homeState: 'CA', compareState: 'CA', monthlyKwh: 900, monthlyGallons: 40,
    }, datasets);
    expect(result.value.cheaperPlace).toBe('tie');
    const labels = result.breakdown.map((step) => step.label);
    expect(labels).toEqual([...new Set(labels)]);
    expect(labels[0]).toContain('you');
    expect(labels[1]).toContain('compare');
  });

  it('ties grocery ranking for two states in the same census region', () => {
    const result = compareWhereCheaper({
      kind: 'grocery', homeState: 'TX', compareState: 'AL', monthlyKwh: 900, monthlyGallons: 40,
    }, datasets);
    expect(result.value.cheaperPlace).toBe('tie');
    expect(result.value.savings).toBe(0);
    expect(result.value.home.geographyLabel).toBe('South census region');
    expect(result.value.compare.geographyLabel).toBe('South census region');
    expect(result.value.groceryStaples.some((item) => item.home !== null)).toBe(true);
    expect(result.datasetSnapshotIds).toEqual([grocerySnapshot.snapshotId]);
  });

  it('adds electricity and gasoline for the household basket', () => {
    const result = compareWhereCheaper({
      kind: 'household', homeState: 'TX', compareState: 'CA', monthlyKwh: 900, monthlyGallons: 40,
    }, datasets);
    const power = compareWhereCheaper({
      kind: 'electricity', homeState: 'TX', compareState: 'CA', monthlyKwh: 900, monthlyGallons: 40,
    }, datasets);
    const fuel = compareWhereCheaper({
      kind: 'gasoline', homeState: 'TX', compareState: 'CA', monthlyKwh: 900, monthlyGallons: 40,
    }, datasets);
    expect(result.value.home.amount).toBe(round(power.value.home.amount + fuel.value.home.amount));
    expect(result.datasetSnapshotIds).toEqual([electricitySnapshot.snapshotId, gasolineSnapshot.snapshotId]);
  });
});

describe('mortgage engine', () => {
  it('matches the canonical 6% 30-year $200,000 payment', () => {
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
    expect(result.value.loanAmount).toBe(200_000);
    expect(result.value.paymentCount).toBe(360);
    expect(result.calculationVersion).toBe('mortgage-amortization-v1.0.0');
  });

  it('splits a 0% loan evenly and estimates PMI only below 20% down', () => {
    const zeroRate = calculateMortgage({
      homePrice: 120_000,
      downPayment: 0,
      termYears: 30,
      annualRatePercent: 0,
      annualPropertyTax: 0,
      annualHomeInsurance: 0,
      monthlyHoa: 0,
      includePmiEstimate: false,
    });
    expect(zeroRate.value.monthlyPrincipalAndInterest).toBe(333.33);

    const withPmi = calculateMortgage({
      homePrice: 400_000,
      downPayment: 40_000,
      termYears: 30,
      annualRatePercent: 6,
      annualPropertyTax: 4_800,
      annualHomeInsurance: 1_200,
      monthlyHoa: 50,
      includePmiEstimate: true,
    }, 'fixture');
    expect(withPmi.value.monthlyPmi).toBe(150);
    expect(withPmi.value.monthlyPropertyTax).toBe(400);
    expect(withPmi.value.monthlyInsurance).toBe(100);
    expect(withPmi.value.monthlyTotal).toBe(round(withPmi.value.monthlyPrincipalAndInterest + 400 + 100 + 50 + 150));
    expect(withPmi.value.monthlyTotal).toBe(
      withPmi.value.monthlyPrincipalAndInterest
      + withPmi.value.monthlyPropertyTax
      + withPmi.value.monthlyInsurance
      + withPmi.value.monthlyHoa
      + withPmi.value.monthlyPmi,
    );
    expect(withPmi.datasetSnapshotIds).toEqual(['fixture']);
  });

  it('inverts principal-and-interest exactly, including a 0% loan', () => {
    for (const rate of [0, 3, 6, 6.66, 8]) {
      for (const years of [15, 30] as const) {
        const payments = years * 12;
        const payment = monthlyPrincipalAndInterest(200_000, rate, payments);
        const loan = loanFromMonthlyPrincipalAndInterest(payment, rate, payments);
        expect(loan).toBeCloseTo(200_000, 6);
        expect(monthlyPrincipalAndInterest(loan, rate, payments)).toBeCloseTo(payment, 8);
      }
    }
  });
});

describe('home affordability engine', () => {
  const profile = {
    monthlyExistingDebt: 0,
    monthlyOtherExpenses: 0,
    downPayment: 0,
    termYears: 30 as const,
    annualRatePercent: 6,
    annualPropertyTax: 0,
    annualHomeInsurance: 0,
    monthlyHoa: 0,
    includePmiEstimate: false,
    maintenanceAnnualPercent: 0,
    closingCostPercent: 0,
  };

  it('recovers the same house when take-home is set at the comfortable cap', () => {
    const housing = monthlyHousingCost(200_000, profile);
    const monthlyNetIncome = housing.monthlyHousingTotal / AFFORDABILITY_BANDS.comfortable.maxHousingShare;
    expect(verdictForHousing(housing.monthlyHousingTotal, { ...profile, monthlyNetIncome })).toBe('comfortable');

    const result = calculateHomeAffordability({
      mode: 'how-much-house',
      monthlyNetIncome,
      ...profile,
    });
    expect(result.value.comfortableHomePrice).toBeGreaterThanOrEqual(199_990);
    expect(result.value.comfortableHomePrice).toBeLessThanOrEqual(200_000);
    expect(result.calculationVersion).toBe('home-affordability-v1.0.0');

    const thisHouse = calculateHomeAffordability({
      mode: 'this-house',
      homePrice: 200_000,
      monthlyNetIncome,
      ...profile,
    });
    expect(thisHouse.value.verdict).toBe('comfortable');
    expect(thisHouse.value.housingShare).toBeCloseTo(0.25, 10);
    expect(thisHouse.value.monthlyHousingTotal).toBe(1_199.1);
    expect(thisHouse.value.pathToComfortable?.extraDownPayment).toBe(0);
    expect(thisHouse.value.pathToComfortable?.priceCut).toBe(0);
  });

  it('matches the mortgage engine when repairs are left out', () => {
    const mortgage = calculateMortgage({
      homePrice: 400_000,
      downPayment: 40_000,
      termYears: 30,
      annualRatePercent: 6,
      annualPropertyTax: 4_800,
      annualHomeInsurance: 1_200,
      monthlyHoa: 50,
      includePmiEstimate: true,
    });
    const housing = monthlyHousingCost(400_000, {
      ...profile,
      downPayment: 40_000,
      annualPropertyTax: 4_800,
      annualHomeInsurance: 1_200,
      monthlyHoa: 50,
      includePmiEstimate: true,
    });
    expect(round(housing.monthlyPrincipalAndInterest)).toBe(mortgage.value.monthlyPrincipalAndInterest);
    expect(round(housing.monthlyPmi)).toBe(mortgage.value.monthlyPmi);
    expect(round(housing.monthlyHousingTotal)).toBe(mortgage.value.monthlyTotal);
  });

  it('marks a house above the 32% housing cap as risky and names a cheaper comfortable price', () => {
    const monthlyNetIncome = 8_000;
    const result = calculateHomeAffordability({
      mode: 'this-house',
      homePrice: 520_000,
      monthlyNetIncome,
      ...profile,
      downPayment: 80_000,
      includePmiEstimate: true,
    });
    expect(result.value.verdict).toBe('risky');
    expect(result.value.housingShare).toBeGreaterThan(AFFORDABILITY_BANDS.reasonable.maxHousingShare);
    expect(result.value.comfortableHomePrice).toBeGreaterThan(0);
    expect(result.value.comfortableHomePrice).toBeLessThan(520_000);
    expect(result.value.priceGap).toBe(520_000 - result.value.comfortableHomePrice);
    const comfortableHousing = monthlyHousingCost(result.value.comfortableHomePrice, {
      ...profile,
      downPayment: 80_000,
      includePmiEstimate: true,
    });
    expect(verdictForHousing(comfortableHousing.monthlyHousingTotal, { monthlyNetIncome, monthlyExistingDebt: 0, monthlyOtherExpenses: 0 })).toBe('comfortable');
  });

  it('stress-tests rate, tax, a cash repair, and a pay cut from the same loan', () => {
    const monthlyNetIncome = 7_000;
    const result = calculateHomeAffordability({
      mode: 'this-house',
      homePrice: 360_000,
      monthlyNetIncome,
      ...profile,
      downPayment: 72_000,
      annualPropertyTax: 6_000,
      includePmiEstimate: false,
    });
    const housing = monthlyHousingCost(360_000, {
      ...profile,
      downPayment: 72_000,
      annualPropertyTax: 6_000,
      includePmiEstimate: false,
    });
    const stressed = monthlyPrincipalAndInterest(housing.loanAmount, 6 + STRESS_RATE_INCREASE_POINTS, 360);
    expect(result.value.stress?.rateBumpMonthly).toBe(round(stressed - housing.monthlyPrincipalAndInterest));
    expect(result.value.stress?.taxBumpMonthly).toBe(round(500 * 0.15));
    const essentials = housing.monthlyHousingTotal + 0 + 0;
    expect(result.value.stress?.repairMonthsRemaining).toBe(round((6 * essentials - STRESS_REPAIR_DOLLARS) / essentials, 1));
    expect(result.value.stress?.incomeDropHousingShare).toBeCloseTo(
      housing.monthlyHousingTotal / (monthlyNetIncome * (1 - STRESS_INCOME_DROP_RATE)),
      10,
    );
  });

  it('returns extra down payment or a price cut that actually reaches comfortable', () => {
    const monthlyNetIncome = 6_500;
    const result = calculateHomeAffordability({
      mode: 'this-house',
      homePrice: 420_000,
      monthlyNetIncome,
      ...profile,
      downPayment: 50_000,
      includePmiEstimate: true,
    });
    expect(result.value.verdict).not.toBe('comfortable');
    const extra = result.value.pathToComfortable?.extraDownPayment ?? null;
    const cut = result.value.pathToComfortable?.priceCut ?? null;
    expect(extra === null || extra > 0 || (cut !== null && cut > 0)).toBe(true);
    if (extra !== null && extra > 0) {
      const next = calculateHomeAffordability({
        mode: 'this-house',
        homePrice: 420_000,
        monthlyNetIncome,
        ...profile,
        downPayment: 50_000 + extra,
        includePmiEstimate: true,
      });
      expect(next.value.verdict).toBe('comfortable');
    }
    if (cut !== null && cut > 0) {
      const next = calculateHomeAffordability({
        mode: 'this-house',
        homePrice: 420_000 - cut,
        monthlyNetIncome,
        ...profile,
        downPayment: 50_000,
        includePmiEstimate: true,
      });
      expect(next.value.verdict).toBe('comfortable');
    }
  });

  it('orders how-much-house prices Comfortable ≤ Reasonable ≤ Aggressive', () => {
    const result = calculateHomeAffordability({
      mode: 'how-much-house',
      monthlyNetIncome: 9_000,
      ...profile,
      downPayment: 60_000,
      includePmiEstimate: true,
      maintenanceAnnualPercent: 1,
    });
    expect(result.value.comfortableHomePrice).toBeGreaterThan(60_000);
    expect(result.value.reasonableHomePrice).toBeGreaterThanOrEqual(result.value.comfortableHomePrice);
    expect(result.value.aggressiveHomePrice).toBeGreaterThanOrEqual(result.value.reasonableHomePrice);
    expect(maxHomePriceForBand({ ...profile, monthlyNetIncome: 9_000, downPayment: 60_000, includePmiEstimate: true, maintenanceAnnualPercent: 1, monthlyExistingDebt: 0, monthlyOtherExpenses: 0, closingCostPercent: 0 }, 'comfortable')).toBe(result.value.comfortableHomePrice);
  });
});

describe('inflation engine', () => {
  it('scales January 2000 dollars with the published CPI-U series', () => {
    const result = calculateInflation(
      { amount: 100, startPeriod: '2000-01', endPeriod: '2026-07' },
      { observations: cpiSnapshot.observations, snapshotId: cpiSnapshot.snapshotId },
    );
    expect(result.value.startIndex).toBe(168.8);
    expect(result.value.endIndex).toBe(333.918);
    expect(result.value.equivalentAmount).toBe(197.82);
    expect(result.value.multiplier).toBe(round(333.918 / 168.8, 4));
    expect(result.datasetSnapshotIds).toEqual([cpiSnapshot.snapshotId]);
    expect(result.calculationVersion).toBe('cpi-u-inflation-v1.0.0');
  });

  it('does not invent a CPI month BLS skipped', () => {
    expect(() => calculateInflation(
      { amount: 100, startPeriod: '2025-10', endPeriod: '2026-07' },
      { observations: cpiSnapshot.observations, snapshotId: cpiSnapshot.snapshotId },
    )).toThrow(/2025-10/);
  });
});

describe('road-trip fuel engine', () => {
  it('divides miles by MPG before applying the pump price', () => {
    const result = calculateRoadTripFuel({ miles: 300, mpg: 25, dollarsPerGallon: 3.5 }, 'fixture');
    expect(result.value.gallons).toBe(12);
    expect(result.value.tripCost).toBe(42);
    expect(result.value.costPerMile).toBe(0.14);
    expect(result.datasetSnapshotIds).toEqual(['fixture']);
  });

  it('does not claim a dataset when the caller supplies a pump price only', () => {
    const result = calculateRoadTripFuel({ miles: 100, mpg: 20, dollarsPerGallon: 4 });
    expect(result.datasetSnapshotIds).toEqual([]);
  });

  it('keeps three-decimal gasoline prices in the fuel-cost breakdown', () => {
    const result = calculateRoadTripFuel({ miles: 300, mpg: 28, dollarsPerGallon: 3.577 }, 'fixture');
    expect(result.breakdown.find((step) => step.label === 'Fuel cost')?.detail).toContain('$3.577');
  });
});

describe('rounding policy', () => {
  it('rounds midpoint values symmetrically away from zero', () => {
    expect([1.005, 2.675, 10.075].map((value) => round(value, 2))).toEqual([1.01, 2.68, 10.08]);
    expect([-1.005, -2.675, -10.075].map((value) => round(value, 2))).toEqual([-1.01, -2.68, -10.08]);
  });

  it('rejects non-finite values and unsupported precision', () => {
    expect(() => round(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => round(1, 20)).toThrow();
  });
});
