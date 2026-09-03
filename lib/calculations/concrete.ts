import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';

const BAG_YIELD_CUBIC_FEET = {
  60: 0.45,
  80: 0.6,
} as const;

export const concreteInputSchema = z.object({
  lengthFeet: finiteNumber('Length', 0.1, 10_000),
  widthFeet: finiteNumber('Width', 0.1, 10_000),
  thicknessInches: finiteNumber('Thickness', 0.5, 120),
  wastePercent: finiteNumber('Waste allowance', 0, 30),
  bagWeight: z.union([z.literal(60), z.literal(80)]),
  pricePerBag: finiteNumber('Price per bag', 0, 1_000).optional(),
});

export type ConcreteInput = z.infer<typeof concreteInputSchema>;

export type ConcreteValue = {
  exactCubicFeet: number;
  exactCubicYards: number;
  lowBags: number;
  typicalBags: number;
  highBags: number;
  typicalCubicYards: number;
  highCubicYards: number;
  typicalMaterialCost?: number;
};

export function calculateConcrete(rawInput: unknown): CalculationResult<ConcreteValue> {
  const input = concreteInputSchema.parse(rawInput);
  const exactCubicFeet = input.lengthFeet * input.widthFeet * (input.thicknessInches / 12);
  const typicalFactor = 1 + input.wastePercent / 100;
  const highFactor = 1 + Math.min(input.wastePercent + 5, 35) / 100;
  const bagYield = BAG_YIELD_CUBIC_FEET[input.bagWeight];
  const lowBags = Math.ceil(exactCubicFeet / bagYield);
  const typicalBags = Math.ceil((exactCubicFeet * typicalFactor) / bagYield);
  const highBags = Math.ceil((exactCubicFeet * highFactor) / bagYield);
  const typicalMaterialCost = input.pricePerBag === undefined
    ? undefined
    : round(typicalBags * input.pricePerBag);

  return {
    value: {
      exactCubicFeet: round(exactCubicFeet, 3),
      exactCubicYards: round(exactCubicFeet / 27, 3),
      lowBags,
      typicalBags,
      highBags,
      typicalCubicYards: round((exactCubicFeet * typicalFactor) / 27, 3),
      highCubicYards: round((exactCubicFeet * highFactor) / 27, 3),
      ...(typicalMaterialCost === undefined ? {} : { typicalMaterialCost }),
    },
    calculationVersion: 'material-volume-v1.1.0',
    datasetSnapshotIds: ['quikrete-packaged-concrete-yields-2026-09'],
    breakdown: [
      {
        label: 'Measured volume',
        value: `${round(exactCubicFeet / 27, 3)} yd³`,
        detail: `${input.lengthFeet} ft × ${input.widthFeet} ft × ${input.thicknessInches} in`,
      },
      {
        label: 'Planning volume',
        value: `${round((exactCubicFeet * typicalFactor) / 27, 3)} yd³`,
        detail: `Includes your ${input.wastePercent}% allowance`,
      },
      {
        label: `${input.bagWeight} lb bags`,
        value: `${typicalBags} bags`,
        detail: `${bagYield} ft³ approximate yield per bag`,
      },
      ...(typicalMaterialCost === undefined ? [] : [{
        label: 'Material subtotal',
        value: formatMoney(typicalMaterialCost),
        detail: `${typicalBags} bags × ${formatMoney(input.pricePerBag ?? 0)}`,
      }]),
    ],
    assumptions: [
      'The shape is a rectangular slab with even thickness.',
      'Bag yields are approximate. Check the bag you buy.',
      'The range goes from measured volume to a little more than your waste percent.',
      'This is a quantity estimate, not structural advice.',
    ],
  };
}
