import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import {
  addCalendarOffset,
  calendarAge,
  formatDateLongUtc,
  formatDateOnly,
  isValidDateOnly,
  parseDateOnly,
  utcTodayDateOnly,
  weekdayNameUtc,
  type DateOffsetUnit,
  type TodayProvider,
} from './datetime/calendar';
import {
  addDurations,
  durationToSeconds,
  formatDuration,
  parseClockToMinutes,
  secondsToDuration,
  shiftWorkedMinutes,
  subtractDurations,
  type DurationParts,
} from './datetime/duration';
import {
  AGE_ENGINE_ID,
  DATE_ENGINE_ID,
  DAYS_FROM_TODAY_ENGINE_ID,
  TIME_CARD_ENGINE_ID,
  TIME_ENGINE_ID,
} from './datetime/version';
import { percentOf } from './math/percentage';
import { cryptoRng, generateRandomNumbers, RANDOM_COUNT_MAX, type Rng } from './math/random';
import { RANDOM_NUMBER_ENGINE_ID, TIP_ENGINE_ID } from './math/version';

const dateSchema = z.string().refine(isValidDateOnly, 'Use a valid date in YYYY-MM-DD format.').refine((value) => {
  const year = Number(value.slice(0, 4));
  return year >= 1900 && year <= 2200;
}, 'Dates must be between 1900 and 2200.');

export const tipInputSchema = z.object({
  billSubtotal: finiteNumber('Bill subtotal', 0, 1_000_000),
  tipPercent: finiteNumber('Tip percent', 0, 100),
  people: finiteNumber('Number of people', 1, 100).refine(Number.isInteger, 'Number of people must be a whole number.'),
  taxAmount: finiteNumber('Tax amount', 0, 1_000_000),
});

export function calculateTip(rawInput: unknown): CalculationResult<{
  tipAmount: number;
  taxAmount: number;
  total: number;
  perPerson: number;
  people: number;
}> {
  const input = tipInputSchema.parse(rawInput);
  const tipAmount = percentOf(input.tipPercent, input.billSubtotal);
  const total = input.billSubtotal + input.taxAmount + tipAmount;
  const perPerson = total / input.people;
  return {
    value: {
      tipAmount: round(tipAmount),
      taxAmount: round(input.taxAmount),
      total: round(total),
      perPerson: round(perPerson),
      people: input.people,
    },
    calculationVersion: TIP_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Tip', value: formatMoney(tipAmount), detail: `${formatNumber(input.tipPercent, { maximumFractionDigits: 2 })}% of ${formatMoney(input.billSubtotal)}` },
      { label: 'Total', value: formatMoney(total), detail: input.taxAmount > 0 ? `Includes ${formatMoney(input.taxAmount)} tax` : 'Subtotal plus tip' },
      { label: 'Each person', value: formatMoney(perPerson), detail: `${input.people} people, even split of the total` },
    ],
    assumptions: [
      'Tip is calculated on the bill subtotal you enter, not automatically on tax.',
      'The split is even. It does not handle separate checks or weighted shares.',
    ],
  };
}

export const ageInputSchema = z.object({
  birthDate: dateSchema,
  asOfDate: dateSchema,
}).superRefine((input, context) => {
  if (parseDateOnly(input.asOfDate) < parseDateOnly(input.birthDate)) {
    context.addIssue({ code: 'custom', message: 'The as-of date cannot be before the birth date.' });
  }
});

export function calculateAge(rawInput: unknown): CalculationResult<{
  years: number;
  months: number;
  days: number;
  totalDays: number;
  nextBirthday: string;
  daysUntilNextBirthday: number;
}> {
  const input = ageInputSchema.parse(rawInput);
  const age = calendarAge(parseDateOnly(input.birthDate), parseDateOnly(input.asOfDate));
  return {
    value: age,
    calculationVersion: AGE_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Completed age', value: `${age.years} years, ${age.months} months, ${age.days} days` },
      { label: 'Total days', value: formatNumber(age.totalDays) },
      { label: 'Next birthday', value: formatDateLongUtc(parseDateOnly(age.nextBirthday)), detail: `${age.daysUntilNextBirthday} day${age.daysUntilNextBirthday === 1 ? '' : 's'}` },
    ],
    assumptions: [
      'Dates are calendar dates in UTC. Local timezone cannot shift the selected day.',
      'A February 29 birthday is observed on February 28 in a non-leap year.',
      'Completed years, months, and days are measured from the last observed birthday.',
    ],
  };
}

