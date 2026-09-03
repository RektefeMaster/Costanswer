export const GRADE_ENGINE_ID = 'grade-v1.0.0' as const;
export const GPA_ENGINE_ID = 'gpa-v1.0.0' as const;
export const SQUARE_FOOTAGE_ENGINE_ID = 'square-footage-v1.0.0' as const;

export type GradeItem = {
  id: string;
  name: string;
  scoreEarned: number;
  scorePossible: number;
  weight: number;
};

export type WeightedGrade = {
  percent: number;
  weightedPoints: number;
  totalWeight: number;
};

export function weightedGrade(items: readonly GradeItem[]): WeightedGrade {
  if (items.length === 0) throw new Error('Add at least one grade item.');
  let weightedPoints = 0;
  let totalWeight = 0;
  for (const item of items) {
    if (!(item.scorePossible > 0)) throw new Error(`“${item.name || 'Item'}” needs a possible score greater than zero.`);
    if (item.weight < 0) throw new Error('Weights cannot be negative.');
    weightedPoints += (item.scoreEarned / item.scorePossible) * item.weight;
    totalWeight += item.weight;
  }
  if (!(totalWeight > 0)) throw new Error('Total weight must be greater than zero.');
  return {
    percent: (weightedPoints / totalWeight) * 100,
    weightedPoints,
    totalWeight,
  };
}

export const DEFAULT_LETTER_SCALE = [
  { letter: 'A', minimum: 90 },
  { letter: 'B', minimum: 80 },
  { letter: 'C', minimum: 70 },
  { letter: 'D', minimum: 60 },
  { letter: 'F', minimum: 0 },
] as const;

export function letterForPercent(percent: number, scale: ReadonlyArray<{ letter: string; minimum: number }> = DEFAULT_LETTER_SCALE): string {
  const ordered = [...scale].sort((left, right) => right.minimum - left.minimum);
  for (const row of ordered) {
    if (percent >= row.minimum) return row.letter;
  }
  return ordered.at(-1)?.letter ?? 'F';
}

export const DEFAULT_GPA_SCALE: Record<string, number> = {
  A: 4,
  'A-': 3.7,
  'B+': 3.3,
  B: 3,
  'B-': 2.7,
  'C+': 2.3,
  C: 2,
  'C-': 1.7,
  'D+': 1.3,
  D: 1,
  F: 0,
};

export type GpaCourse = {
  id: string;
  name: string;
  grade: string;
  credits: number;
};

export function gradePointAverage(
  courses: readonly GpaCourse[],
  scale: Record<string, number> = DEFAULT_GPA_SCALE,
): { gpa: number; qualityPoints: number; totalCredits: number } {
  if (courses.length === 0) throw new Error('Add at least one course.');
  let qualityPoints = 0;
  let totalCredits = 0;
  for (const course of courses) {
    const points = scale[course.grade];
    if (points === undefined) throw new Error(`Grade “${course.grade}” is not on the selected scale.`);
    if (!(course.credits > 0)) throw new Error(`“${course.name || 'Course'}” needs credit hours greater than zero.`);
    qualityPoints += points * course.credits;
    totalCredits += course.credits;
  }
  return {
    gpa: qualityPoints / totalCredits,
    qualityPoints,
    totalCredits,
  };
}
