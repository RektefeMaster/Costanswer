import { describe, expect, it } from 'vitest';
import { calculateApplianceElectricity } from '@/lib/calculations/appliance-electricity';
import { calculateElectricityCost } from '@/lib/calculations/electricity-cost';
import { calculateEvVsGas } from '@/lib/calculations/ev-vs-gas';
import { calculateRoadTripFuel } from '@/lib/calculations/road-trip-fuel';
import { compareWhereCheaper } from '@/lib/calculations/where-cheaper';
import {
  APPLIANCE_ENERGY_ENGINE_ID,
  applianceEnergyFromWeeklyPattern,
  batteryKwhFromMiles,
  chargingEfficiencyFromLossPercent,
  energyCostFromKwh,
  energyUseFromKw,
  energyUseFromPower,
  fuelCost,
  fuelGallons,
  periodQuantitiesFromWeekly,
  wallKwhFromBattery,
} from '@/lib/calculations/energy';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { gasolineSnapshot } from '@/lib/data/gasoline-snapshot';
import { grocerySnapshot } from '@/lib/data/grocery-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { round } from '@/lib/calculations/contracts';

describe('electricity primitives', () => {
  it('converts 1000 W × 1 hour into 1 kWh and a known cents/kWh cost', () => {
    expect(energyUseFromPower({ watts: 1000, hours: 1 }).kwh).toBe(1);
    expect(energyCostFromKwh({ kwh: 1, centsPerKwh: 15 }).cost).toBe(0.15);
  });

  it('converts 1500 W × 2 hours into 3 kWh', () => {
    expect(energyUseFromPower({ watts: 1500, hours: 2 }).kwh).toBe(3);
    expect(energyUseFromKw({ kw: 1.5, hours: 2 }).kwh).toBe(3);
  });

  it('keeps zero watts and zero hours at zero energy', () => {
    expect(energyUseFromPower({ watts: 0, hours: 8 }).kwh).toBe(0);
    expect(energyUseFromPower({ watts: 1500, hours: 0 }).kwh).toBe(0);
    expect(energyCostFromKwh({ kwh: 0, centsPerKwh: 15.94 }).cost).toBe(0);
  });

  it('rejects non-finite energy inputs and out-of-range daily usage', () => {
    expect(() => energyUseFromPower({ watts: Number.NaN, hours: 1 })).toThrow(/finite/);
    expect(() => energyCostFromKwh({ kwh: Number.POSITIVE_INFINITY, centsPerKwh: 10 })).toThrow(/finite/);
    expect(() => applianceEnergyFromWeeklyPattern({ watts: 100, hoursPerDay: 25, daysPerWeek: 1 })).toThrow(/Hours per day/);
    expect(() => applianceEnergyFromWeeklyPattern({ watts: 100, hoursPerDay: 1, daysPerWeek: 8 })).toThrow(/Days per week/);
  });

  it('does not round 1234 W × 3.7 hours before the cost step', () => {
    const energy = energyUseFromPower({ watts: 1234, hours: 3.7 });
    expect(energy.kwh).toBeCloseTo(4.5658, 10);
    expect(energyCostFromKwh({ kwh: energy.kwh, centsPerKwh: 12.3 }).cost).toBeCloseTo(0.5615934, 10);
  });
});

describe('period normalization', () => {
  it('annualizes a weekly usage pattern as 52 weeks, monthly = annual / 12, daily = annual / 365', () => {
    const weekly = 84;
    const periods = periodQuantitiesFromWeekly(weekly);
    expect(periods.weekly).toBe(84);
    expect(periods.annual).toBe(84 * 52);
    expect(periods.monthly).toBe((84 * 52) / 12);
    expect(periods.daily).toBe((84 * 52) / 365);
  });

  it('turns hours/day and days/week into that same weekly energy', () => {
    const energy = applianceEnergyFromWeeklyPattern({ watts: 1500, hoursPerDay: 8, daysPerWeek: 7 });
    expect(energy.kwhPerUsageDay).toBe(12);
    expect(energy.kwhPerWeek).toBe(84);
    expect(energy.quantities.annual).toBe(4368);
    expect(energy.quantities.monthly).toBe(364);
  });
});

