import { describe, expect, it } from 'vitest';
import { DEFAULT_GPA_SCALE, gradePointAverage, weightedGrade } from '@/lib/calculations/education/formulas';
import { calculateGpa, calculateGrade } from '@/lib/calculations/education';

describe('education engine', () => {
  it('weights earned/possible by category weight', () => {
    const grade = weightedGrade([
      { id: 'hw', name: 'Homework', scoreEarned: 90, scorePossible: 100, weight: 20 },
      { id: 'exam', name: 'Exam', scoreEarned: 85, scorePossible: 100, weight: 80 },
    ]);
    expect(grade.percent).toBe(86);
    expect(calculateGrade({
      items: [
        { id: 'hw', name: 'Homework', scoreEarned: 90, scorePossible: 100, weight: 20 },
        { id: 'exam', name: 'Exam', scoreEarned: 85, scorePossible: 100, weight: 80 },
      ],
    }).value.letter).toBe('B');
  });

  it('locks A/3 + B/3 on the default 4.0 scale as 3.5 GPA', () => {
    expect(DEFAULT_GPA_SCALE.A).toBe(4);
    expect(DEFAULT_GPA_SCALE.B).toBe(3);
    const gpa = gradePointAverage([
      { id: 'a', name: 'Course A', grade: 'A', credits: 3 },
      { id: 'b', name: 'Course B', grade: 'B', credits: 3 },
    ]);
    expect(gpa.gpa).toBe(3.5);
    expect(calculateGpa({
      courses: [
        { id: 'a', name: 'Course A', grade: 'A', credits: 3 },
        { id: 'b', name: 'Course B', grade: 'B', credits: 3 },
      ],
    }).value.gpa).toBe(3.5);
  });
});
