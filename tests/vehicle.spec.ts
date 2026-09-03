import { describe, expect, it } from 'vitest';
import {
  CAR_AFFORDABILITY_ENGINE_ID,
  calculateCarAffordability,
  type CarAffordabilityInput,
} from '@/lib/calculations/car-affordability';
import {
  VEHICLE_AFFORDABILITY_BANDS,
  composeVehicleOwnershipCost,
  composeVehiclePurchase,
  financeVehicle,
  maxVehiclePriceForBand,
  vehicleBurden,
  vehicleEnergyCost,
  vehicleOperatingCost,
} from '@/lib/calculations/vehicle';
import { calculateEvVsGas } from '@/lib/calculations/ev-vs-gas';
import { calculateLoan } from '@/lib/calculations/loan';
import { calculateRoadTripFuel } from '@/lib/calculations/road-trip-fuel';
import { gasolineSnapshot, getGasolinePriceForState } from '@/lib/data/gasoline-snapshot';
import { electricitySnapshot, getElectricityRate } from '@/lib/data/electricity-snapshot';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';

/**
 * Hand-computed fixture. A $30,000 car with $6,000 down leaves $24,000 financed; at 0%
 * over 60 months that is exactly $400/month. 12,000 miles at 25 MPG is 480 gallons, and
 * at $3.50 that is $1,680 a year, or exactly $140 a month.
 */
const baseInput: CarAffordabilityInput = {
  mode: 'this-car',
  vehiclePrice: 30_000,
  state: 'TX',
  income: { incomeMode: 'take-home', monthlyTakeHome: 4_000 },
  driving: { powertrain: 'gas', annualMiles: 12_000, mpg: 25, dollarsPerGallon: 3.5 },
  downPayment: 6_000,
  tradeInValue: 0,
  salesTaxAndFees: 0,
  annualRatePercent: 0,
  termMonths: 60,
  monthlyInsurance: 150,
  monthlyMaintenance: 75,
  annualRegistration: 240,
};

function withInput(overrides: Partial<Record<string, unknown>>): unknown {
  return { ...baseInput, ...overrides };
}

describe('vehicle financing composition', () => {
  it('splits a financed purchase into credits, financed amount, and cash at signing', () => {
    const purchase = composeVehiclePurchase({
      vehiclePrice: 30_000,
      salesTaxAndFees: 2_000,
      downPayment: 6_000,
      tradeInValue: 4_000,
    });
    expect(purchase.amountDue).toBe(32_000);
    expect(purchase.creditsApplied).toBe(10_000);
    expect(purchase.amountFinanced).toBe(22_000);
    expect(purchase.upfrontCash).toBe(6_000);
    expect(purchase.financed).toBe(true);
  });

  it('divides a zero-interest loan evenly and charges no interest', () => {
    const financing = financeVehicle({
      purchase: composeVehiclePurchase({ vehiclePrice: 30_000, salesTaxAndFees: 0, downPayment: 6_000, tradeInValue: 0 }),
      annualRatePercent: 0,
      termMonths: 60,
    });
    expect(financing.monthlyPayment).toBe(400);
    expect(financing.totalInterest).toBe(0);
    expect(financing.totalOfPayments).toBe(24_000);
  });

  it('matches the published payment for $24,000 over 60 months at 6%', () => {
    const financing = financeVehicle({
      purchase: composeVehiclePurchase({ vehiclePrice: 30_000, salesTaxAndFees: 0, downPayment: 6_000, tradeInValue: 0 }),
      annualRatePercent: 6,
      termMonths: 60,
    });
    expect(financing.monthlyPayment).toBeCloseTo(463.99, 2);
    expect(financing.totalOfPayments).toBeCloseTo(financing.monthlyPayment * 60, 6);
    expect(financing.totalInterest).toBeCloseTo(financing.totalOfPayments - 24_000, 6);
  });

  it('treats a fully covered purchase as cash with no loan and no term requirement', () => {
    const purchase = composeVehiclePurchase({ vehiclePrice: 15_000, salesTaxAndFees: 0, downPayment: 15_000, tradeInValue: 0 });
    expect(purchase.financed).toBe(false);
    const financing = financeVehicle({ purchase, annualRatePercent: 7, termMonths: 0 });
    expect(financing.monthlyPayment).toBe(0);
    expect(financing.totalInterest).toBe(0);
    expect(financing.purchase.upfrontCash).toBe(15_000);
  });

  it('rejects credits above the amount due and a financed purchase with no term', () => {
    expect(() => composeVehiclePurchase({ vehiclePrice: 20_000, salesTaxAndFees: 0, downPayment: 25_000, tradeInValue: 0 }))
      .toThrow(/cannot be more than the price/);
    expect(() => composeVehiclePurchase({ vehiclePrice: 20_000, salesTaxAndFees: 0, downPayment: 15_000, tradeInValue: 6_000 }))
      .toThrow(/cannot be more than the price/);
    expect(() => financeVehicle({
      purchase: composeVehiclePurchase({ vehiclePrice: 20_000, salesTaxAndFees: 0, downPayment: 5_000, tradeInValue: 0 }),
      annualRatePercent: 6,
      termMonths: 0,
    })).toThrow(/at least one payment/);
    expect(() => composeVehiclePurchase({ vehiclePrice: -1, salesTaxAndFees: 0, downPayment: 0, tradeInValue: 0 }))
      .toThrow(/cannot be negative/);
  });
});

