export function parseNumericBound(value: string | number | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function stepDecimals(step: number): number {
  const text = String(step);
  if (/[eE]/.test(text)) {
    const [mantissa, exponent] = text.toLowerCase().split('e');
    const fraction = mantissa.split('.')[1]?.length ?? 0;
    return Math.max(0, fraction - Number(exponent));
  }
  return text.split('.')[1]?.length ?? 0;
}

export function stepNumberValue(
  value: string,
  direction: 1 | -1,
  step: number,
  min?: number,
  max?: number,
  fallback?: number,
): string {
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  const hasValue = trimmed !== '' && Number.isFinite(parsed);
  const decimals = stepDecimals(step);
  let next: number;

  if (hasValue) {
    next = Number((parsed + direction * step).toFixed(decimals));
  } else if (fallback !== undefined) {
    next = Number((fallback + direction * step).toFixed(decimals));
  } else if (direction < 0) {
    return value;
  } else {
    next = min !== undefined && min > 0 ? min : Number(step.toFixed(decimals));
  }

  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return String(next);
}
