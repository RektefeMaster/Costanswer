import { describe, expect, it } from 'vitest';
import { parseNumericBound, stepDecimals, stepNumberValue } from '@/lib/number-step';

describe('number steppers', () => {
  it('adds and subtracts by the field step without floating-point residue', () => {
    expect(stepNumberValue('28', 1, 0.1, 1)).toBe('28.1');
    expect(stepNumberValue('28.1', -1, 0.1, 1)).toBe('28');
    expect(stepNumberValue('15.94', 1, 0.01)).toBe('15.95');
    expect(stepNumberValue('12000', 1, 100, 0)).toBe('12100');
  });

  it('starts empty fields from min or step, and leaves empty values alone when decreasing', () => {
    expect(stepNumberValue('', 1, 0.01, 0)).toBe('0.01');
    expect(stepNumberValue('', 1, 0.1, 1)).toBe('1');
    expect(stepNumberValue('', -1, 0.01, 0)).toBe('');
  });

  it('starts empty fields from a numeric placeholder when one is provided', () => {
    expect(stepNumberValue('', 1, 0.01, 0, undefined, 15.94)).toBe('15.95');
    expect(stepNumberValue('', -1, 0.01, 0, undefined, 15.94)).toBe('15.93');
  });

  it('clamps to min and max', () => {
    expect(stepNumberValue('1', -1, 1, 1, 30)).toBe('1');
    expect(stepNumberValue('30', 1, 1, 0, 30)).toBe('30');
    expect(stepNumberValue('12', 1, 1, 0, 30)).toBe('13');
  });

  it('parses numeric bounds and decimal places from step values', () => {
    expect(parseNumericBound('0.01')).toBe(0.01);
    expect(parseNumericBound('any')).toBeUndefined();
    expect(stepDecimals(0.01)).toBe(2);
    expect(stepDecimals(1)).toBe(0);
  });
});