describe('vehicle operating cost', () => {
  it('reuses the gasoline primitive and normalizes it to a month', () => {
    const energy = vehicleEnergyCost({ powertrain: 'gas', annualMiles: 12_000, mpg: 25, dollarsPerGallon: 3.5 });
    expect(energy.gallonsPerYear).toBe(480);
    expect(energy.annualEnergyCost).toBe(1_680);
    expect(energy.monthlyEnergyCost).toBe(140);
    expect(energy.energyCostPerMile).toBe(0.14);
    expect(energy.wallKwhPerYear).toBeNull();
  });

  it('reuses the EV battery and charging-loss primitives', () => {
    const energy = vehicleEnergyCost({
      powertrain: 'ev',
      annualMiles: 12_000,
      kwhPer100Miles: 30,
      electricityCentsPerKwh: 15,
      chargingLossPercent: 10,
    });
    expect(energy.wallKwhPerYear).toBe(4_000);
    expect(energy.annualEnergyCost).toBe(600);
    expect(energy.monthlyEnergyCost).toBe(50);
    expect(energy.gallonsPerYear).toBeNull();
  });

  it('keeps zero mileage at zero energy cost without dividing by miles', () => {
    const gas = vehicleEnergyCost({ powertrain: 'gas', annualMiles: 0, mpg: 25, dollarsPerGallon: 3.5 });
    expect(gas.annualEnergyCost).toBe(0);
    expect(gas.energyCostPerMile).toBe(0);
    const ev = vehicleEnergyCost({ powertrain: 'ev', annualMiles: 0, kwhPer100Miles: 30, electricityCentsPerKwh: 15, chargingLossPercent: 10 });
    expect(ev.annualEnergyCost).toBe(0);
    expect(ev.energyCostPerMile).toBe(0);
  });

  it('rejects impossible efficiency and negative recurring costs', () => {
    expect(() => vehicleEnergyCost({ powertrain: 'gas', annualMiles: 100, mpg: 0, dollarsPerGallon: 3.5 }))
      .toThrow(/Miles per gallon/);
    expect(() => vehicleEnergyCost({ powertrain: 'ev', annualMiles: 100, kwhPer100Miles: 0, electricityCentsPerKwh: 15, chargingLossPercent: 10 }))
      .toThrow(/EV efficiency/);
    expect(() => vehicleEnergyCost({ powertrain: 'ev', annualMiles: 100, kwhPer100Miles: 30, electricityCentsPerKwh: 15, chargingLossPercent: 100 }))
      .toThrow(/less than 100/);
    expect(() => vehicleOperatingCost({
      energy: { powertrain: 'gas', annualMiles: 12_000, mpg: 25, dollarsPerGallon: 3.5 },
      monthlyInsurance: -1,
      monthlyMaintenance: 0,
      annualRegistration: 0,
    })).toThrow(/Insurance cannot be negative/);
  });

  it('adds insurance, upkeep, and registration onto the energy line', () => {
    const operating = vehicleOperatingCost({
      energy: { powertrain: 'gas', annualMiles: 12_000, mpg: 25, dollarsPerGallon: 3.5 },
      monthlyInsurance: 150,
      monthlyMaintenance: 75,
      annualRegistration: 240,
    });
    expect(operating.monthlyRegistration).toBe(20);
    expect(operating.monthlyOperatingTotal).toBe(385);
    expect(operating.annualOperatingTotal).toBe(4_620);
  });
});

