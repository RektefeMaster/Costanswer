const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;

export type DurationParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

export function durationToSeconds(parts: DurationParts): number {
  return parts.hours * SECONDS_PER_HOUR + parts.minutes * SECONDS_PER_MINUTE + parts.seconds;
}

export function secondsToDuration(totalSeconds: number): DurationParts & { sign: 1 | -1 | 0; totalSeconds: number } {
  if (totalSeconds === 0) {
    return { hours: 0, minutes: 0, seconds: 0, sign: 0, totalSeconds: 0 };
  }
  const sign: 1 | -1 = totalSeconds < 0 ? -1 : 1;
  let remaining = Math.abs(totalSeconds);
  const hours = Math.floor(remaining / SECONDS_PER_HOUR);
  remaining -= hours * SECONDS_PER_HOUR;
  const minutes = Math.floor(remaining / SECONDS_PER_MINUTE);
  const seconds = remaining - minutes * SECONDS_PER_MINUTE;
  return { hours, minutes, seconds, sign, totalSeconds };
}

export function addDurations(left: DurationParts, right: DurationParts): ReturnType<typeof secondsToDuration> {
  return secondsToDuration(durationToSeconds(left) + durationToSeconds(right));
}

export function subtractDurations(left: DurationParts, right: DurationParts): ReturnType<typeof secondsToDuration> {
  return secondsToDuration(durationToSeconds(left) - durationToSeconds(right));
}

export function formatDuration(parts: ReturnType<typeof secondsToDuration>): string {
  const prefix = parts.sign < 0 ? '−' : '';
  return `${prefix}${parts.hours}h ${parts.minutes}m ${parts.seconds}s`;
}

export function parseClockToMinutes(value: string): number {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) throw new Error('Use a valid 24-hour time such as 09:00.');
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23) throw new Error('Hours must be between 0 and 23.');
  return hours * 60 + minutes;
}

export function formatMinutesAsClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export type TimeCardShift = {
  startMinutes: number;
  endMinutes: number;
  unpaidBreakMinutes: number;
};

export type TimeCardShiftHours = {
  workedMinutes: number;
  decimalHours: number;
  overnight: boolean;
};

export function shiftWorkedMinutes(shift: TimeCardShift): TimeCardShiftHours {
  if (shift.unpaidBreakMinutes < 0) throw new Error('Break minutes cannot be negative.');
  let elapsed = shift.endMinutes - shift.startMinutes;
  const overnight = elapsed <= 0;
  if (overnight) elapsed += 24 * 60;
  const workedMinutes = elapsed - shift.unpaidBreakMinutes;
  if (workedMinutes < 0) throw new Error('Unpaid break cannot be longer than the shift.');
  return {
    workedMinutes,
    decimalHours: workedMinutes / 60,
    overnight,
  };
}
