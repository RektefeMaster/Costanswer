import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';
import { batteryKwhFromMiles, energyCostFromKwh, fuelCost, wallKwhFromBattery } from './energy';

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
  datasetSnapshotIds: string[] = [],
): CalculationResult<EvVsGasValue> {
  const input = evVsGasInputSchema.parse(rawInput);
  const gas = fuelCost({
    miles: input.annualMiles,
    mpg: input.gasMpg,
    dollarsPerGallon: input.gasPricePerGallon,
  });
  const battery = batteryKwhFromMiles({
    miles: input.annualMiles,
    kwhPer100Miles: input.evKwhPer100Miles,
  });
  const charging = wallKwhFromBattery({
    batteryKwh: battery.batteryKwh,
    chargingLossPercent: input.chargingLossPercent,
  });
  const ev = energyCostFromKwh({
    kwh: charging.wallKwh,
    centsPerKwh: input.electricityCentsPerKwh,
  });
  const annualDifference = gas.cost - ev.cost;

  return {
    value: {
      gasAnnualCost: round(gas.cost),
      evAnnualCost: round(ev.cost),
      annualDifference: round(annualDifference),
      monthlyDifference: round(annualDifference / 12),
      gasGallons: round(gas.gallons, 1),
      wallKwh: round(charging.wallKwh),
      gasCostPerMile: input.annualMiles === 0 ? 0 : round(gas.cost / input.annualMiles, 3),
      evCostPerMile: input.annualMiles === 0 ? 0 : round(ev.cost / input.annualMiles, 3),
      breakEvenGasPrice: gas.gallons === 0 ? 0 : round(ev.cost / gas.gallons, 2),
    },
    calculationVersion: 'vehicle-energy-v1.1.0',
    datasetSnapshotIds,
    breakdown: [
      {
        label: 'Gas vehicle energy',
        value: formatMoney(gas.cost, 0),
        detail: `${round(gas.gallons, 1)} gal × ${formatMoney(input.gasPricePerGallon)}`,
      },
      {
        label: 'EV wall energy',
        value: formatMoney(ev.cost, 0),
        detail: `${round(charging.wallKwh)} kWh × ${input.electricityCentsPerKwh.toFixed(2)}¢`,
      },
      {
        label: annualDifference >= 0 ? 'Estimated EV energy savings' : 'Additional EV energy cost',
        value: formatMoney(Math.abs(annualDifference), 0),
        detail: 'Yearly driving energy only',
      },
    ],
    assumptions: [
      'This compares driving energy only. Not the car price, insurance, upkeep, depreciation, taxes, or extra public charging fees.',
      'EV efficiency is battery energy. Charging loss is added to estimate what you pull from the wall.',
      'A state residential average is not your utility rate. Type your own if you have it.',
    ],
  };
}