describe('vehicle ownership and affordability rules', () => {
  const ownership = composeVehicleOwnershipCost({
    financing: financeVehicle({
      purchase: composeVehiclePurchase({ vehiclePrice: 30_000, salesTaxAndFees: 0, downPayment: 6_000, tradeInValue: 0 }),
      annualRatePercent: 0,
      termMonths: 60,
    }),
    operating: vehicleOperatingCost({
      energy: { powertrain: 'gas', annualMiles: 12_000, mpg: 25, dollarsPerGallon: 3.5 },
      monthlyInsurance: 150,
      monthlyMaintenance: 75,
      annualRegistration: 240,
    }),
  });

  it('adds the payment to every recurring cost', () => {
    expect(ownership.monthlyLoanPayment).toBe(400);
    expect(ownership.monthlyOperatingCost).toBe(385);
    expect(ownership.monthlyTotal).toBe(785);
    expect(ownership.annualTotal).toBe(9_420);
    expect(ownership.costPerMile).toBe(0.785);
    expect(ownership.upfrontCash).toBe(6_000);
  });

  it('scores the burden against take-home pay, not gross pay', () => {
    const burden = vehicleBurden({ monthlyTakeHome: 4_000, monthlyTotal: 785, monthlyLoanPayment: 400 });
    expect(burden.totalShare).toBeCloseTo(0.19625, 10);
    expect(burden.paymentShare).toBe(0.1);
    expect(burden.leftoverMonthly).toBe(3_215);
    expect(burden.verdict).toBe('stretch');
  });

  it('separates a comfortable payment from an expensive car', () => {
    expect(vehicleBurden({ monthlyTakeHome: 4_000, monthlyTotal: 560, monthlyLoanPayment: 380 }).verdict).toBe('comfortable');
    expect(vehicleBurden({ monthlyTakeHome: 4_000, monthlyTotal: 560, monthlyLoanPayment: 450 }).verdict).toBe('stretch');
    expect(vehicleBurden({ monthlyTakeHome: 4_000, monthlyTotal: 560, monthlyLoanPayment: 700 }).verdict).toBe('risky');
    expect(vehicleBurden({ monthlyTakeHome: 4_000, monthlyTotal: 900, monthlyLoanPayment: 300 }).verdict).toBe('risky');
  });

  it('refuses to divide a vehicle cost by zero income', () => {
    expect(() => vehicleBurden({ monthlyTakeHome: 0, monthlyTotal: 785, monthlyLoanPayment: 400 }))
      .toThrow(/take-home pay must be greater than zero/i);
  });
});

