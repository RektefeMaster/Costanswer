import { assertFiniteNonNegative } from './finite';

export type EnergyCostFromKwh = {
  kwh: number;
  rateCentsPerKwh: number;
  cost: number;
};

export function dollarsFromCentsPerKwh(centsPerKwh: number): number {
  assertFiniteNonNegative(centsPerKwh, 'Electricity price');
  return centsPerKwh / 100;
}

export function energyCostFromKwh(input: { kwh: number; centsPerKwh: number }): EnergyCostFromKwh {
  assertFiniteNonNegative(input.kwh, 'Electricity use');
  assertFiniteNonNegative(input.centsPerKwh, 'Electricity price');
  return {
    kwh: input.kwh,
    rateCentsPerKwh: input.centsPerKwh,
    cost: input.kwh * dollarsFromCentsPerKwh(input.centsPerKwh),
  };
}
