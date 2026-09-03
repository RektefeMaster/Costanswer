export function percentOf(percent: number, base: number): number {
  return (percent / 100) * base;
}

export function whatPercent(part: number, whole: number): number {
  if (whole === 0) throw new Error('Cannot calculate a percentage of zero.');
  return (part / whole) * 100;
}

export function percentOfWhat(part: number, percent: number): number {
  if (percent === 0) throw new Error('Cannot solve for a base when the percent is zero.');
  return part / (percent / 100);
}

export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) {
    throw new Error('Percent change is not defined when the original value is zero.');
  }
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}
