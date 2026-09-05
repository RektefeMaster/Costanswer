import { describe, expect, it } from 'vitest';
import { ACTIVITY_FACTORS, bodyMassIndex, mifflinStJeorBmrKcal, navyBodyFatPercent, tdeeFromBmr } from '@/lib/calculations/health/formulas';
import { calculateBmi, calculateBmr, calculateBodyFat, calculateCalorie, calculateTdee } from '@/lib/calculations/health';
import { round } from '@/lib/calculations/contracts';

describe('health engine', () => {
  it('locks the adult BMI fixture at 70 kg / 1.75 m', () => {
    const independent = 70 / (1.75 * 1.75);
    expect(independent).toBeCloseTo(22.86, 2);
    expect(bodyMassIndex(70, 1.75)).toBe(independent);
    const result = calculateBmi({ unitSystem: 'metric', weight: 70, height: 175 });
    expect(result.value.bmi).toBe(22.86);
    expect(result.calculationVersion).toBe('bmi-v1.0.0');
    expect(result.datasetSnapshotIds).toEqual([]);
    expect(result.value.adultCategoryLabel).toBe('Healthy weight');
  });

  it('uses Mifflin–St Jeor for the documented male fixture', () => {
    const independent = 10 * 80 + 6.25 * 180 - 5 * 30 + 5;
    expect(independent).toBe(1780);
    expect(mifflinStJeorBmrKcal({ weightKg: 80, heightCm: 180, ageYears: 30, sex: 'male' })).toBe(1780);
    const result = calculateBmr({
      unitSystem: 'metric',
      sex: 'male',
      ageYears: 30,
      weight: 80,
      height: 180,
      activity: 'sedentary',
    });
    expect(result.value.bmrKcal).toBe(1780);
    expect(result.calculationVersion).toBe('bmr-v1.0.0');
  });

  it('reuses BMR for TDEE and calorie maintenance', () => {
    expect(ACTIVITY_FACTORS.sedentary.factor).toBe(1.2);
    expect(tdeeFromBmr(1780, 'sedentary')).toBe(2136);
    const input = {
      unitSystem: 'metric' as const,
      sex: 'male' as const,
      ageYears: 30,
      weight: 80,
      height: 180,
      activity: 'sedentary' as const,
    };
    expect(calculateTdee(input).value.tdeeKcal).toBe(2136);
    const calorie = calculateCalorie({ ...input, goal: 'maintain' });
    expect(calorie.value.maintenanceKcal).toBe(2136);
    expect(calorie.value.goalKcal).toBe(2136);
    expect(calculateCalorie({ ...input, goal: 'lose-slow' }).value.goalKcal).toBe(1886);
  });

  it('estimates Navy circumference body fat from inches', () => {
    const independent = 86.010 * Math.log10(34 - 16) - 70.041 * Math.log10(70) + 36.76;
    expect(navyBodyFatPercent({ sex: 'male', heightInches: 70, neckInches: 16, waistInches: 34 })).toBeCloseTo(independent, 10);
    const result = calculateBodyFat({
      unitSystem: 'us',
      sex: 'male',
      height: 70,
      neck: 16,
      waist: 34,
    });
    expect(result.value.bodyFatPercent).toBe(round(independent, 1));
    expect(result.calculationVersion).toBe('body-fat-v1.0.0');

    const metricResult = calculateBodyFat({
      unitSystem: 'metric',
      sex: 'male',
      height: 70 * 2.54,
      neck: 16 * 2.54,
      waist: 34 * 2.54,
    });
    expect(metricResult.value.bodyFatPercent).toBe(result.value.bodyFatPercent);
  });

  it('rejects measurements the Navy equations cannot use', () => {
    expect(() => calculateBodyFat({
      unitSystem: 'us',
      sex: 'male',
      height: 70,
      neck: 34,
      waist: 34,
    })).toThrow(/waist/i);
  });
});
