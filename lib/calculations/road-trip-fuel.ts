import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';
import { fuelCost } from './energy';

export const roadTripFuelInputSchema = z.object({
  miles: finiteNumber('Trip miles', 0.1, 50_000),
  mpg: finiteNumber('Miles per gallon', 1, 200),
  dollarsPerGallon: finiteNumber('Gas price', 0.01, 20),
});

export type RoadTripFuelInput = z.infer<typeof roadTripFuelInputSchema>;

export type RoadTripFuelValue = {
  gallons: number;
  tripCost: number;
  costPerMile: number;
};

export function calculateRoadTripFuel(
  rawInput: unknown,
  datasetSnapshotId?: string,
): CalculationResult<RoadTripFuelValue> {
  const input = roadTripFuelInputSchema.parse(rawInput);
  const fuel = fuelCost({
    miles: input.miles,
    mpg: input.mpg,
    dollarsPerGallon: input.dollarsPerGallon,
  });

  return {
    value: {
      gallons: round(fuel.gallons, 2),
      tripCost: round(fuel.cost),
      costPerMile: round(fuel.cost / input.miles, 3),
    },
    calculationVersion: 'road-trip-fuel-v1.0.0',
    datasetSnapshotIds: datasetSnapshotId ? [datasetSnapshotId] : [],
    breakdown: [
      {
        label: 'Gallons needed',
        value: `${round(fuel.gallons, 2).toLocaleString('en-US')} gal`,
        detail: `${input.miles.toLocaleString('en-US')} miles ÷ ${input.mpg} MPG`,
      },
      {
        label: 'Fuel cost',
        value: formatMoney(fuel.cost),
        detail: `${round(fuel.gallons, 2)} gal × ${formatMoney(input.dollarsPerGallon, 3)}`,
      },
    ],
    assumptions: [
      'This is highway fuel only. Tolls, food, lodging, and extra city driving are left out.',
      'An EIA weekly average is not the price at a specific station. Type a pump price if you have one.',
      'Real MPG changes with speed, weather, hills, and the vehicle load.',
    ],
  };
}
