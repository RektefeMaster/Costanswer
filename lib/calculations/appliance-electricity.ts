import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import {
  APPLIANCE_ENERGY_ENGINE_ID,
  applianceEnergyFromWeeklyPattern,
  energyCostFromKwh,
} from './energy';

export const applianceElectricityInputSchema = z.object({
  watts: finiteNumber('Wattage', 0, 100_000),
  hoursPerDay: finiteNumber('Hours per day', 0, 24),
  daysPerWeek: finiteNumber('Days per week', 0, 7),
  rateCentsPerKwh: finiteNumber('Electricity price', 0, 200),
  dutyCyclePercent: finiteNumber('Duty cycle', 1, 100).optional(),
});

export type ApplianceElectricityInput = z.infer<typeof applianceElectricityInputSchema>;
export type ApplianceRateSource = 'eia' | 'manual';

export type ApplianceElectricityValue = {
  watts: number;
  hoursPerDay: number;
  daysPerWeek: number;
  dutyCyclePercent: number;
  rateCentsPerKwh: number;
  rateSource: ApplianceRateSource;
  kwhPerUsageDay: number;
  kwhPerDay: number;
  kwhPerWeek: number;
  kwhPerMonth: number;
  kwhPerYear: number;
  dailyCost: number;
  monthlyCost: number;
  annualCost: number;
};

export function calculateApplianceElectricity(
  rawInput: unknown,
  options: { datasetSnapshotId?: string; rateSource: ApplianceRateSource } = { rateSource: 'manual' },
): CalculationResult<ApplianceElectricityValue> {
  const input = applianceElectricityInputSchema.parse(rawInput);
  const energy = applianceEnergyFromWeeklyPattern({
    watts: input.watts,
    hoursPerDay: input.hoursPerDay,
    daysPerWeek: input.daysPerWeek,
    dutyCyclePercent: input.dutyCyclePercent,
  });
  const annual = energyCostFromKwh({
    kwh: energy.quantities.annual,
    centsPerKwh: input.rateCentsPerKwh,
  });
  const monthly = energyCostFromKwh({
    kwh: energy.quantities.monthly,
    centsPerKwh: input.rateCentsPerKwh,
  });
  const daily = energyCostFromKwh({
    kwh: energy.quantities.daily,
    centsPerKwh: input.rateCentsPerKwh,
  });
  const usingOfficialRate = options.rateSource === 'eia' && Boolean(options.datasetSnapshotId);

  return {
    value: {
      watts: input.watts,
      hoursPerDay: input.hoursPerDay,
      daysPerWeek: input.daysPerWeek,
      dutyCyclePercent: energy.dutyCyclePercent,
      rateCentsPerKwh: input.rateCentsPerKwh,
      rateSource: usingOfficialRate ? 'eia' : 'manual',
      kwhPerUsageDay: round(energy.kwhPerUsageDay, 3),
      kwhPerDay: round(energy.quantities.daily, 3),
      kwhPerWeek: round(energy.kwhPerWeek, 3),
      kwhPerMonth: round(energy.quantities.monthly, 3),
      kwhPerYear: round(energy.quantities.annual, 3),
      dailyCost: round(daily.cost),
      monthlyCost: round(monthly.cost),
      annualCost: round(annual.cost),
    },
    calculationVersion: APPLIANCE_ENERGY_ENGINE_ID,
    datasetSnapshotIds: usingOfficialRate && options.datasetSnapshotId ? [options.datasetSnapshotId] : [],
    breakdown: [
      {
        label: 'Power',
        value: `${formatNumber(input.watts)} W`,
        detail: 'Nameplate or example wattage you entered',
      },
      {
        label: 'Usage',
        value: `${formatNumber(input.hoursPerDay)} h/day · ${formatNumber(input.daysPerWeek)} days/week`,
        detail: 'A year is 52 weeks of this pattern',
      },
      {
        label: 'Energy consumed',
        value: `${formatNumber(energy.quantities.annual, { maximumFractionDigits: 3 })} kWh/year`,
        detail: `${formatNumber(energy.kwhPerUsageDay, { maximumFractionDigits: 3 })} kWh on a day you run it · ${formatNumber(energy.quantities.monthly, { maximumFractionDigits: 3 })} kWh/month`,
      },
      {
        label: 'Electricity rate',
        value: `${input.rateCentsPerKwh.toFixed(2)}¢ per kWh`,
        detail: usingOfficialRate ? 'Published state residential average' : 'Manual electricity rate',
      },
      {
        label: 'Monthly cost',
        value: formatMoney(monthly.cost),
        detail: 'Annual energy cost ÷ 12',
      },
      {
        label: 'Annual cost',
        value: formatMoney(annual.cost),
        detail: 'kWh × cents per kWh ÷ 100',
      },
    ],
    assumptions: [
      `At this usage level, this device accounts for approximately ${formatNumber(energy.quantities.annual, { maximumFractionDigits: 0 })} kWh/year.`,
      'A year is 52 weeks of this usage pattern. Monthly figures are that annual total divided by 12. Daily figures are the annual total divided by 365.',
      'Wattage is the number you entered or an example starting point, not a measured lab rating for a specific model.',
      energy.dutyCyclePercent >= 100
        ? 'The appliance is assumed to draw its full wattage for every hour it is on.'
        : `Only ${formatNumber(energy.dutyCyclePercent, { maximumFractionDigits: 0 })}% of those hours are counted as drawing power, because thermostat-controlled appliances cycle rather than running continuously. Change it if you know your own duty cycle.`,
      'This multiplies energy by a price. It is not a copy of your utility bill.',
      'Fixed charges, demand charges, tiers, taxes, credits, and time of use rates are left out.',
    ],
  };
}
