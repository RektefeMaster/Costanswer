import { z } from 'zod';
import { convertValue } from './conversion/units';
import { finiteNumber, formatNumber, round, type CalculationResult } from './contracts';
import {
  ACTIVITY_FACTORS,
  ACTIVITY_LEVELS,
  adultBmiCategory,
  adultBmiCategoryLabel,
  adjustedDailyCalories,
  BMI_ENGINE_ID,
  BMR_ENGINE_ID,
  BODY_FAT_ENGINE_ID,
  bodyMassIndex,
  CALORIE_ENGINE_ID,
  CALORIE_GOAL_ADJUSTMENTS,
  navyBodyFatPercent,
  mifflinStJeorBmrKcal,
  TDEE_ENGINE_ID,
  tdeeFromBmr,
  type ActivityLevel,
  type BiologicalSex,
  type CalorieGoal,
} from './health/formulas';

const sexSchema = z.enum(['female', 'male']);
const unitSystemSchema = z.enum(['metric', 'us']);
const activitySchema = z.enum(ACTIVITY_LEVELS as [ActivityLevel, ...ActivityLevel[]]);
const goalSchema = z.enum(['maintain', 'lose-slow', 'gain-slow']);

/** Canonical adult anthropometric domain (SI). Unit system is presentation only. */
export const HEALTH_WEIGHT_KG = { min: 30, max: 300 } as const;
export const HEALTH_HEIGHT_CM = { min: 120, max: 220 } as const;
export const BMI_WEIGHT_KG = { min: 2, max: 400 } as const;
export const BMI_HEIGHT_CM = { min: 50, max: 250 } as const;
export const BODY_FAT_LENGTH_CM = { min: 10, max: 200 } as const;

function toKg(weight: number, system: 'metric' | 'us'): number {
  return system === 'metric' ? weight : convertValue(weight, 'lb', 'kg');
}

function toMeters(height: number, system: 'metric' | 'us'): number {
  return system === 'metric' ? height / 100 : convertValue(height, 'in', 'm');
}

function toCm(height: number, system: 'metric' | 'us'): number {
  return toMeters(height, system) * 100;
}

function toInches(value: number, system: 'metric' | 'us'): number {
  return system === 'metric' ? convertValue(value, 'cm', 'in') : value;
}

function addCanonicalRangeIssue(
  context: z.RefinementCtx,
  path: string,
  label: string,
  value: number,
  range: { min: number; max: number },
  unit: string,
) {
  if (value < range.min || value > range.max) {
    context.addIssue({
      code: 'custom',
      path: [path],
      message: `${label} must be between ${range.min} and ${range.max} ${unit} (same person, either unit system).`,
    });
  }
}

const HEALTH_ASSUMPTIONS = [
  'This is a formula-based estimate for adults, not a diagnosis or medical advice.',
  'Population-level equations can be a poor fit for children, pregnancy, elite athletes, and some clinical populations.',
  'Talk with a clinician before using a number like this to make a health decision.',
];

// Wide raw bounds so US/metric presentation values can round-trip; physical
// domain is enforced in SI after conversion.
export const bmiInputSchema = z.object({
  unitSystem: unitSystemSchema,
  weight: finiteNumber('Weight', 0.1, 2_000),
  height: finiteNumber('Height', 0.1, 1_000),
}).superRefine((input, context) => {
  addCanonicalRangeIssue(context, 'weight', 'Weight', toKg(input.weight, input.unitSystem), BMI_WEIGHT_KG, 'kg');
  addCanonicalRangeIssue(context, 'height', 'Height', toCm(input.height, input.unitSystem), BMI_HEIGHT_CM, 'cm');
});

export function calculateBmi(rawInput: unknown): CalculationResult<{
  bmi: number;
  weightKg: number;
  heightMeters: number;
  adultCategoryId: ReturnType<typeof adultBmiCategory>;
  adultCategoryLabel: string;
}> {
  const input = bmiInputSchema.parse(rawInput);
  const weightKg = toKg(input.weight, input.unitSystem);
  const heightMeters = toMeters(input.height, input.unitSystem);
  const bmi = bodyMassIndex(weightKg, heightMeters);
  const adultCategoryId = adultBmiCategory(bmi);
  return {
    value: {
      bmi: round(bmi, 2),
      weightKg: round(weightKg, 4),
      heightMeters: round(heightMeters, 4),
      adultCategoryId,
      adultCategoryLabel: adultBmiCategoryLabel(adultCategoryId),
    },
    calculationVersion: BMI_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Weight', value: `${formatNumber(weightKg, { maximumFractionDigits: 2 })} kg` },
      { label: 'Height', value: `${formatNumber(heightMeters, { maximumFractionDigits: 3 })} m` },
      { label: 'BMI', value: formatNumber(bmi, { maximumFractionDigits: 2 }), detail: 'weight ÷ height²' },
    ],
    assumptions: [
      ...HEALTH_ASSUMPTIONS,
      'Adult BMI category labels, if shown, are CDC screening ranges for ages 20+ and are secondary to the number.',
      'This page does not calculate child or teen BMI percentiles.',
    ],
  };
}

