import { z } from 'zod';

export type BreakdownStep = {
  label: string;
  value: string;
  detail?: string;
};

export type CalculationResult<T> = {
  value: T;
  calculationVersion: string;
  datasetSnapshotIds: string[];
  breakdown: BreakdownStep[];
  assumptions: string[];
};

/**
 * Shared numeric contract for calculator engines.
 *
 * Accepts real numbers and plain decimal strings ("6.5", ".5"). Rejects blanks,
 * whitespace, booleans, null, hex, and other JavaScript coercions that
 * `z.coerce.number()` / `Number("")` would silently turn into 0 or 1.
 */
export const finiteNumber = (label: string, minimum: number, maximum: number) =>
  z.preprocess((value) => {
    if (typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) {
      return Number(value.trim());
    }
    return value;
  }, z.number({ error: `${label} must be a number.` })
    .finite(`${label} must be finite.`)
    .min(minimum, `${label} must be at least ${minimum}.`)
    .max(maximum, `${label} must be no more than ${maximum}.`));

/**
 * Whole counts from form controls (`<input type="number">` / `<select>` strings).
 * Rejects blanks and non-integers the same way `finiteNumber` rejects bad money.
 */
export const wholeNumber = (label: string, minimum: number, maximum: number) =>
  z.preprocess((value) => {
    if (typeof value === 'string' && /^[+-]?\d+$/.test(value.trim())) {
      return Number(value.trim());
    }
    return value;
  }, z.number({ error: `${label} must be a number.` })
    .int(`${label} must be a whole number.`)
    .min(minimum, `${label} must be at least ${minimum}.`)
    .max(maximum, `${label} must be no more than ${maximum}.`));

/** Tax / loan year from `<select>` option strings (`"2026"`). */
export const taxYearNumber = wholeNumber('Tax year', 1990, 2100);

export function round(value: number, digits = 2): number {
  if (!Number.isFinite(value)) throw new Error('Rounded value must be finite.');
  if (!Number.isInteger(digits) || digits < 0 || digits > 12) throw new Error('Rounding digits must be an integer from 0 to 12.');
  const factor = 10 ** digits;
  const [coefficient, exponent = '0'] = Math.abs(value).toString().split('e');
  const shifted = Number(`${coefficient}e${Number(exponent) + digits}`);
  return Math.sign(value) * Math.round(shifted) / factor;
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-US', options).format(value);
}

export function formatMoney(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  }).format(value);
}