describe('EV charging primitives', () => {
  it('treats zero charging loss as wall energy equal to battery energy', () => {
    const battery = batteryKwhFromMiles({ miles: 12_000, kwhPer100Miles: 30 });
    const charging = wallKwhFromBattery({ batteryKwh: battery.batteryKwh, chargingLossPercent: 0 });
    expect(battery.batteryKwh).toBe(3600);
    expect(charging.chargingEfficiency).toBe(1);
    expect(charging.wallKwh).toBe(3600);
  });

  it('divides battery kWh by charging efficiency when there is loss', () => {
    expect(chargingEfficiencyFromLossPercent(10)).toBe(0.9);
    expect(wallKwhFromBattery({ batteryKwh: 3600, chargingLossPercent: 10 }).wallKwh).toBe(4000);
  });

  it('allows zero miles and rejects a 100% charging loss', () => {
    expect(batteryKwhFromMiles({ miles: 0, kwhPer100Miles: 28 }).batteryKwh).toBe(0);
    expect(() => wallKwhFromBattery({ batteryKwh: 10, chargingLossPercent: 100 })).toThrow(/less than 100/);
    expect(() => chargingEfficiencyFromLossPercent(100)).toThrow(/less than 100/);
  });
});

describe('fuel primitives', () => {
  it('divides miles by MPG and multiplies by price', () => {
    expect(fuelGallons({ miles: 300, mpg: 25 }).gallons).toBe(12);
    expect(fuelCost({ miles: 300, mpg: 25, dollarsPerGallon: 3.5 }).cost).toBe(42);
  });

  it('allows zero miles and rejects zero MPG', () => {
    expect(fuelCost({ miles: 0, mpg: 30, dollarsPerGallon: 3.5 })).toEqual({
      miles: 0,
      mpg: 30,
      gallons: 0,
      dollarsPerGallon: 3.5,
      cost: 0,
    });
    expect(() => fuelGallons({ miles: 100, mpg: 0 })).toThrow(/greater than zero/);
  });
});

