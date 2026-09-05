import { z } from 'zod';
import { finiteNumber, formatNumber, round, type CalculationResult } from './contracts';
import {
  DEFAULT_GPA_SCALE,
  DEFAULT_LETTER_SCALE,
  GPA_ENGINE_ID,
  GRADE_ENGINE_ID,
  gradePointAverage,
  letterForPercent,
  weightedGrade,
} from './education/formulas';

const gradeItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(80),
  scoreEarned: finiteNumber('Score earned', 0, 1_000_000),
  scorePossible: finiteNumber('Score possible', 0.01, 1_000_000),
  weight: finiteNumber('Weight', 0, 1_000),
});

export const gradeInputSchema = z.object({
  items: z.array(gradeItemSchema).min(1).max(30),
});

export function calculateGrade(rawInput: unknown): CalculationResult<{
  percent: number;
  letter: string;
  totalWeight: number;
  scaleNote: string;
}> {
  const input = gradeInputSchema.parse(rawInput);
  const grade = weightedGrade(input.items);
  const letter = letterForPercent(grade.percent);
  return {
    value: {
      percent: round(grade.percent, 2),
      letter,
      totalWeight: round(grade.totalWeight, 2),
      scaleNote: 'A 90 / B 80 / C 70 / D 60, an assumed convenience scale',
    },
    calculationVersion: GRADE_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Weighted grade', value: `${formatNumber(grade.percent, { maximumFractionDigits: 2 })}%` },
      { label: 'Assumed letter', value: letter, detail: 'Not a universal school policy' },
      { label: 'Total weight', value: formatNumber(grade.totalWeight, { maximumFractionDigits: 2 }) },
    ],
    assumptions: [
      'Each item contributes (earned ÷ possible) × its weight, then results are divided by total weight.',
      'The letter is from an assumed 90/80/70/60 scale. Institutions set their own cutoffs.',
      'This is not a transcript and does not apply rounding policies used by a specific school.',
    ],
  };
}

const gpaCourseSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(80),
  grade: z.string().min(1).max(4),
  credits: finiteNumber('Credits', 0.01, 20),
});

export const gpaInputSchema = z.object({
  courses: z.array(gpaCourseSchema).min(1).max(40),
});

export function calculateGpa(rawInput: unknown): CalculationResult<{
  gpa: number;
  qualityPoints: number;
  totalCredits: number;
}> {
  const input = gpaInputSchema.parse(rawInput);
  const result = gradePointAverage(input.courses, DEFAULT_GPA_SCALE);
  return {
    value: {
      gpa: round(result.gpa, 2),
      qualityPoints: round(result.qualityPoints, 2),
      totalCredits: round(result.totalCredits, 2),
    },
    calculationVersion: GPA_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Quality points', value: formatNumber(result.qualityPoints, { maximumFractionDigits: 2 }) },
      { label: 'Credit hours', value: formatNumber(result.totalCredits, { maximumFractionDigits: 2 }) },
      { label: 'GPA', value: formatNumber(result.gpa, { maximumFractionDigits: 2 }), detail: 'Unweighted 4.0 convenience scale' },
    ],
    assumptions: [
      'Default points: A 4.0, A− 3.7, B+ 3.3, B 3.0, and so on down to F 0.0.',
      'This is an unweighted 4.0 convenience scale. It is not every institution’s policy and not “weighted GPA.”',
      'GPA = quality points ÷ credit hours.',
    ],
  };
}

export { DEFAULT_GPA_SCALE, DEFAULT_LETTER_SCALE, GPA_ENGINE_ID, GRADE_ENGINE_ID };