describe('reverse affordability', () => {
  const reverseInput = {
    monthlyTakeHome: 4_000,
    monthlyOperatingCost: 0,
    annualRatePercent: 0,
    termMonths: 60,
    downPayment: 6_000,
    tradeInValue: 0,
    salesTaxAndFees: 0,
  };

  it('inverts the payment factor back into a sticker price', () => {
    expect(maxVehiclePriceForBand({ ...reverseInput, band: 'comfortable' }).maxVehiclePrice).toBe(30_000);
    expect(maxVehiclePriceForBand({ ...reverseInput, band: 'reasonable' }).maxVehiclePrice).toBe(42_000);
    expect(maxVehiclePriceForBand({ ...reverseInput, band: 'aggressive' }).maxVehiclePrice).toBe(54_000);
  });

  it('subtracts taxes and fees from the price the budget can carry', () => {
    expect(maxVehiclePriceForBand({ ...reverseInput, salesTaxAndFees: 2_000, band: 'comfortable' }).maxVehiclePrice).toBe(28_000);
  });

  it('spends the payment budget on running costs first', () => {
    const budget = maxVehiclePriceForBand({ ...reverseInput, monthlyOperatingCost: 385, band: 'comfortable' });
    expect(budget.monthlyTotalBudget).toBe(600);
    expect(budget.monthlyPaymentBudget).toBe(215);
    expect(budget.maxVehiclePrice).toBe(18_900);
  });

  it('still allows a cash purchase when running costs use the whole budget', () => {
    const budget = maxVehiclePriceForBand({ ...reverseInput, monthlyOperatingCost: 600, band: 'comfortable' });
    expect(budget.monthlyPaymentBudget).toBe(0);
    expect(budget.maxVehiclePrice).toBe(6_000);
  });

  it('returns no price when running costs alone break the band', () => {
    expect(maxVehiclePriceForBand({ ...reverseInput, monthlyOperatingCost: 900, band: 'comfortable' }).maxVehiclePrice).toBe(0);
  });

  it('produces a price the forward model agrees with', () => {
    for (const band of ['comfortable', 'reasonable', 'aggressive'] as const) {
      const budget = maxVehiclePriceForBand({ ...reverseInput, monthlyOperatingCost: 385, band });
      const financing = financeVehicle({
        purchase: composeVehiclePurchase({
          vehiclePrice: budget.maxVehiclePrice,
          salesTaxAndFees: 0,
          downPayment: 6_000,
          tradeInValue: 0,
        }),
        annualRatePercent: 0,
        termMonths: 60,
      });
      const monthlyTotal = financing.monthlyPayment + 385;
      expect(monthlyTotal).toBeLessThanOrEqual(4_000 * VEHICLE_AFFORDABILITY_BANDS[band].maxTotalShare + 1e-9);
      expect(financing.monthlyPayment).toBeLessThanOrEqual(4_000 * VEHICLE_AFFORDABILITY_BANDS[band].maxPaymentShare + 1e-9);
    }
  });

  it('treats a missing loan term as a cash-only budget instead of an error', () => {
    expect(maxVehiclePriceForBand({ ...reverseInput, termMonths: 0, band: 'comfortable' }).maxVehiclePrice).toBe(6_000);
  });
});

