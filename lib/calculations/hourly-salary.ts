import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';

export const hourlySalaryInputSchema = z.object({
  hourlyRate: finiteNumber('Hourly rate', 0.01, 10_000),
  regularHoursPerWeek: finiteNumber('Regular hours per week', 0, 168),
  overtimeHoursPerWeek: finiteNumber('Overtime hours per week', 0, 168),
  overtimeMultiplier: finiteNumber('Overtime multiplier', 1, 3),
  weeksPerYear: finiteNumber('Weeks per year', 1, 53),
}).refine(
  (input) => input.regularHoursPerWeek + input.overtimeHoursPerWeek <= 168,
  { message: 'Regular and overtime hours cannot exceed 168 hours per week.' },
);

export type HourlySalaryInput = z.infer<typeof hourlySalaryInputSchema>;

export type HourlySalaryValue = {
  annual: number;
  monthly: number;
  semimonthly: number;
  biweekly: number;
  weekly: number;
  regularAnnual: number;
  overtimeAnnual: number;
};

export function calculateHourlySalary(rawInput: unknown): CalculationResult<HourlySalaryValue> {
  const input = hourlySalaryInputSchema.parse(rawInput);
  const regularWeekly = input.hourlyRate * input.regularHoursPerWeek;
  const overtimeWeekly = input.hourlyRate * input.overtimeMultiplier * input.overtimeHoursPerWeek;
  const weekly = regularWeekly + overtimeWeekly;
  const regularAnnual = regularWeekly * input.weeksPerYear;
  const overtimeAnnual = overtimeWeekly * input.weeksPerYear;
  const annual = regularAnnual + overtimeAnnual;

  return {
    value: {
      annual: round(annual),
      monthly: round(annual / 12),
      semimonthly: round(annual / 24),
      biweekly: round(annual / 26),
      weekly: round(weekly),
      regularAnnual: round(regularAnnual),
      overtimeAnnual: round(overtimeAnnual),
    },
    calculationVersion: 'compensation-v1.1.0',
    datasetSnapshotIds: [],
    breakdown: [
      {
        label: 'Regular weekly pay',
        value: formatMoney(regularWeekly),
        detail: `${input.regularHoursPerWeek} hours × ${formatMoney(input.hourlyRate)}`,
      },
      {
        label: 'Overtime weekly pay',
        value: formatMoney(overtimeWeekly),
        detail: `${input.overtimeHoursPerWeek} hours × ${input.overtimeMultiplier}× rate`,
      },
      {
        label: 'Annual gross pay',
        value: formatMoney(annual),
        detail: `${formatMoney(weekly)} × ${input.weeksPerYear} weeks`,
      },
    ],
    assumptions: [
      'This is pay before taxes, benefits, unpaid time off, or deductions.',
      'Overtime uses only the hours you mark as overtime.',
      'This does not say whether you are legally eligible for overtime.',
    ],
  };
}
