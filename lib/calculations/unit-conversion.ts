import { z } from 'zod';
import {
  CONVERSION_CATEGORIES,
  CONVERSION_ENGINE_ID,
  CONVERSION_UNITS,
  convertValue,
  getConversionUnit,
  unitsForCategory,
  type ConversionCategory,
} from './conversion/units';
import { finiteNumber, formatNumber, round, type CalculationResult } from './contracts';

const categorySchema = z.enum(CONVERSION_CATEGORIES);
const unitIdSchema = z.string().min(1);

export const unitConversionInputSchema = z.object({
  category: categorySchema,
  fromUnit: unitIdSchema,
  toUnit: unitIdSchema,
  value: finiteNumber('Value', -1_000_000_000_000, 1_000_000_000_000),
}).superRefine((input, context) => {
  try {
    const from = getConversionUnit(input.fromUnit);
    const to = getConversionUnit(input.toUnit);
    if (from.category !== input.category || to.category !== input.category) {
      context.addIssue({ code: 'custom', message: 'Choose units from the selected category.' });
    }
  } catch {
    context.addIssue({ code: 'custom', message: 'Choose a supported unit.' });
  }
});

export function calculateUnitConversion(rawInput: unknown): CalculationResult<{
  output: number;
  fromSymbol: string;
  toSymbol: string;
  category: ConversionCategory;
}> {
  const input = unitConversionInputSchema.parse(rawInput);
  const output = convertValue(input.value, input.fromUnit, input.toUnit);
  if (!Number.isFinite(output)) throw new Error('This conversion is out of range.');
  const from = getConversionUnit(input.fromUnit);
  const to = getConversionUnit(input.toUnit);
  const digits = Math.abs(output) >= 100 ? 4 : 8;
  return {
    value: {
      output: round(output, digits),
      fromSymbol: from.symbol,
      toSymbol: to.symbol,
      category: input.category,
    },
    calculationVersion: CONVERSION_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Input', value: `${formatNumber(input.value, { maximumFractionDigits: 8 })} ${from.symbol}` },
      { label: 'Output', value: `${formatNumber(output, { maximumFractionDigits: digits })} ${to.symbol}` },
      { label: 'Category', value: input.category },
    ],
    assumptions: [
      'Linear units convert through a canonical base unit. Temperature uses an affine Kelvin path.',
      'Inch, foot, mile, and pound use the international yard and pound exact constants.',
      'Every pair converts through a canonical base unit, so kilograms to pounds and pounds to kilograms use the same tested factor.',
    ],
  };
}

export { CONVERSION_CATEGORIES, CONVERSION_ENGINE_ID, CONVERSION_UNITS, unitsForCategory };
export type { ConversionCategory };
