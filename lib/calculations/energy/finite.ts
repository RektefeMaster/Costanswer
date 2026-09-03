export function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
}

export function assertFiniteNonNegative(value: number, label: string): void {
  assertFiniteNumber(value, label);
  if (value < 0) throw new Error(`${label} cannot be negative.`);
}

export function assertPositive(value: number, label: string): void {
  assertFiniteNumber(value, label);
  if (value <= 0) throw new Error(`${label} must be greater than zero.`);
}

export function assertInRange(value: number, minimum: number, maximum: number, label: string): void {
  assertFiniteNumber(value, label);
  if (value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
}
