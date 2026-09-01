import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';

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
  const monthlyEnergyCost = input.monthlyKwh * (input.rateCentsPerKwh / 100);

  return {
    value: {
      monthlyEnergyCost: round(monthlyEnergyCost),
      annualEnergyCost: round(monthlyEnergyCost * 12),
      dailyEnergyCost: round((monthlyEnergyCost * 12) / 365),
    },
    calculationVersion: 'energy-cost-v1.0.0',
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
        label: 'Estimated energy charge',
        value: formatMoney(monthlyEnergyCost),
        detail: 'kWh × cents per kWh ÷ 100',
      },
    ],
    assumptions: [
      'This multiplies usage by an average energy price; it is not a utility bill quote.',
      'Fixed customer charges, demand charges, tiered rates, taxes, credits and time-of-use pricing are not modeled.',
      'A state average may differ materially from your utility tariff. Enter your bill rate for a personal estimate.',
    ],
  };
}