describe('car affordability calculator', () => {
  it('reports the true monthly cost, not just the loan payment', () => {
    const result = calculateCarAffordability(baseInput);
    expect(result.value.monthlyLoanPayment).toBe(400);
    expect(result.value.monthlyEnergyCost).toBe(140);
    expect(result.value.monthlyOperatingCost).toBe(385);
    expect(result.value.monthlyTotal).toBe(785);
    expect(result.value.annualTotal).toBe(9_420);
    expect(result.value.costPerMile).toBe(0.785);
    expect(result.value.amountFinanced).toBe(24_000);
    expect(result.value.upfrontCash).toBe(6_000);
    expect(result.value.totalOfPayments).toBe(24_000);
    expect(result.value.totalInterest).toBe(0);
    expect(result.value.verdict).toBe('stretch');
    expect(result.value.totalShare).toBeCloseTo(0.19625, 10);
    expect(result.value.paymentShare).toBe(0.1);
    expect(result.calculationVersion).toBe('car-affordability-v1.0.0');
    expect(result.calculationVersion).toBe(CAR_AFFORDABILITY_ENGINE_ID);
  });

  it('answers how much car the same budget could carry', () => {
    const result = calculateCarAffordability(withInput({ mode: 'how-much-car', vehiclePrice: undefined }));
    expect(result.value.mode).toBe('how-much-car');
    expect(result.value.comfortablePrice).toBe(18_900);
    expect(result.value.reasonablePrice).toBe(30_900);
    expect(result.value.aggressivePrice).toBe(42_900);
    expect(result.value.vehiclePrice).toBeNull();
    expect(result.value.monthlyTotal).toBeNull();
    expect(result.value.monthlyOperatingCost).toBe(385);
  });

  it('measures this car against the comfortable price in both modes', () => {
    const result = calculateCarAffordability(baseInput);
    expect(result.value.comfortablePrice).toBe(18_900);
    expect(result.value.priceGap).toBe(11_100);
  });

  it('makes good on the claim that the price gap equals the extra down payment', () => {
    const gap = calculateCarAffordability(baseInput).value.priceGap;
    expect(gap).toBe(11_100);
    const cutPrice = calculateCarAffordability(withInput({ vehiclePrice: 30_000 - (gap ?? 0) }));
    const extraDown = calculateCarAffordability(withInput({ downPayment: 6_000 + (gap ?? 0) }));
    expect(cutPrice.value.verdict).toBe('comfortable');
    expect(extraDown.value.verdict).toBe('comfortable');
    expect(extraDown.value.monthlyLoanPayment).toBe(cutPrice.value.monthlyLoanPayment);
    expect(extraDown.value.monthlyTotal).toBe(cutPrice.value.monthlyTotal);
  });

  it('handles a cash purchase without forcing a loan', () => {
    const result = calculateCarAffordability(withInput({
      vehiclePrice: 12_000,
      downPayment: 12_000,
      termMonths: 0,
      annualRatePercent: 0,
    }));
    expect(result.value.monthlyLoanPayment).toBe(0);
    expect(result.value.amountFinanced).toBe(0);
    expect(result.value.upfrontCash).toBe(12_000);
    expect(result.value.monthlyTotal).toBe(385);
    expect(result.value.verdict).toBe('comfortable');
    expect(result.breakdown[0].detail).toContain('Cash purchase');
  });

  it('explains where taxes, fees, and a trade-in actually land', () => {
    const financed = calculateCarAffordability(withInput({ salesTaxAndFees: 2_000, tradeInValue: 3_000 }));
    const cashLine = financed.breakdown[financed.breakdown.length - 1];
    expect(cashLine.label).toBe('Cash at signing');
    expect(cashLine.value).toBe('$6,000.00');
    expect(cashLine.detail).toContain('$3,000 trade-in is credited on top of it');
    expect(cashLine.detail).toContain('$2,000 in taxes and fees is part of the amount financed');
    expect(financed.value.amountFinanced).toBe(23_000);

    const plain = calculateCarAffordability(baseInput);
    expect(plain.breakdown[plain.breakdown.length - 1].detail).toBe('Down payment.');
  });

  it('prices an EV with the same ownership model', () => {
    const result = calculateCarAffordability(withInput({
      driving: { powertrain: 'ev', annualMiles: 12_000, kwhPer100Miles: 30, electricityCentsPerKwh: 15, chargingLossPercent: 10 },
    }));
    expect(result.value.powertrain).toBe('ev');
    expect(result.value.monthlyEnergyCost).toBe(50);
    expect(result.value.monthlyTotal).toBe(695);
    expect(result.breakdown[1].label).toBe('Charging each month');
  });

  it('rejects materially invalid money, terms, and income', () => {
    expect(() => calculateCarAffordability(withInput({ vehiclePrice: -1 }))).toThrow(/Vehicle price/);
    expect(() => calculateCarAffordability(withInput({ vehiclePrice: 0 }))).toThrow(/Vehicle price/);
    expect(() => calculateCarAffordability(withInput({ vehiclePrice: Number.NaN }))).toThrow(/Vehicle price/);
    expect(() => calculateCarAffordability(withInput({ downPayment: Number.POSITIVE_INFINITY }))).toThrow(/Down payment/);
    expect(() => calculateCarAffordability(withInput({ monthlyInsurance: -25 }))).toThrow(/Insurance/);
    expect(() => calculateCarAffordability(withInput({ monthlyMaintenance: -1 }))).toThrow(/Maintenance/);
    expect(() => calculateCarAffordability(withInput({ termMonths: 60.5 }))).toThrow(/whole number of months/);
    expect(() => calculateCarAffordability(withInput({ termMonths: 0 }))).toThrow(/at least one payment/);
    expect(() => calculateCarAffordability(withInput({ downPayment: 40_000 }))).toThrow(/cannot be more than the price/);
    expect(() => calculateCarAffordability(withInput({ driving: { powertrain: 'gas', annualMiles: 12_000, mpg: 0, dollarsPerGallon: 3.5 } })))
      .toThrow(/Miles per gallon/);
    expect(() => calculateCarAffordability(withInput({ income: { incomeMode: 'take-home', monthlyTakeHome: 0 } })))
      .toThrow(/take-home pay must be greater than zero/i);
    expect(() => calculateCarAffordability(withInput({ state: 'ZZ' }))).toThrow(/U.S. state/);
  });
});

