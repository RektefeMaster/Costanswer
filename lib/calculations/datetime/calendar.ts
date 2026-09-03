export const DAY_MS = 86_400_000;
export const DATE_YEAR_MIN = 1900;
export const DATE_YEAR_MAX = 2200;

export type CalendarYmd = {
  year: number;
  month: number;
  day: number;
};

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ymdFromDate(date: Date): CalendarYmd {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function dateFromYmd(ymd: CalendarYmd): Date {
  return new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day));
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateOnly(value);
  return Number.isFinite(date.getTime()) && formatDateOnly(date) === value;
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addCalendarDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * DAY_MS);
}

export function weekdayNameUtc(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(date);
}

export function formatDateLongUtc(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

/**
 * Calendar month arithmetic with end-of-month clamping.
 * January 31 + 1 month → February 28 (or 29 in a leap year), never March 3.
 */
export function addCalendarMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const day = date.getUTCDate();
  const absolute = year * 12 + monthIndex + months;
  const targetYear = Math.floor(absolute / 12);
  const targetMonthIndex = ((absolute % 12) + 12) % 12;
  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonthIndex + 1));
  return new Date(Date.UTC(targetYear, targetMonthIndex, clampedDay));
}

export function addCalendarYears(date: Date, years: number): Date {
  return addCalendarMonths(date, years * 12);
}

export type DateOffsetUnit = 'days' | 'weeks' | 'months' | 'years';

export function addCalendarOffset(date: Date, amount: number, unit: DateOffsetUnit): Date {
  switch (unit) {
    case 'days':
      return addCalendarDays(date, amount);
    case 'weeks':
      return addCalendarDays(date, amount * 7);
    case 'months':
      return addCalendarMonths(date, amount);
    case 'years':
      return addCalendarYears(date, amount);
    default: {
      const exhaustive: never = unit;
      throw new Error(`Unhandled date offset unit: ${exhaustive}`);
    }
  }
}

/**
 * In a non-leap year, a February 29 birthday is observed on February 28
 * for completed-year counting.
 */
export function anniversaryInYear(birth: Date, year: number): Date {
  const monthIndex = birth.getUTCMonth();
  const day = birth.getUTCDate();
  if (monthIndex === 1 && day === 29 && !isLeapYear(year)) {
    return new Date(Date.UTC(year, 1, 28));
  }
  return new Date(Date.UTC(year, monthIndex, day));
}

export type CalendarAge = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  nextBirthday: string;
  daysUntilNextBirthday: number;
};

export function calendarAge(birth: Date, asOf: Date): CalendarAge {
  if (asOf < birth) {
    throw new Error('The as-of date cannot be before the birth date.');
  }

  let years = asOf.getUTCFullYear() - birth.getUTCFullYear();
  let lastAnniversary = anniversaryInYear(birth, asOf.getUTCFullYear());
  if (asOf < lastAnniversary) {
    years -= 1;
    lastAnniversary = anniversaryInYear(birth, asOf.getUTCFullYear() - 1);
  }

  let months = 0;
  let cursor = lastAnniversary;
  while (true) {
    const next = addCalendarMonths(cursor, 1);
    if (next > asOf) break;
    months += 1;
    cursor = next;
  }

  const days = Math.round((asOf.getTime() - cursor.getTime()) / DAY_MS);
  const totalDays = Math.round((asOf.getTime() - birth.getTime()) / DAY_MS);
  const nextBirthdayDate = asOf < anniversaryInYear(birth, asOf.getUTCFullYear())
    ? anniversaryInYear(birth, asOf.getUTCFullYear())
    : anniversaryInYear(birth, asOf.getUTCFullYear() + 1);
  const daysUntilNextBirthday = Math.round((nextBirthdayDate.getTime() - asOf.getTime()) / DAY_MS);

  return {
    years,
    months,
    days,
    totalDays,
    nextBirthday: formatDateOnly(nextBirthdayDate),
    daysUntilNextBirthday,
  };
}

export type TodayProvider = () => string;

export function utcTodayDateOnly(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
