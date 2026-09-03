import { z } from 'zod';
import { finiteNumber, type CalculationResult } from './contracts';
import { addCalendarDays, DAY_MS, formatDateOnly, isValidDateOnly, parseDateOnly } from './datetime/calendar';

export { parseDateOnly, formatDateOnly };

function isInSupportedYear(value: string): boolean {
  const year = Number(value.slice(0, 4));
  return year >= 1900 && year <= 2200;
}

export const businessDateSchema = z.string().refine(
  isValidDateOnly,
  'Use a valid date in YYYY-MM-DD format.',
).refine(isInSupportedYear, 'Dates must be between 1900 and 2200.');

export const businessDaysBetweenInputSchema = z.object({
  startDate: businessDateSchema,
  endDate: businessDateSchema,
  includeStart: z.boolean(),
  includeEnd: z.boolean(),
  excludeFederalHolidays: z.boolean(),
}).superRefine((input, context) => {
  if (input.excludeFederalHolidays && (Number(input.startDate.slice(0, 4)) < 1971 || Number(input.endDate.slice(0, 4)) < 1971)) {
    context.addIssue({ code: 'custom', message: 'Federal holidays in this calculator start in 1971.' });
  }
  const spanDays = Math.abs(parseDateOnly(input.endDate).getTime() - parseDateOnly(input.startDate).getTime()) / 86_400_000;
  if (spanDays > 36_600) context.addIssue({ code: 'custom', message: 'Date ranges cannot exceed 100 years.' });
});

export const addBusinessDaysInputSchema = z.object({
  startDate: businessDateSchema,
  businessDays: finiteNumber('Business days', -10_000, 10_000).refine(Number.isInteger, 'Business days must be a whole number.'),
  excludeFederalHolidays: z.boolean(),
}).superRefine((input, context) => {
  if (input.excludeFederalHolidays && Number(input.startDate.slice(0, 4)) < 1971) {
    context.addIssue({ code: 'custom', message: 'Federal holidays in this calculator start in 1971.' });
  }
});

export type BusinessDaysBetweenInput = z.infer<typeof businessDaysBetweenInputSchema>;
export type AddBusinessDaysInput = z.infer<typeof addBusinessDaysInputSchema>;

function observedFixedHoliday(year: number, monthIndex: number, day: number): Date {
  const holiday = new Date(Date.UTC(year, monthIndex, day));
  if (holiday.getUTCDay() === 6) return addCalendarDays(holiday, -1);
  if (holiday.getUTCDay() === 0) return addCalendarDays(holiday, 1);
  return holiday;
}

function nthWeekday(year: number, monthIndex: number, weekday: number, nth: number): Date {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, monthIndex, 1 + offset + (nth - 1) * 7));
}

function lastWeekday(year: number, monthIndex: number, weekday: number): Date {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return addCalendarDays(last, -offset);
}

export function federalHolidaySet(startYear: number, endYear: number): Set<string> {
  const holidays = new Set<string>();
  for (let year = startYear - 1; year <= endYear + 1; year += 1) {
    const dates = [
      observedFixedHoliday(year, 0, 1),
      nthWeekday(year, 1, 1, 3),
      lastWeekday(year, 4, 1),
      observedFixedHoliday(year, 6, 4),
      nthWeekday(year, 8, 1, 1),
      nthWeekday(year, 9, 1, 2),
      nthWeekday(year, 10, 4, 4),
      observedFixedHoliday(year, 11, 25),
    ];
    // Veterans Day used the fourth Monday in October from 1971 through 1977.
    if (year >= 1971 && year <= 1977) dates.push(nthWeekday(year, 9, 1, 4));
    else if (year >= 1978) dates.push(observedFixedHoliday(year, 10, 11));
    // Martin Luther King Jr. Day was first observed federally in 1986.
    if (year >= 1986) dates.push(nthWeekday(year, 0, 1, 3));
    // Juneteenth became a federal holiday in 2021; do not project it backward.
    if (year >= 2021) dates.push(observedFixedHoliday(year, 5, 19));
    dates.forEach((date) => holidays.add(formatDateOnly(date)));
  }
  return holidays;
}

function isBusinessDay(date: Date, holidays: Set<string>): boolean {
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(formatDateOnly(date));
}

export type BusinessDaysBetweenValue = {
  businessDays: number;
  calendarDays: number;
  weekendDays: number;
  federalHolidays: number;
  direction: 'forward' | 'backward' | 'same-day';
};

