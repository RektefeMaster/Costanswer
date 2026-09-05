import { z } from 'zod';
import { finiteNumber, round, type CalculationResult } from './contracts';

export const UNIT_DEFINITIONS = {
  oz: { label: 'oz', dimension: 'mass', toBase: 1 },
  lb: { label: 'lb', dimension: 'mass', toBase: 16 },
  g: { label: 'g', dimension: 'mass', toBase: 0.0352739619 },
  kg: { label: 'kg', dimension: 'mass', toBase: 35.2739619 },
  'fl-oz': { label: 'fl oz', dimension: 'volume', toBase: 1 },
  tbsp: { label: 'tbsp', dimension: 'volume', toBase: 0.5 },
  cup: { label: 'cup', dimension: 'volume', toBase: 8 },
  pint: { label: 'pint', dimension: 'volume', toBase: 16 },
  quart: { label: 'quart', dimension: 'volume', toBase: 32 },
  gallon: { label: 'gallon', dimension: 'volume', toBase: 128 },
  ml: { label: 'mL', dimension: 'volume', toBase: 0.0338140227 },
  l: { label: 'L', dimension: 'volume', toBase: 33.8140227 },
  count: { label: 'item', dimension: 'count', toBase: 1 },
} as const;

export type UnitId = keyof typeof UNIT_DEFINITIONS;

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(60),
  price: finiteNumber('Price', 0.01, 1_000_000),
  quantity: finiteNumber('Quantity', 0.0001, 1_000_000),
  unit: z.enum(Object.keys(UNIT_DEFINITIONS) as [UnitId, ...UnitId[]]),
});

export const unitPriceInputSchema = z.object({
  options: z.array(optionSchema).min(2).max(8),
}).superRefine((input, context) => {
  const dimensions = new Set(input.options.map((option) => UNIT_DEFINITIONS[option.unit].dimension));
  if (dimensions.size > 1) {
    context.addIssue({ code: 'custom', message: 'Compare packages that use the same kind of unit (weight, volume, or count).' });
  }
  const seen = new Set<string>();
  input.options.forEach((option, index) => {
    if (seen.has(option.id)) {
      context.addIssue({ code: 'custom', path: ['options', index, 'id'], message: 'Package IDs must be unique.' });
    }
    seen.add(option.id);
  });
});

export type UnitPriceInput = z.infer<typeof unitPriceInputSchema>;

export type UnitPriceValue = {
  baseUnit: 'oz' | 'fl oz' | 'item';
  winnerId: string;
  winnerIds: string[];
  ranked: Array<{
    id: string;
    label: string;
    unitPrice: number;
    baseQuantity: number;
    savingsVsHighestPercent: number;
  }>;
};

export function calculateUnitPrices(rawInput: unknown): CalculationResult<UnitPriceValue> {
  const input = unitPriceInputSchema.parse(rawInput);
  const dimension = UNIT_DEFINITIONS[input.options[0].unit].dimension;
  const baseUnit = dimension === 'mass' ? 'oz' : dimension === 'volume' ? 'fl oz' : 'item';
  const calculated = input.options.map((option) => {
    const baseQuantity = option.quantity * UNIT_DEFINITIONS[option.unit].toBase;
    return {
      id: option.id,
      label: option.label,
      unitPrice: option.price / baseQuantity,
      baseQuantity,
    };
  });
  const highest = Math.max(...calculated.map((option) => option.unitPrice));
  const lowestExact = Math.min(...calculated.map((option) => option.unitPrice));
  const lowestComparable = round(lowestExact, 10);
  const winnerIds = calculated
    .filter((option) => round(option.unitPrice, 10) === lowestComparable)
    .map((option) => option.id)
    .sort();
  const ranked = calculated
    .sort((a, b) => a.unitPrice - b.unitPrice || a.id.localeCompare(b.id))
    .map((option) => ({
      ...option,
      unitPrice: round(option.unitPrice, 4),
      baseQuantity: round(option.baseQuantity, 4),
      savingsVsHighestPercent: highest === 0 ? 0 : round((1 - option.unitPrice / highest) * 100, 1),
    }));

  return {
    value: { baseUnit, winnerId: ranked[0].id, winnerIds, ranked },
    calculationVersion: 'unit-normalization-v1.1.1',
    datasetSnapshotIds: [],
    breakdown: ranked.map((option) => ({
      label: option.label,
      value: `$${option.unitPrice.toFixed(option.unitPrice < 0.1 ? 4 : 2)} per ${baseUnit}`,
      detail: `${option.baseQuantity.toLocaleString('en-US')} ${baseUnit} after converting units`,
    })),
    assumptions: [
      'Package prices are compared before tax, unless the price you typed already includes tax.',
      'Weight and volume are not interchangeable.',
      'Coupons, spoilage, membership fees, and quality are not in the math unless they are already in your price.',
    ],
  };
}