describe('car affordability data provenance', () => {
  const gasolineSnapshotId = gasolineSnapshot.snapshotId;
  const taxSnapshotId = getTaxYearSnapshot(2026).snapshotId;

  it('claims the EIA gasoline snapshot only when the published price is used', () => {
    const texasPrice = getGasolinePriceForState('TX').dollarsPerGallon;
    const official = calculateCarAffordability(
      withInput({ driving: { powertrain: 'gas', annualMiles: 12_000, mpg: 25, dollarsPerGallon: texasPrice } }),
      { energyRateSource: 'official', energySnapshotId: gasolineSnapshotId },
    );
    expect(official.datasetSnapshotIds).toEqual([gasolineSnapshotId]);
    expect(official.value.energyRateSource).toBe('official');
    expect(official.assumptions.join(' ')).toContain('published EIA regular-gasoline average');

    const manual = calculateCarAffordability(withInput({}), { energyRateSource: 'manual' });
    expect(manual.datasetSnapshotIds).toEqual([]);
    expect(manual.assumptions.join(' ')).toContain('pump price you typed');
  });

  it('claims the EIA electricity snapshot for an EV charging at a state average', () => {
    const rate = getElectricityRate('TX').priceCentsPerKwh;
    const result = calculateCarAffordability(
      withInput({ driving: { powertrain: 'ev', annualMiles: 12_000, kwhPer100Miles: 30, electricityCentsPerKwh: rate, chargingLossPercent: 10 } }),
      { energyRateSource: 'official', energySnapshotId: electricitySnapshot.snapshotId },
    );
    expect(result.datasetSnapshotIds).toEqual([electricitySnapshot.snapshotId]);
    expect(result.assumptions.join(' ')).toContain('published EIA residential electricity average');
  });

  it('adds the tax snapshot only when take-home pay is estimated from a salary', () => {
    const manualIncome = calculateCarAffordability(baseInput);
    expect(manualIncome.datasetSnapshotIds).toEqual([]);
    expect(manualIncome.value.stateTaxStatus).toBeNull();

    const fromSalary = calculateCarAffordability(withInput({
      income: { incomeMode: 'gross-salary', annualGrossSalary: 100_000, filingStatus: 'single', taxYear: 2026 },
    }));
    expect(fromSalary.datasetSnapshotIds).toEqual([taxSnapshotId]);
    expect(fromSalary.value.incomeMode).toBe('gross-salary');
    expect(fromSalary.value.stateTaxStatus).toBe('supported');
    expect(fromSalary.value.monthlyTakeHome).toBeGreaterThan(0);
  });

  it('mixes an official fuel price and an official tax snapshot without losing either', () => {
    const result = calculateCarAffordability(
      withInput({ income: { incomeMode: 'gross-salary', annualGrossSalary: 100_000, filingStatus: 'single', taxYear: 2026 } }),
      { energyRateSource: 'official', energySnapshotId: gasolineSnapshotId },
    );
    expect(result.datasetSnapshotIds).toEqual([gasolineSnapshotId, taxSnapshotId]);
  });

  it('says plainly that an unsupported state overstates take-home pay', () => {
    const result = calculateCarAffordability(withInput({
      state: 'NY',
      income: { incomeMode: 'gross-salary', annualGrossSalary: 100_000, filingStatus: 'single', taxYear: 2026 },
    }));
    expect(result.value.stateTaxStatus).toBe('unsupported');
    expect(result.assumptions.join(' ')).toContain('New York wage income tax is omitted');
    expect(result.assumptions.join(' ')).toContain('overstated');
  });

  it('leads the explanation with the numbers and labels the bands as ours', () => {
    const result = calculateCarAffordability(baseInput);
    const totalStep = result.breakdown.find((step) => step.label === 'Total monthly vehicle cost');
    const shareStep = result.breakdown.find((step) => step.label === 'Share of take-home pay');
    expect(totalStep?.value).toBe('$785.00');
    expect(shareStep?.value).toBe('19.6%');
    expect(shareStep?.detail).toContain('loan payment alone is 10%');

    const text = result.assumptions.join(' ');
    expect(text).toContain('are our own labels for bands on take-home pay');
    expect(text).toContain('not a lender decision and not a rule that fits every household');
    expect(text).toContain('not a lender approval, a quote, or advice to buy a particular car');
    for (const overclaim of ['cannot afford', 'unsafe', 'should not buy', 'universal rule', 'the screen calls it']) {
      expect(text.toLowerCase()).not.toContain(overclaim.toLowerCase());
    }
  });

  it('names the reverse-mode prices after our own ranges', () => {
    const result = calculateCarAffordability(withInput({ mode: 'how-much-car', vehiclePrice: undefined }));
    expect(result.breakdown.map((step) => step.label)).toEqual([
      'Comfortable-range price',
      'Stretch-range price',
      'Top-of-range price',
      'Running cost before any payment',
    ]);
    expect(result.breakdown[0].value).toBe('$18,900');
    expect(result.breakdown[0].detail).toContain('Our guideline');
    expect(result.breakdown[2].detail).toContain('top of our guideline range');
  });

  it('never presents the vehicle price or insurance as looked-up data', () => {
    const result = calculateCarAffordability(baseInput);
    const text = result.assumptions.join(' ');
    expect(text).toContain('no dealer, book-value, or market-price feed');
    expect(text).toContain('Depreciation and resale value are not included');
    expect(text).toContain('placeholders, not quotes');
  });
});

