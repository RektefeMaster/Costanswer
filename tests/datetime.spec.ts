import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  addCalendarMonths,
  addCalendarOffset,
  calendarAge,
  calendarDaysBetween,
  formatDateOnly,
  parseDateOnly,
} from '@/lib/calculations/datetime/calendar';
import { addDurations, shiftWorkedMinutes } from '@/lib/calculations/datetime/duration';
import {
  calculateAge,
  calculateDateDifference,
  calculateDateOffset,
  calculateDaysFromToday,
  calculateTime,
  calculateTimeCard,
} from '@/lib/calculations/everyday';

describe('calendar dates', () => {
  it('keeps selected dates on UTC midnight so DST cannot skip a day', () => {
    const march = parseDateOnly('2026-03-08');
    expect(march.getUTCHours()).toBe(0);
    expect(formatDateOnly(addCalendarDays(march, 1))).toBe('2026-03-09');
    expect(formatDateOnly(addCalendarDays(parseDateOnly('2026-11-01'), 1))).toBe('2026-11-02');
  });

  it('clamps January 31 plus one month instead of overflowing into March', () => {
    expect(formatDateOnly(addCalendarMonths(parseDateOnly('2026-01-31'), 1))).toBe('2026-02-28');
    expect(formatDateOnly(addCalendarMonths(parseDateOnly('2024-01-31'), 1))).toBe('2024-02-29');
    expect(calculateDateOffset({
      startDate: '2026-01-31',
      amount: 1,
      unit: 'months',
      direction: 'after',
    }).value.resultDate).toBe('2026-02-28');
  });

  it('handles leap-day birthdays on the observed February 28', () => {
    const age = calendarAge(parseDateOnly('2020-02-29'), parseDateOnly('2025-03-01'));
    expect(age.years).toBe(5);
    expect(calculateAge({ birthDate: '2020-02-29', asOfDate: '2025-02-28' }).value.years).toBe(5);
    expect(() => calculateAge({ birthDate: '2020-02-29', asOfDate: '2019-02-28' })).toThrow(/before/i);
  });

  it('reports zero days until the next birthday when today is the birthday', () => {
    const age = calendarAge(parseDateOnly('1990-09-12'), parseDateOnly('2026-09-12'));
    expect(age.daysUntilNextBirthday).toBe(0);
    expect(age.nextBirthday).toBe('2026-09-12');
  });

  it('adds years across a leap day by clamping', () => {
    expect(formatDateOnly(addCalendarOffset(parseDateOnly('2024-02-29'), 1, 'years'))).toBe('2025-02-28');
  });

  it('measures the span between two dates accurately', () => {
    expect(calendarDaysBetween(parseDateOnly('2026-01-01'), parseDateOnly('2026-01-31'))).toBe(30);
    const diff = calculateDateDifference({
      startDate: '2026-01-01',
      endDate: '2026-01-15',
    });
    expect(diff.value.totalDays).toBe(14);
    expect(diff.value.weeks).toBe(2);
    expect(diff.value.days).toBe(0);
    expect(diff.value.isNegative).toBe(false);

    const reverseDiff = calculateDateDifference({
      startDate: '2026-01-15',
      endDate: '2026-01-01',
    });
    expect(reverseDiff.value.totalDays).toBe(-14);
    expect(reverseDiff.value.weeks).toBe(2);
    expect(reverseDiff.value.days).toBe(0);
    expect(reverseDiff.value.isNegative).toBe(true);
  });
});

describe('days from today', () => {
  it('uses an injected today instead of the wall clock', () => {
    const result = calculateDaysFromToday(
      { days: 30, direction: 'from-today' },
      () => '2026-09-03',
    );
    expect(result.value.today).toBe('2026-09-03');
    expect(result.value.resultDate).toBe('2026-10-03');
    expect(result.value.weekday).toBe('Saturday');

    const agoResult = calculateDaysFromToday(
      { days: 30, direction: 'ago' },
      () => '2026-09-03',
    );
    expect(agoResult.value.resultDate).toBe('2026-08-04');
  });
});

describe('durations and time cards', () => {
  it('adds 2h 45m + 1h 30m as 4h 15m', () => {
    const sum = addDurations(
      { hours: 2, minutes: 45, seconds: 0 },
      { hours: 1, minutes: 30, seconds: 0 },
    );
    expect(sum).toMatchObject({ hours: 4, minutes: 15, seconds: 0, sign: 1 });
    expect(calculateTime({
      operation: 'add',
      left: { hours: 2, minutes: 45, seconds: 0 },
      right: { hours: 1, minutes: 30, seconds: 0 },
    }).value.display).toBe('4h 15m 0s');
  });

  it('counts 09:00–17:30 minus 30 minutes as 8.0 hours, including overnight', () => {
    expect(shiftWorkedMinutes({ startMinutes: 9 * 60, endMinutes: 17 * 60 + 30, unpaidBreakMinutes: 30 }).decimalHours).toBe(8);
    expect(shiftWorkedMinutes({ startMinutes: 9 * 60, endMinutes: 9 * 60, unpaidBreakMinutes: 0 }).decimalHours).toBe(0);
    const card = calculateTimeCard({
      shifts: [{ id: 'shift-1', start: '09:00', end: '17:30', unpaidBreakMinutes: 30 }],
    });
    expect(card.value.decimalHours).toBe(8);
    const overnight = calculateTimeCard({
      shifts: [{ id: 'night', start: '22:00', end: '06:00', unpaidBreakMinutes: 0 }],
    });
    expect(overnight.value.shifts[0]?.overnight).toBe(true);
    expect(overnight.value.decimalHours).toBe(8);
  });
});
