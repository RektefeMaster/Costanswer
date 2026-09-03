import { z } from 'zod';

export const USDA_FOOD_PLANS = ['thrifty', 'low-cost', 'moderate-cost', 'liberal'] as const;
export type UsdaFoodPlan = (typeof USDA_FOOD_PLANS)[number];

export const USDA_FOOD_GROUPS = [
  'child_1',
  'child_2_3',
  'child_4_5',
  'child_6_8',
  'child_9_11',
  'female_12_13',
  'female_14_19',
  'female_20_50',
  'female_51_70',
  'female_71',
  'male_12_13',
  'male_14_19',
  'male_20_50',
  'male_51_70',
  'male_71',
] as const;

export type UsdaFoodGroup = (typeof USDA_FOOD_GROUPS)[number];

const monthlyCostsSchema = z.object({
  child_1: z.number().finite().positive(),
  child_2_3: z.number().finite().positive(),
  child_4_5: z.number().finite().positive(),
  child_6_8: z.number().finite().positive(),
  child_9_11: z.number().finite().positive(),
  female_12_13: z.number().finite().positive(),
  female_14_19: z.number().finite().positive(),
  female_20_50: z.number().finite().positive(),
  female_51_70: z.number().finite().positive(),
  female_71: z.number().finite().positive(),
  male_12_13: z.number().finite().positive(),
  male_14_19: z.number().finite().positive(),
  male_20_50: z.number().finite().positive(),
  male_51_70: z.number().finite().positive(),
  male_71: z.number().finite().positive(),
}).strict();

export const usdaFoodSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal('usda-food-plans-v1.0.0'),
  snapshotId: z.string().min(1),
  provider: z.literal('U.S. Department of Agriculture'),
  datasetId: z.literal('usda-food-plans'),
  observationPeriod: z.string().regex(/^\d{4}-\d{2}$/),
  reportMonth: z.string().regex(/^\d{4}-\d{2}$/),
  sourceStatus: z.literal('final'),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  attribution: z.string().min(1),
  unit: z.literal('monthly-usd'),
  defaultPlan: z.literal('moderate-cost'),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string()).min(1),
  plans: z.object({
    thrifty: monthlyCostsSchema,
    'low-cost': monthlyCostsSchema,
    'moderate-cost': monthlyCostsSchema,
    liberal: monthlyCostsSchema,
  }).strict(),
  householdSizeAdjustment: z.object({
    '1': z.literal(1.2),
    '2': z.literal(1.1),
    '3': z.literal(1.05),
    '4': z.literal(1),
    '5': z.literal(0.95),
    '6': z.literal(0.95),
    '7plus': z.literal(0.9),
  }).strict(),
  alaskaHawaii: z.object({
    thriftyReferenceFamily: z.object({
      anchorage: z.number().finite().positive(),
      hawaii: z.number().finite().positive(),
      contiguous: z.number().finite().positive(),
    }).strict(),
    note: z.string().min(1),
  }).strict(),
}).strict().superRefine((snapshot, context) => {
  if (snapshot.reportMonth !== snapshot.observationPeriod) {
    context.addIssue({ code: 'custom', path: ['reportMonth'], message: 'USDA report month must match the observation period.' });
  }
});

export type UsdaFoodSnapshot = z.infer<typeof usdaFoodSnapshotSchema>;

export function usdaHouseholdSizeAdjustment(memberCount: number, snapshot: UsdaFoodSnapshot): number {
  if (!Number.isInteger(memberCount) || memberCount < 1) {
    throw new Error('Household size must be a whole number of at least 1.');
  }
  if (memberCount === 1) return snapshot.householdSizeAdjustment['1'];
  if (memberCount === 2) return snapshot.householdSizeAdjustment['2'];
  if (memberCount === 3) return snapshot.householdSizeAdjustment['3'];
  if (memberCount === 4) return snapshot.householdSizeAdjustment['4'];
  if (memberCount === 5) return snapshot.householdSizeAdjustment['5'];
  if (memberCount === 6) return snapshot.householdSizeAdjustment['6'];
  return snapshot.householdSizeAdjustment['7plus'];
}
