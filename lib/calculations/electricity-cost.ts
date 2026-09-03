import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';
import { energyCostFromKwh, periodQuantitiesFromMonthly } from './energy';

export const electricityCostInputSchema = z.object({
  monthlyKwh: finiteNumber('Monthly electricity use', 0, 100_000),
  rateCentsPerKwh: finiteNumber('Electricity price', 0, 200),
});

export type ElectricityCostInput = z.infer<typeof electricityCostInputSchema>;

export type ElectricityCostValue = {
  monthlyEnergyCost: number;
  annualEnergyCost: number;
  dailyEnergyCost: number;
};

export function calculateElectricityCost(
  rawInput: unknown,
  datasetSnapshotId?: string,
): CalculationResult<ElectricityCostValue> {
  const input = electricityCostInputSchema.parse(rawInput);
  const monthly = energyCostFromKwh({ kwh: input.monthlyKwh, centsPerKwh: input.rateCentsPerKwh });
  const periods = periodQuantitiesFromMonthly(monthly.cost);

  return {
    value: {
      monthlyEnergyCost: round(periods.monthly),
      annualEnergyCost: round(periods.annual),
      dailyEnergyCost: round(periods.daily),
    },
    calculationVersion: 'energy-cost-v1.1.0',
    datasetSnapshotIds: datasetSnapshotId ? [datasetSnapshotId] : [],
    breakdown: [
      {
        label: 'Electricity used',
        value: `${input.monthlyKwh.toLocaleString('en-US')} kWh`,
        detail: 'Your entered monthly usage',
      },
      {
        label: 'Price applied',
        value: `${input.rateCentsPerKwh.toFixed(2)}¢ per kWh`,
        detail: datasetSnapshotId ? 'Published state residential average or your override' : 'Your entered rate',
      },
      {
        label: 'Estimated electric bill',
        value: formatMoney(monthly.cost),
        detail: 'kWh × cents per kWh ÷ 100',
      },
    ],
    assumptions: [
      'This multiplies your kWh by a price. It is not a copy of your utility bill.',
      'Fixed charges, demand charges, tiers, taxes, credits, and time of use rates are left out.',
      'A state average can differ a lot from your rate. Type the number from your bill if you have it.',
    ],
  };
}
