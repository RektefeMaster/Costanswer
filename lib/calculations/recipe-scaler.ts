import { z } from 'zod';
import { finiteNumber, round, type CalculationResult } from './contracts';

const VULGAR_FRACTIONS: Record<string, string> = {
  '¼': '1/4', '½': '1/2', '¾': '3/4', '⅐': '1/7', '⅑': '1/9',
  '⅒': '1/10', '⅓': '1/3', '⅔': '2/3', '⅕': '1/5', '⅖': '2/5',
  '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅛': '1/8',
  '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};

export function parseQuantity(raw: string): number | null {
  let value = raw.trim();
  if (!value) return null;
  for (const [symbol, fraction] of Object.entries(VULGAR_FRACTIONS)) {
    value = value.replaceAll(symbol, ` ${fraction}`);
  }
  const parts = value.trim().split(/\s+/);
  let total = 0;
  for (const part of parts) {
    if (/^\d+(?:\.\d+)?$/.test(part)) {
      total += Number(part);
      continue;
    }
    const fraction = part.match(/^(\d+)\/(\d+)$/);
    if (!fraction || Number(fraction[2]) === 0) return null;
    total += Number(fraction[1]) / Number(fraction[2]);
  }
  return Number.isFinite(total) && total >= 0 && total <= 1_000_000 ? total : null;
}

const KITCHEN_CANDIDATES: Array<{ n: number; d: number; val: number }> = [
  { n: 0, d: 1, val: 0 },
  { n: 1, d: 16, val: 1 / 16 },
  { n: 1, d: 8, val: 1 / 8 },
  { n: 3, d: 16, val: 3 / 16 },
  { n: 1, d: 4, val: 1 / 4 },
  { n: 5, d: 16, val: 5 / 16 },
  { n: 1, d: 3, val: 1 / 3 },
  { n: 3, d: 8, val: 3 / 8 },
  { n: 7, d: 16, val: 7 / 16 },
  { n: 1, d: 2, val: 1 / 2 },
  { n: 9, d: 16, val: 9 / 16 },
  { n: 5, d: 8, val: 5 / 8 },
  { n: 2, d: 3, val: 2 / 3 },
  { n: 11, d: 16, val: 11 / 16 },
  { n: 3, d: 4, val: 3 / 4 },
  { n: 13, d: 16, val: 13 / 16 },
  { n: 7, d: 8, val: 7 / 8 },
  { n: 15, d: 16, val: 15 / 16 },
  { n: 1, d: 1, val: 1 },
];

export function formatKitchenQuantity(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new Error('Kitchen quantity must be a finite, non-negative number.');
  if (value === 0) return '0';
  if (value > 0 && value < 1 / 32) return '< 1/16';

  let whole = Math.floor(value);
  const frac = value - whole;

  let best = KITCHEN_CANDIDATES[0];
  let minDiff = Infinity;
  for (const c of KITCHEN_CANDIDATES) {
    const diff = Math.abs(frac - c.val);
    if (diff < minDiff) {
      minDiff = diff;
      best = c;
    }
  }

  if (best.val === 1) {
    whole += 1;
    return `${whole}`;
  }
  if (best.val === 0) {
    return whole > 0 ? `${whole}` : '< 1/16';
  }

  const fraction = `${best.n}/${best.d}`;
  return whole > 0 ? `${whole} ${fraction}` : fraction;
}

const ingredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Ingredient name is required.').max(80),
  quantity: z.string().trim().refine((value) => parseQuantity(value) !== null, 'Use a number, decimal, or fraction.'),
  unit: z.string().trim().max(30),
});

export const recipeScalerInputSchema = z.object({
  originalServings: finiteNumber('Original servings', 0.1, 10_000),
  desiredServings: finiteNumber('Desired servings', 0.1, 10_000),
  ingredients: z.array(ingredientSchema).min(1).max(30),
}).superRefine((input, context) => {
  const seen = new Set<string>();
  input.ingredients.forEach((ingredient, index) => {
    if (seen.has(ingredient.id)) {
      context.addIssue({ code: 'custom', path: ['ingredients', index, 'id'], message: 'Ingredient IDs must be unique.' });
    }
    seen.add(ingredient.id);
  });
});

export type RecipeScalerInput = z.infer<typeof recipeScalerInputSchema>;

export type RecipeScalerValue = {
  scaleFactor: number;
  ingredients: Array<{
    id: string;
    name: string;
    exactQuantity: number;
    displayQuantity: string;
    unit: string;
  }>;
};

export function scaleRecipe(rawInput: unknown): CalculationResult<RecipeScalerValue> {
  const input = recipeScalerInputSchema.parse(rawInput);
  const scaleFactor = input.desiredServings / input.originalServings;
  const ingredients = input.ingredients.map((ingredient) => {
    const parsed = parseQuantity(ingredient.quantity);
    if (parsed === null) throw new Error(`Invalid quantity for ${ingredient.name}`);
    const exactQuantity = parsed * scaleFactor;
    return {
      id: ingredient.id,
      name: ingredient.name,
      exactQuantity,
      displayQuantity: formatKitchenQuantity(exactQuantity),
      unit: ingredient.unit,
    };
  });

  return {
    value: { scaleFactor: round(scaleFactor, 4), ingredients },
    calculationVersion: 'quantity-scaling-v1.1.0',
    datasetSnapshotIds: [],
    breakdown: ingredients.map((ingredient) => ({
      label: ingredient.name,
      value: `${ingredient.displayQuantity}${ingredient.unit ? ` ${ingredient.unit}` : ''}`,
      detail: `Scaled by ${round(scaleFactor, 3)}×`,
    })),
    assumptions: [
      'Ingredient amounts scale in a straight line. Pan size, cook time, and seasoning might not.',
      'Displayed fractions round to the nearest 1/16. Smaller positive amounts show as “< 1/16”.',
      'This does not turn cups into ounces. Densities differ.',
    ],
  };
}