const energyBodySchema = z.object({
  unitSystem: unitSystemSchema,
  sex: sexSchema,
  ageYears: finiteNumber('Age', 18, 80).refine(Number.isInteger, 'Age must be a whole number.'),
  weight: finiteNumber('Weight', 0.1, 2_000),
  height: finiteNumber('Height', 0.1, 1_000),
  activity: activitySchema,
}).superRefine((input, context) => {
  addCanonicalRangeIssue(context, 'weight', 'Weight', toKg(input.weight, input.unitSystem), HEALTH_WEIGHT_KG, 'kg');
  addCanonicalRangeIssue(context, 'height', 'Height', toCm(input.height, input.unitSystem), HEALTH_HEIGHT_CM, 'cm');
});

function energyBody(input: z.infer<typeof energyBodySchema>) {
  const weightKg = toKg(input.weight, input.unitSystem);
  const heightCm = toCm(input.height, input.unitSystem);
  const bmr = mifflinStJeorBmrKcal({
    weightKg,
    heightCm,
    ageYears: input.ageYears,
    sex: input.sex,
  });
  if (!(bmr > 0)) {
    throw new Error('These measurements produce a non-positive energy estimate. Check weight, height, age, and sex.');
  }
  const tdee = tdeeFromBmr(bmr, input.activity);
  return { weightKg, heightCm, bmr, tdee };
}

export const bmrInputSchema = energyBodySchema;
export const tdeeInputSchema = energyBodySchema;
export const calorieInputSchema = energyBodySchema.extend({ goal: goalSchema });

const BMR_ASSUMPTIONS = [
  ...HEALTH_ASSUMPTIONS,
  'Estimated BMR uses the Mifflin–St Jeor equation for adults. It is not a measured metabolic rate.',
];

/** Only the calculators that actually multiply by an activity level say so. */
const ENERGY_ASSUMPTIONS = [
  ...BMR_ASSUMPTIONS,
  'Activity multipliers are conventional planning factors, not individualized physiology.',
];

export function calculateBmr(rawInput: unknown): CalculationResult<{ bmrKcal: number; sex: BiologicalSex; activity: ActivityLevel }> {
  const input = bmrInputSchema.parse(rawInput);
  const { bmr } = energyBody(input);
  return {
    value: { bmrKcal: round(bmr, 0), sex: input.sex, activity: input.activity },
    calculationVersion: BMR_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Equation', value: 'Mifflin–St Jeor', detail: input.sex === 'male' ? '10×kg + 6.25×cm − 5×age + 5' : '10×kg + 6.25×cm − 5×age − 161' },
      { label: 'Estimated BMR', value: `${formatNumber(bmr, { maximumFractionDigits: 0 })} kcal/day` },
    ],
    assumptions: BMR_ASSUMPTIONS,
  };
}

export function calculateTdee(rawInput: unknown): CalculationResult<{
  bmrKcal: number;
  tdeeKcal: number;
  activity: ActivityLevel;
  activityFactor: number;
}> {
  const input = tdeeInputSchema.parse(rawInput);
  const { bmr, tdee } = energyBody(input);
  const activity = ACTIVITY_FACTORS[input.activity];
  return {
    value: {
      bmrKcal: round(bmr, 0),
      tdeeKcal: round(tdee, 0),
      activity: input.activity,
      activityFactor: activity.factor,
    },
    calculationVersion: TDEE_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Estimated BMR', value: `${formatNumber(bmr, { maximumFractionDigits: 0 })} kcal/day`, detail: 'Mifflin–St Jeor' },
      { label: 'Activity factor', value: formatNumber(activity.factor, { maximumFractionDigits: 3 }), detail: `${activity.label}: ${activity.detail}` },
      { label: 'Estimated TDEE', value: `${formatNumber(tdee, { maximumFractionDigits: 0 })} kcal/day` },
    ],
    assumptions: ENERGY_ASSUMPTIONS,
  };
}