const durationPartSchema = z.object({
  hours: finiteNumber('Hours', -10_000, 10_000).refine(Number.isInteger, 'Hours must be a whole number.'),
  minutes: finiteNumber('Minutes', -1_000_000, 1_000_000).refine(Number.isInteger, 'Minutes must be a whole number.'),
  seconds: finiteNumber('Seconds', -1_000_000, 1_000_000).refine(Number.isInteger, 'Seconds must be a whole number.'),
});

export const timeInputSchema = z.object({
  operation: z.enum(['add', 'subtract']),
  left: durationPartSchema,
  right: durationPartSchema,
});

export function calculateTime(rawInput: unknown): CalculationResult<DurationParts & { sign: 1 | -1 | 0; totalSeconds: number; display: string }> {
  const input = timeInputSchema.parse(rawInput);
  const result = input.operation === 'add'
    ? addDurations(input.left, input.right)
    : subtractDurations(input.left, input.right);
  return {
    value: { ...result, display: formatDuration(result) },
    calculationVersion: TIME_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Left duration', value: `${durationToSeconds(input.left)} seconds` },
      { label: 'Right duration', value: `${durationToSeconds(input.right)} seconds` },
      { label: 'Normalized result', value: formatDuration(result) },
    ],
    assumptions: [
      'This is duration arithmetic, not a clock time or a calendar date.',
      'Hours, minutes, and seconds are converted to a signed second total, then normalized.',
      'A negative result means the second duration was larger than the first when subtracting.',
    ],
  };
}

export const randomNumberInputSchema = z.object({
  min: finiteNumber('Minimum', -1_000_000_000, 1_000_000_000),
  max: finiteNumber('Maximum', -1_000_000_000, 1_000_000_000),
  count: finiteNumber('Count', 1, RANDOM_COUNT_MAX).refine(Number.isInteger, 'Count must be a whole number.'),
  integer: z.boolean(),
  unique: z.boolean(),
});

export function calculateRandomNumber(rawInput: unknown, rng: Rng = cryptoRng): CalculationResult<{ values: number[]; integer: boolean; unique: boolean }> {
  const input = randomNumberInputSchema.parse(rawInput);
  const values = generateRandomNumbers({ ...input, rng });
  return {
    value: {
      values: input.integer ? values : values.map((value) => round(value, 6)),
      integer: input.integer,
      unique: input.unique,
    },
    calculationVersion: RANDOM_NUMBER_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Range', value: `${input.min} to ${input.max}` },
      { label: 'Count', value: `${input.count}` },
      { label: 'Mode', value: input.integer ? (input.unique ? 'Unique integers' : 'Integers') : 'Decimals' },
    ],
    assumptions: [
      'This is an ordinary utility generator, not a cryptographic or security device.',
      input.integer ? 'Integer results include both ends of the range.' : 'Decimal results are drawn uniformly from the half-open range [min, max).',
    ],
  };
}

const clockSchema = z.string().regex(/^\d{1,2}:[0-5]\d$/, 'Use a 24-hour time such as 09:00.');

export const timeCardInputSchema = z.object({
  shifts: z.array(z.object({
    id: z.string().min(1),
    start: clockSchema,
    end: clockSchema,
    unpaidBreakMinutes: finiteNumber('Break minutes', 0, 24 * 60).refine(Number.isInteger, 'Break minutes must be a whole number.'),
  })).min(1).max(14),
  hourlyRate: finiteNumber('Hourly rate', 0, 1_000).optional(),
});

export function calculateTimeCard(rawInput: unknown): CalculationResult<{
  shifts: Array<{ id: string; decimalHours: number; overnight: boolean }>;
  totalMinutes: number;
  decimalHours: number;
  grossPay?: number;
}> {
  const input = timeCardInputSchema.parse(rawInput);
  const shifts = input.shifts.map((shift) => {
    const hours = shiftWorkedMinutes({
      startMinutes: parseClockToMinutes(shift.start),
      endMinutes: parseClockToMinutes(shift.end),
      unpaidBreakMinutes: shift.unpaidBreakMinutes,
    });
    return { id: shift.id, ...hours };
  });
  const totalMinutes = shifts.reduce((sum, shift) => sum + shift.workedMinutes, 0);
  const decimalHours = totalMinutes / 60;
  const grossPay = input.hourlyRate === undefined ? undefined : decimalHours * input.hourlyRate;
  return {
    value: {
      shifts: shifts.map((shift) => ({ id: shift.id, decimalHours: round(shift.decimalHours, 2), overnight: shift.overnight })),
      totalMinutes,
      decimalHours: round(decimalHours, 2),
      ...(grossPay === undefined ? {} : { grossPay: round(grossPay) }),
    },
    calculationVersion: TIME_CARD_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      ...shifts.map((shift, index) => ({
        label: `Shift ${index + 1}`,
        value: `${formatNumber(shift.decimalHours, { maximumFractionDigits: 2 })} h`,
        detail: shift.overnight ? 'Overnight shift' : 'Same calendar day',
      })),
      { label: 'Total hours', value: `${formatNumber(decimalHours, { maximumFractionDigits: 2 })} h` },
    ],
    assumptions: [
      'If the end time is not after the start time, the shift is treated as overnight and crosses midnight.',
      'Unpaid break is subtracted from elapsed time. Overtime law is not applied.',
      grossPay === undefined
        ? 'No pay is estimated unless you enter an hourly rate. This is hours worked, not a wage claim.'
        : 'Gross pay, if shown, is hours × the rate you typed, with no overtime, tax, or legal wage rules.',
    ],
  };
}

