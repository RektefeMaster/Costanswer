import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';

export const evVsGasInputSchema = z.object({
  annualMiles: finiteNumber('Annual miles', 0, 250_000),
  gasMpg: finiteNumber('Gas vehicle MPG', 1, 200),
  gasPricePerGallon: finiteNumber('Gas price', 0, 20),
  evKwhPer100Miles: finiteNumber('EV efficiency', 5, 100),
  electricityCentsPerKwh: finiteNumber('Electricity price', 0, 200),
  chargingLossPercent: finiteNumber('Charging loss', 0, 30),
});

export type EvVsGasInput = z.infer<typeof evVsGasInputSchema>;

export type EvVsGasValue = {
  gasAnnualCost: number;
  evAnnualCost: number;
  annualDifference: number;
  monthlyDifference: number;
  gasGallons: number;
  wallKwh: number;
  gasCostPerMile: number;
  evCostPerMile: number;
  breakEvenGasPrice: number;
};

export function calculateEvVsGas(
  rawInput: unknown,
  datasetSnapshotId?: string,
): CalculationResult<EvVsGasValue> {
  const input = evVsGasInputSchema.parse(rawInput);
  const gasGallons = input.annualMiles / input.gasMpg;
  const gasAnnualCost = gasGallons * input.gasPricePerGallon;
  const storedKwh = input.annualMiles * input.evKwhPer100Miles / 100;
  const wallKwh = storedKwh / (1 - input.chargingLossPercent / 100);
  const evAnnualCost = wallKwh * input.electricityCentsPerKwh / 100;
  const annualDifference = gasAnnualCost - evAnnualCost;

  return {
    value: {
      gasAnnualCost: round(gasAnnualCost),
      evAnnualCost: round(evAnnualCost),
      annualDifference: round(annualDifference),
      monthlyDifference: round(annualDifference / 12),
      gasGallons: round(gasGallons, 1),
      wallKwh: round(wallKwh),
      gasCostPerMile: input.annualMiles === 0 ? 0 : round(gasAnnualCost / input.annualMiles, 3),
      evCostPerMile: input.annualMiles === 0 ? 0 : round(evAnnualCost / input.annualMiles, 3),
      breakEvenGasPrice: gasGallons === 0 ? 0 : round(evAnnualCost / gasGallons, 2),
    },
    calculationVersion: 'vehicle-energy-v1.0.0',
    datasetSnapshotIds: datasetSnapshotId ? [datasetSnapshotId] : [],
    breakdown: [
      {
        label: 'Gas vehicle energy',
        value: formatMoney(gasAnnualCost, 0),
        detail: `${round(gasGallons, 1)} gal × ${formatMoney(input.gasPricePerGallon)}`,
      },
      {
        label: 'EV wall energy',
        value: formatMoney(evAnnualCost, 0),
        detail: `${round(wallKwh)} kWh × ${input.electricityCentsPerKwh.toFixed(2)}¢`,
      },
      {
        label: annualDifference >= 0 ? 'Estimated EV energy savings' : 'Additional EV energy cost',
        value: formatMoney(Math.abs(annualDifference), 0),
        detail: 'Annual driving-energy difference only',
      },
    ],
    assumptions: [
      'This compares driving energy only—not purchase price, insurance, maintenance, depreciation, taxes or public-charging premiums.',
      'EV efficiency is treated as battery energy; charging loss is added to estimate wall energy.',
      'A state residential average is not a utility tariff. Override it with your own rate for a personal estimate.',
    ],
  };
}