export function calculateBusinessDaysBetween(rawInput: unknown): CalculationResult<BusinessDaysBetweenValue> {
  const input = businessDaysBetweenInputSchema.parse(rawInput);
  const start = parseDateOnly(input.startDate);
  const end = parseDateOnly(input.endDate);
  const direction = end > start ? 1 : end < start ? -1 : 0;
  const earlier = direction >= 0 ? start : end;
  const later = direction >= 0 ? end : start;
  const holidays = input.excludeFederalHolidays
    ? federalHolidaySet(earlier.getUTCFullYear(), later.getUTCFullYear())
    : new Set<string>();

  let businessDays = 0;
  let weekendDays = 0;
  let federalHolidays = 0;
  for (let date = earlier; date <= later; date = addCalendarDays(date, 1)) {
    const isOriginalStart = formatDateOnly(date) === input.startDate;
    const isOriginalEnd = formatDateOnly(date) === input.endDate;
    const sameEndpoint = isOriginalStart && isOriginalEnd;
    if (sameEndpoint ? (!input.includeStart && !input.includeEnd) : ((isOriginalStart && !input.includeStart) || (isOriginalEnd && !input.includeEnd))) continue;

    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) weekendDays += 1;
    else if (holidays.has(formatDateOnly(date))) federalHolidays += 1;
    else businessDays += 1;
  }

  const signedBusinessDays = direction < 0 ? -businessDays : businessDays;
  const calendarDays = Math.round((later.getTime() - earlier.getTime()) / DAY_MS);

  return {
    value: {
      businessDays: signedBusinessDays,
      calendarDays,
      weekendDays,
      federalHolidays,
      direction: direction > 0 ? 'forward' : direction < 0 ? 'backward' : 'same-day',
    },
    calculationVersion: 'calendar-v1.0.0',
    datasetSnapshotIds: input.excludeFederalHolidays ? ['opm-federal-holiday-rules-2026-09'] : [],
    breakdown: [
      { label: 'Calendar-day span', value: `${calendarDays} days`, detail: 'Elapsed days between the two dates' },
      { label: 'Weekend days excluded', value: `${weekendDays}`, detail: 'Saturday and Sunday' },
      { label: 'Federal holidays excluded', value: `${federalHolidays}`, detail: input.excludeFederalHolidays ? 'Observed U.S. federal holidays' : 'Holiday exclusion is off' },
    ],
    assumptions: [
      'Saturday and Sunday are not counted as workdays.',
      'Federal holidays follow the usual observed federal schedule. Private, state, and local calendars can differ.',
      'The start and end date choices in the form are used as you set them.',
    ],
  };
}

export type AddBusinessDaysValue = {
  resultDate: string;
  calendarDaysMoved: number;
};

export function addBusinessDays(rawInput: unknown): CalculationResult<AddBusinessDaysValue> {
  const input = addBusinessDaysInputSchema.parse(rawInput);
  const start = parseDateOnly(input.startDate);
  const direction = Math.sign(input.businessDays);
  const holidayYearSpan = Math.ceil(Math.abs(input.businessDays) / 240) + 2;
  const holidays = input.excludeFederalHolidays
    ? federalHolidaySet(start.getUTCFullYear() - holidayYearSpan, start.getUTCFullYear() + holidayYearSpan)
    : new Set<string>();
  let date = start;
  let counted = 0;
  let calendarDaysMoved = 0;

  while (counted < Math.abs(input.businessDays)) {
    date = addCalendarDays(date, direction);
    if (date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2200) {
      throw new Error('The resulting date must be between 1900 and 2200.');
    }
    if (input.excludeFederalHolidays && date.getUTCFullYear() < 1971) {
      throw new Error('Federal holidays in this calculator start in 1971.');
    }
    calendarDaysMoved += direction;
    if (isBusinessDay(date, holidays)) counted += 1;
  }

  return {
    value: { resultDate: formatDateOnly(date), calendarDaysMoved },
    calculationVersion: 'calendar-v1.0.0',
    datasetSnapshotIds: input.excludeFederalHolidays ? ['opm-federal-holiday-rules-2026-09'] : [],
    breakdown: [
      { label: 'Starting date', value: input.startDate },
      { label: 'Business days moved', value: `${input.businessDays}` },
      { label: 'Calendar days moved', value: `${calendarDaysMoved}` },
    ],
    assumptions: [
      'The starting date is not counted as day one.',
      'Saturday and Sunday are not counted as workdays.',
      'Federal holidays follow the usual observed federal schedule from 1971 on, including future years with the current rules.',
    ],
  };
}
