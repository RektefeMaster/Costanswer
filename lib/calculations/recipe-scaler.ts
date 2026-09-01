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

function greatestCommonDivisor(a: number, b: number): number {
  let left = a;
  let right = b;
  while (right !== 0) [left, right] = [right, left % right];
  return left;
}

export function formatKitchenQuantity(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new Error('Kitchen quantity must be a finite, non-negative number.');
  const roundedSixteenths = Math.round(value * 16);
  if (value > 0 && roundedSixteenths === 0) return '< 1/16';
  const whole = Math.floor(roundedSixteenths / 16);
  const numerator = roundedSixteenths % 16;
  if (numerator === 0) return `${whole}`;
  const divisor = greatestCommonDivisor(numerator, 16);
  const fraction = `${numerator / divisor}/${16 / divisor}`;
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
    calculationVersion: 'quantity-scaling-v1.0.0',
    datasetSnapshotIds: [],
    breakdown: ingredients.map((ingredient) => ({
      label: ingredient.name,
      value: `${ingredient.displayQuantity}${ingredient.unit ? ` ${ingredient.unit}` : ''}`,
      detail: `Scaled by ${round(scaleFactor, 3)}×`,
    })),
    assumptions: [
      'Ingredient quantities scale linearly; pan size, cooking time and seasoning may not.',
      'Displayed fractions are rounded to the nearest 1/16 for kitchen use; smaller positive amounts are labeled “< 1/16”.',
      'This tool does not convert volume to weight because ingredient densities differ.',
    ],
  };
}
