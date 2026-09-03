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

const HEALTH_ASSUMPTIONS = [
  'This is a formula-based estimate for adults, not a diagnosis or medical advice.',
  'Population-level equations can be a poor fit for children, pregnancy, elite athletes, and some clinical populations.',
  'Talk with a clinician before using a number like this to make a health decision.',
];

export const bmiInputSchema = z.object({
  unitSystem: unitSystemSchema,
  weight: finiteNumber('Weight', 0.1, 500),
  height: finiteNumber('Height', 1, 300),
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
  weight: finiteNumber('Weight', 20, 400),
  height: finiteNumber('Height', 50, 300),
  activity: activitySchema,
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
  const tdee = tdeeFromBmr(bmr, input.activity);
  return { weightKg, heightCm, bmr, tdee };
}

export const bmrInputSchema = energyBodySchema;
export const tdeeInputSchema = energyBodySchema;
export const calorieInputSchema = energyBodySchema.extend({ goal: goalSchema });

const ENERGY_ASSUMPTIONS = [
  ...HEALTH_ASSUMPTIONS,
  'Estimated BMR uses the Mifflin–St Jeor equation for adults. It is not a measured metabolic rate.',
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
    assumptions: ENERGY_ASSUMPTIONS,
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
  height: finiteNumber('Height', 50, 300),
  neck: finiteNumber('Neck', 5, 80),
  waist: finiteNumber('Waist', 10, 200),
  hip: finiteNumber('Hip', 10, 200).optional(),
}).superRefine((input, context) => {
  if (input.sex === 'female' && input.hip === undefined) {
    context.addIssue({ code: 'custom', path: ['hip'], message: 'Hip measurement is required for the female Navy estimate.' });
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
