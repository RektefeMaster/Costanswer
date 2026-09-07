export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) throw new Error('Money must be finite.');
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function roundCentsToIncrement(cents: number, increment: number): number {
  if (!Number.isInteger(increment) || increment < 1) throw new Error('Display increment must be a positive integer.');
  return Math.round(cents / increment) * increment;
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
