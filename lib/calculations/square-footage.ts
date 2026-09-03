import { z } from 'zod';
import { convertValue } from './conversion/units';
import { finiteNumber, formatNumber, round, type CalculationResult } from './contracts';
import { SQUARE_FOOTAGE_ENGINE_ID } from './education/formulas';

const spaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(60),
  length: finiteNumber('Length', 0.01, 1_000_000),
  width: finiteNumber('Width', 0.01, 1_000_000),
});

export const squareFootageInputSchema = z.object({
  unit: z.enum(['ft', 'm']),
  spaces: z.array(spaceSchema).min(1).max(20),
});

export function calculateSquareFootage(rawInput: unknown): CalculationResult<{
  totalSquareFeet: number;
  totalSquareMeters: number;
  spaces: Array<{ id: string; name: string; squareFeet: number }>;
}> {
  const input = squareFootageInputSchema.parse(rawInput);
  const spaces = input.spaces.map((space) => {
    const area = space.length * space.width;
    const squareFeet = input.unit === 'ft' ? area : convertValue(area, 'm2', 'ft2');
    return { id: space.id, name: space.name || 'Space', squareFeet };
  });
  const totalSquareFeet = spaces.reduce((sum, space) => sum + space.squareFeet, 0);
  const totalSquareMeters = convertValue(totalSquareFeet, 'ft2', 'm2');
  return {
    value: {
      totalSquareFeet: round(totalSquareFeet, 2),
      totalSquareMeters: round(totalSquareMeters, 2),
      spaces: spaces.map((space) => ({ ...space, squareFeet: round(space.squareFeet, 2) })),
    },
    calculationVersion: SQUARE_FOOTAGE_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      ...spaces.map((space) => ({
        label: space.name,
        value: `${formatNumber(space.squareFeet, { maximumFractionDigits: 2 })} ft²`,
      })),
      { label: 'Total area', value: `${formatNumber(totalSquareFeet, { maximumFractionDigits: 2 })} ft²` },
      { label: 'Square meters', value: `${formatNumber(totalSquareMeters, { maximumFractionDigits: 2 })} m²` },
    ],
    assumptions: [
      'Each space is a rectangle: length × width.',
      'Metric areas convert through the shared conversion engine (1 ft = 0.3048 m exact).',
      'This is plan area, not material yield. The Concrete Calculator handles slab volume.',
    ],
  };
}

export { SQUARE_FOOTAGE_ENGINE_ID };