const offsetUnitSchema = z.enum(['days', 'weeks', 'months', 'years']);

export const dateCalculatorInputSchema = z.object({
  startDate: dateSchema,
  amount: finiteNumber('Amount', 0, 36_500).refine(Number.isInteger, 'Amount must be a whole number.'),
  unit: offsetUnitSchema,
  direction: z.enum(['after', 'before']),
});

export function calculateDateOffset(rawInput: unknown): CalculationResult<{
  resultDate: string;
  weekday: string;
  startDate: string;
  signedAmount: number;
  unit: DateOffsetUnit;
}> {
  const input = dateCalculatorInputSchema.parse(rawInput);
  const signed = input.direction === 'after' ? input.amount : -input.amount;
  const result = addCalendarOffset(parseDateOnly(input.startDate), signed, input.unit);
  const year = result.getUTCFullYear();
  if (year < 1900 || year > 2200) throw new Error('The resulting date must be between 1900 and 2200.');
  const resultDate = formatDateOnly(result);
  return {
    value: {
      resultDate,
      weekday: weekdayNameUtc(result),
      startDate: input.startDate,
      signedAmount: signed,
      unit: input.unit,
    },
    calculationVersion: DATE_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Starting date', value: formatDateLongUtc(parseDateOnly(input.startDate)) },
      { label: 'Offset', value: `${input.direction} ${input.amount} ${input.unit}` },
      { label: 'Result', value: `${weekdayNameUtc(result)}, ${formatDateLongUtc(result)}` },
    ],
    assumptions: [
      'Month and year offsets clamp to the last valid day of the target month. January 31 plus one month is February 28 or 29, not March 3.',
      'This is calendar-date math, not business-day math and not a duration in milliseconds.',
    ],
  };
}

export const daysFromTodayInputSchema = z.object({
  days: finiteNumber('Days', 0, 36_500).refine(Number.isInteger, 'Days must be a whole number.'),
  direction: z.enum(['from-today', 'ago']),
});

export function calculateDaysFromToday(
  rawInput: unknown,
  todayProvider: TodayProvider = utcTodayDateOnly,
): CalculationResult<{
  resultDate: string;
  weekday: string;
  today: string;
  signedDays: number;
}> {
  const input = daysFromTodayInputSchema.parse(rawInput);
  const today = todayProvider();
  if (!isValidDateOnly(today)) throw new Error('Today must be a valid calendar date.');
  const signedDays = input.direction === 'from-today' ? input.days : -input.days;
  const result = addCalendarOffset(parseDateOnly(today), signedDays, 'days');
  const year = result.getUTCFullYear();
  if (year < 1900 || year > 2200) throw new Error('The resulting date must be between 1900 and 2200.');
  return {
    value: {
      resultDate: formatDateOnly(result),
      weekday: weekdayNameUtc(result),
      today,
      signedDays,
    },
    calculationVersion: DAYS_FROM_TODAY_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Today', value: formatDateLongUtc(parseDateOnly(today)) },
      { label: 'Calendar days', value: `${signedDays}` },
      { label: 'Result', value: `${weekdayNameUtc(result)}, ${formatDateLongUtc(result)}` },
    ],
    assumptions: [
      'This tool adds or subtracts whole calendar days from today. It does not skip weekends or holidays.',
      'Today is an injected calendar date so timezone conversion cannot shift the selected day.',
    ],
  };
}

export { AGE_ENGINE_ID, DATE_ENGINE_ID, DAYS_FROM_TODAY_ENGINE_ID, RANDOM_NUMBER_ENGINE_ID, TIME_CARD_ENGINE_ID, TIME_ENGINE_ID, TIP_ENGINE_ID };
export type { Rng, TodayProvider };