describe('appliance electricity calculator', () => {
  const texas = electricitySnapshot.states.find((row) => row.stateCode === 'TX');

  it('uses the EIA Texas rate on the canonical 1,500 W example', () => {
    expect(texas?.priceCentsPerKwh).toBe(15.94);
    const result = calculateApplianceElectricity({
      watts: 1500,
      hoursPerDay: 8,
      daysPerWeek: 7,
      rateCentsPerKwh: texas?.priceCentsPerKwh,
    }, { rateSource: 'eia', datasetSnapshotId: electricitySnapshot.snapshotId });
    expect(result.calculationVersion).toBe(APPLIANCE_ENERGY_ENGINE_ID);
    expect(result.value.kwhPerYear).toBe(4368);
    expect(result.value.kwhPerMonth).toBe(364);
    expect(result.value.annualCost).toBe(round(4368 * 0.1594));
    expect(result.value.monthlyCost).toBe(round((4368 * 0.1594) / 12));
    expect(result.value.rateSource).toBe('eia');
    expect(result.datasetSnapshotIds).toEqual([electricitySnapshot.snapshotId]);
    expect(result.breakdown.find((step) => step.label === 'Electricity rate')?.detail).toBe('Published state residential average');
  });

  it('labels a custom rate as manual and does not claim the EIA snapshot', () => {
    const result = calculateApplianceElectricity({
      watts: 1500,
      hoursPerDay: 8,
      daysPerWeek: 7,
      rateCentsPerKwh: 10,
    }, { rateSource: 'manual', datasetSnapshotId: electricitySnapshot.snapshotId });
    expect(result.value.rateSource).toBe('manual');
    expect(result.datasetSnapshotIds).toEqual([]);
    expect(result.value.monthlyCost).toBe(36.4);
    expect(result.breakdown.find((step) => step.label === 'Electricity rate')?.detail).toBe('Manual electricity rate');
  });

  it('counts only the hours a cycling appliance actually draws power', () => {
    // A fridge is plugged in 24 hours a day but its compressor is not. Counting
    // nameplate watts for every clock hour put a 150 W fridge at about
    // 1,300 kWh a year, roughly three times a real one.
    const continuous = calculateApplianceElectricity({
      watts: 150, hoursPerDay: 24, daysPerWeek: 7, rateCentsPerKwh: 15,
    });
    const cycling = calculateApplianceElectricity({
      watts: 150, hoursPerDay: 24, daysPerWeek: 7, dutyCyclePercent: 35, rateCentsPerKwh: 15,
    });
    expect(continuous.value.dutyCyclePercent).toBe(100);
    expect(cycling.value.dutyCyclePercent).toBe(35);
    expect(cycling.value.kwhPerYear).toBeCloseTo(continuous.value.kwhPerYear * 0.35, 5);
    expect(cycling.value.kwhPerYear).toBeGreaterThan(300);
    expect(cycling.value.kwhPerYear).toBeLessThan(600);
    expect(cycling.assumptions.join(' ')).toMatch(/cycle rather than running continuously/);
  });

  it('still computes when the official electricity snapshot has fallen behind', () => {
    const source = datasetSourceDisplay({
      datasetId: 'eia-electricity',
      observationPeriod: electricitySnapshot.observationPeriod,
      sourceStatus: electricitySnapshot.sourceStatus,
      asOf: '2026-11-15',
    });
    expect(source.freshness).toBe('stale');
    expect(source.freshnessLabel).toBe('Older than the expected update window');
    expect(source.sourceStatus).toBe('preliminary');
    const result = calculateApplianceElectricity({
      watts: 1000,
      hoursPerDay: 1,
      daysPerWeek: 7,
      rateCentsPerKwh: texas?.priceCentsPerKwh,
    }, { rateSource: 'eia', datasetSnapshotId: electricitySnapshot.snapshotId });
    expect(result.datasetSnapshotIds).toEqual([electricitySnapshot.snapshotId]);
    expect(result.value.kwhPerYear).toBe(364);
  });
});

describe('existing energy calculator regressions', () => {
  const datasets = {
    electricity: electricitySnapshot.states,
    electricitySnapshotId: electricitySnapshot.snapshotId,
    gasoline: gasolineSnapshot,
    grocery: grocerySnapshot,
  };

  it('keeps Electricity Cost cents-per-kWh conversion', () => {
    const result = calculateElectricityCost({ monthlyKwh: 900, rateCentsPerKwh: 15.1 }, 'fixture');
    expect(result.value.monthlyEnergyCost).toBe(135.9);
    expect(result.value.annualEnergyCost).toBe(1_630.8);
    expect(result.calculationVersion).toBe('energy-cost-v1.1.0');
  });

  it('keeps EV vs Gas wall energy and gasoline on the same mileage', () => {
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
    expect(result.calculationVersion).toBe('vehicle-energy-v1.1.0');
  });

  it('keeps Where Cheaper Texas-vs-California electricity ranking', () => {
    const result = compareWhereCheaper({
      kind: 'electricity', homeState: 'TX', compareState: 'CA', monthlyKwh: 900, monthlyGallons: 40,
    }, datasets);
    expect(result.value.cheaperPlace).toBe('home');
    expect(result.calculationVersion).toBe('where-cheaper-v1.0.0');
  });

  it('keeps Road Trip Fuel gallons and trip cost', () => {
    const result = calculateRoadTripFuel({ miles: 300, mpg: 25, dollarsPerGallon: 3.5 }, 'fixture');
    expect(result.value.gallons).toBe(12);
    expect(result.value.tripCost).toBe(42);
    expect(result.calculationVersion).toBe('road-trip-fuel-v1.0.0');
  });
});
