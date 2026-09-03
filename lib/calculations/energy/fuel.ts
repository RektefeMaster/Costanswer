import { assertFiniteNonNegative, assertPositive } from './finite';

export type FuelUse = {
  miles: number;
  mpg: number;
  gallons: number;
};

export type FuelCost = FuelUse & {
  dollarsPerGallon: number;
  cost: number;
};

export function fuelGallons(input: { miles: number; mpg: number }): FuelUse {
  assertFiniteNonNegative(input.miles, 'Miles');
  assertPositive(input.mpg, 'Miles per gallon');
  return {
    miles: input.miles,
    mpg: input.mpg,
    gallons: input.miles / input.mpg,
  };
}

export function fuelCostFromGallons(gallons: number, dollarsPerGallon: number): number {
  assertFiniteNonNegative(gallons, 'Gallons');
  assertFiniteNonNegative(dollarsPerGallon, 'Fuel price');
  return gallons * dollarsPerGallon;
}

export function fuelCost(input: { miles: number; mpg: number; dollarsPerGallon: number }): FuelCost {
  const used = fuelGallons({ miles: input.miles, mpg: input.mpg });
  return {
    ...used,
    dollarsPerGallon: input.dollarsPerGallon,
    cost: fuelCostFromGallons(used.gallons, input.dollarsPerGallon),
  };
}
