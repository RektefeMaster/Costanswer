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

export const finiteNumber = (label: string, minimum: number, maximum: number) =>
  z.coerce
    .number({ error: `${label} must be a number.` })
    .finite(`${label} must be finite.`)
    .min(minimum, `${label} must be at least ${minimum}.`)
    .max(maximum, `${label} must be no more than ${maximum}.`);

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
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