export function calculateCalorie(rawInput: unknown): CalculationResult<{
  maintenanceKcal: number;
  goalKcal: number;
  goal: CalorieGoal;
  bmrKcal: number;
}> {
  const input = calorieInputSchema.parse(rawInput);
  const { bmr, tdee } = energyBody(input);
  const goalKcal = adjustedDailyCalories(tdee, input.goal);
  if (!(goalKcal > 0)) {
    throw new Error('These measurements produce a non-positive calorie estimate. Check weight, height, age, and sex.');
  }
  return {
    value: {
      maintenanceKcal: round(tdee, 0),
      goalKcal: round(goalKcal, 0),
      goal: input.goal,
      bmrKcal: round(bmr, 0),
    },
    calculationVersion: CALORIE_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Estimated maintenance', value: `${formatNumber(tdee, { maximumFractionDigits: 0 })} kcal/day`, detail: 'TDEE from Mifflin–St Jeor × activity' },
      { label: 'Goal adjustment', value: `${CALORIE_GOAL_ADJUSTMENTS[input.goal]} kcal`, detail: 'A small planning offset, not a prescribed diet' },
      { label: 'Estimated daily calories', value: `${formatNumber(goalKcal, { maximumFractionDigits: 0 })} kcal/day` },
    ],
    assumptions: [
      ...ENERGY_ASSUMPTIONS,
      'Maintenance calories equal estimated TDEE under the selected activity factor.',
      'Slow loss/gain offsets are conservative planning numbers, not a weight-loss program.',
    ],
  };
}

export const bodyFatInputSchema = z.object({
  unitSystem: unitSystemSchema,
  sex: sexSchema,
  height: finiteNumber('Height', 0.1, 1_000),
  neck: finiteNumber('Neck', 0.1, 1_000),
  waist: finiteNumber('Waist', 0.1, 1_000),
  hip: finiteNumber('Hip', 0.1, 1_000).optional(),
}).superRefine((input, context) => {
  if (input.sex === 'female' && input.hip === undefined) {
    context.addIssue({ code: 'custom', path: ['hip'], message: 'Hip measurement is required for the female Navy estimate.' });
  }
  addCanonicalRangeIssue(context, 'height', 'Height', toCm(input.height, input.unitSystem), HEALTH_HEIGHT_CM, 'cm');
  addCanonicalRangeIssue(context, 'neck', 'Neck', toCm(input.neck, input.unitSystem), BODY_FAT_LENGTH_CM, 'cm');
  addCanonicalRangeIssue(context, 'waist', 'Waist', toCm(input.waist, input.unitSystem), BODY_FAT_LENGTH_CM, 'cm');
  if (input.hip !== undefined) {
    addCanonicalRangeIssue(context, 'hip', 'Hip', toCm(input.hip, input.unitSystem), BODY_FAT_LENGTH_CM, 'cm');
  }
});

export function calculateBodyFat(rawInput: unknown): CalculationResult<{
  bodyFatPercent: number;
  method: 'navy-circumference';
  sex: BiologicalSex;
}> {
  const input = bodyFatInputSchema.parse(rawInput);
  const percent = navyBodyFatPercent({
    sex: input.sex,
    heightInches: toInches(input.height, input.unitSystem),
    neckInches: toInches(input.neck, input.unitSystem),
    waistInches: toInches(input.waist, input.unitSystem),
    hipInches: input.hip === undefined ? undefined : toInches(input.hip, input.unitSystem),
  });
  if (!Number.isFinite(percent) || percent < 0 || percent > 75) {
    throw new Error('These measurements are outside the range this circumference method can estimate.');
  }
  return {
    value: {
      bodyFatPercent: round(percent, 1),
      method: 'navy-circumference',
      sex: input.sex,
    },
    calculationVersion: BODY_FAT_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Method', value: 'U.S. Navy circumference', detail: 'Hodgdon & Beckett, 1984' },
      { label: 'Estimated body fat', value: `${formatNumber(percent, { maximumFractionDigits: 1 })}%` },
    ],
    assumptions: [
      ...HEALTH_ASSUMPTIONS,
      'This is a circumference estimate, not DEXA, Bod Pod, or clinical measurement.',
      'Tape placement and posture change the result. Use the same sites consistently.',
    ],
  };
}

export { ACTIVITY_FACTORS, ACTIVITY_LEVELS, BMI_ENGINE_ID, BMR_ENGINE_ID, BODY_FAT_ENGINE_ID, CALORIE_ENGINE_ID, TDEE_ENGINE_ID };
export type { ActivityLevel, BiologicalSex, CalorieGoal };