describe('existing calculator regressions after the vehicle layer', () => {
  it('keeps the Loan calculator payment and interest', () => {
    const result = calculateLoan({
      loanAmount: 24_000,
      annualRatePercent: 0,
      termLength: 60,
      termUnit: 'months',
      extraMonthlyPayment: 0,
    });
    expect(result.value.monthlyPayment).toBe(400);
    expect(result.value.totalInterest).toBe(0);
    expect(result.calculationVersion).toBe('loan-v1.0.0');
  });

  it('keeps EV vs Gas wall energy and yearly costs', () => {
    const result = calculateEvVsGas({
      annualMiles: 12_000,
      gasMpg: 30,
      gasPricePerGallon: 3.5,
      evKwhPer100Miles: 30,
      electricityCentsPerKwh: 15,
      chargingLossPercent: 10,
    });
    expect(result.value.gasAnnualCost).toBe(1_400);
    expect(result.value.evAnnualCost).toBe(600);
    expect(result.value.wallKwh).toBe(4_000);
    expect(result.calculationVersion).toBe('vehicle-energy-v1.1.0');
  });

  it('keeps Road Trip Fuel gallons and trip cost', () => {
    const result = calculateRoadTripFuel({ miles: 300, mpg: 25, dollarsPerGallon: 3.5 }, 'fixture');
    expect(result.value.gallons).toBe(12);
    expect(result.value.tripCost).toBe(42);
    expect(result.calculationVersion).toBe('road-trip-fuel-v1.0.0');
  });
});
