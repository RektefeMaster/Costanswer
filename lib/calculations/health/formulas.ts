export const HEALTH_ENGINE_FAMILY = 'health-v1.0.0';

export const BMI_ENGINE_ID = 'bmi-v1.0.0' as const;
export const BMR_ENGINE_ID = 'bmr-v1.0.0' as const;
export const TDEE_ENGINE_ID = 'tdee-v1.0.0' as const;
export const CALORIE_ENGINE_ID = 'calorie-v1.0.0' as const;
export const BODY_FAT_ENGINE_ID = 'body-fat-v1.0.0' as const;

export const ACTIVITY_FACTORS = {
  sedentary: { factor: 1.2, label: 'Sedentary', detail: 'Little or no exercise' },
  light: { factor: 1.375, label: 'Light', detail: 'Light exercise 1–3 days per week' },
  moderate: { factor: 1.55, label: 'Moderate', detail: 'Moderate exercise 3–5 days per week' },
  active: { factor: 1.725, label: 'Active', detail: 'Hard exercise 6–7 days per week' },
  veryActive: { factor: 1.9, label: 'Very active', detail: 'Hard daily exercise or physical job' },
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_FACTORS;
export const ACTIVITY_LEVELS = Object.keys(ACTIVITY_FACTORS) as ActivityLevel[];

export type BiologicalSex = 'female' | 'male';

export function bodyMassIndex(weightKg: number, heightMeters: number): number {
  if (!(heightMeters > 0)) throw new Error('Height must be greater than zero.');
  if (!(weightKg > 0)) throw new Error('Weight must be greater than zero.');
  return weightKg / (heightMeters * heightMeters);
}

export function mifflinStJeorBmrKcal(input: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
}): number {
  const { weightKg, heightCm, ageYears, sex } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  switch (sex) {
    case 'male':
      return base + 5;
    case 'female':
      return base - 161;
    default: {
      const exhaustive: never = sex;
      throw new Error(`Unhandled sex: ${exhaustive}`);
    }
  }
}

export function tdeeFromBmr(bmrKcal: number, activity: ActivityLevel): number {
  return bmrKcal * ACTIVITY_FACTORS[activity].factor;
}

export type CalorieGoal = 'maintain' | 'lose-slow' | 'gain-slow';

export const CALORIE_GOAL_ADJUSTMENTS: Record<CalorieGoal, number> = {
  maintain: 0,
  'lose-slow': -250,
  'gain-slow': 250,
};

export function adjustedDailyCalories(tdeeKcal: number, goal: CalorieGoal): number {
  return tdeeKcal + CALORIE_GOAL_ADJUSTMENTS[goal];
}

export type AdultBmiCategoryId = 'underweight' | 'healthy-weight' | 'overweight' | 'obesity';

export function adultBmiCategory(bmi: number): AdultBmiCategoryId {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'healthy-weight';
  if (bmi < 30) return 'overweight';
  return 'obesity';
}

export function adultBmiCategoryLabel(id: AdultBmiCategoryId): string {
  switch (id) {
    case 'underweight':
      return 'Underweight';
    case 'healthy-weight':
      return 'Healthy weight';
    case 'overweight':
      return 'Overweight';
    case 'obesity':
      return 'Obesity';
    default: {
      const exhaustive: never = id;
      throw new Error(`Unhandled BMI category: ${exhaustive}`);
    }
  }
}

/**
 * U.S. Navy circumference method (Hodgdon & Beckett, 1984), measurements in inches.
 * Male: 86.010 × log10(waist − neck) − 70.041 × log10(height) + 36.76
 * Female: 163.205 × log10(waist + hip − neck) − 97.684 × log10(height) − 78.387
 */
export function navyBodyFatPercent(input: {
  sex: BiologicalSex;
  heightInches: number;
  neckInches: number;
  waistInches: number;
  hipInches?: number;
}): number {
  const { sex, heightInches, neckInches, waistInches, hipInches } = input;
  if (!(heightInches > 0 && neckInches > 0 && waistInches > 0)) {
    throw new Error('Height, neck, and waist must be greater than zero.');
  }
  switch (sex) {
    case 'male': {
      const abdomenMinusNeck = waistInches - neckInches;
      if (abdomenMinusNeck <= 0) throw new Error('Waist must be larger than neck for this estimate.');
      return 86.010 * Math.log10(abdomenMinusNeck) - 70.041 * Math.log10(heightInches) + 36.76;
    }
    case 'female': {
      if (hipInches === undefined || !(hipInches > 0)) {
        throw new Error('Hip measurement is required for the female Navy estimate.');
      }
      const circumference = waistInches + hipInches - neckInches;
      if (circumference <= 0) throw new Error('Waist plus hip must be larger than neck for this estimate.');
      return 163.205 * Math.log10(circumference) - 97.684 * Math.log10(heightInches) - 78.387;
    }
    default: {
      const exhaustive: never = sex;
      throw new Error(`Unhandled sex: ${exhaustive}`);
    }
  }
}
