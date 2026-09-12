import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addFractions, createFraction, formatFraction } from '@/lib/calculations/math/fraction';
import { percentChange, percentOf, percentOff, percentOfWhat, whatPercent } from '@/lib/calculations/math/percentage';
import { generateRandomNumbers } from '@/lib/calculations/math/random';
import { evaluateScientific, SCIENTIFIC_LIMITS } from '@/lib/calculations/math/scientific';
import { calculateFraction, calculatePercentChange, calculatePercentage, calculateScientific } from '@/lib/calculations/math-tools';
import { calculateRandomNumber, calculateTip } from '@/lib/calculations/everyday';

describe('percentage family', () => {
  it('locks 15% of 200 = 30 and the inverse questions', () => {
    expect(percentOf(15, 200)).toBe(30);
    expect(whatPercent(30, 200)).toBe(15);
    expect(percentOfWhat(30, 15)).toBe(200);
    expect(calculatePercentage({ mode: 'percent-of', first: 15, second: 200 }).value.result).toBe(30);
  });

  it('calculates percent off discount correctly', () => {
    expect(percentOff(80, 20)).toEqual({ finalPrice: 64, amountSaved: 16 });
    const result = calculatePercentage({ mode: 'percent-off', first: 20, second: 80 });
    expect(result.value.result).toBe(64);
    expect(result.value.amountSaved).toBe(16);
  });

  it('rejects discount percents above 100%', () => {
    expect(() => percentOff(80, 150)).toThrow(/100/);
    expect(() => calculatePercentage({ mode: 'percent-off', first: 150, second: 80 })).toThrow(/100/);
  });

  it('rejects zero denominators instead of returning Infinity', () => {
    expect(() => calculatePercentage({ mode: 'is-what-percent', first: 10, second: 0 })).toThrow(/zero/i);
    expect(() => calculatePercentage({ mode: 'percent-of-what', first: 10, second: 0 })).toThrow(/zero/i);
  });

  it('locks 80 → 100 as a 25% increase and refuses a zero baseline', () => {
    expect(percentChange(80, 100)).toBe(25);
    expect(calculatePercentChange({ oldValue: 80, newValue: 100 }).value).toEqual({ percent: 25, direction: 'increase' });
    expect(() => calculatePercentChange({ oldValue: 0, newValue: 10 })).toThrow(/zero/i);
  });
});

describe('fractions', () => {
  it('adds 1/2 + 1/3 exactly as 5/6', () => {
    const sum = addFractions(createFraction(1n, 2n), createFraction(1n, 3n));
    expect(formatFraction(sum)).toBe('5/6');
    const result = calculateFraction({
      operation: 'add',
      left: { numerator: 1, denominator: 2 },
      right: { numerator: 1, denominator: 3 },
    });
    expect(`${result.value.numerator}/${result.value.denominator}`).toBe('5/6');
  });

  it('rejects a zero denominator', () => {
    expect(() => createFraction(1n, 0n)).toThrow(/denominator/i);
  });
});

describe('scientific parser', () => {
  const source = readFileSync(new URL('../lib/calculations/math/scientific.ts', import.meta.url), 'utf8');

  it('does not ship eval or Function', () => {
    expect(source).not.toMatch(/\beval\s*\(/);
    expect(source).not.toMatch(/new Function/);
  });

  it('locks order of operations and trig fixtures', () => {
    expect(evaluateScientific('2 + 3 × 4', { angleMode: 'radians' })).toBe(14);
    expect(evaluateScientific('(2 + 3) × 4', { angleMode: 'radians' })).toBe(20);
    expect(evaluateScientific('2(3 + 4)', { angleMode: 'radians' })).toBe(14);
    expect(evaluateScientific('(2 + 3)(4 + 5)', { angleMode: 'radians' })).toBe(45);
    expect(evaluateScientific('2π', { angleMode: 'radians' })).toBeCloseTo(2 * Math.PI, 12);
    expect(evaluateScientific('2e', { angleMode: 'radians' })).toBeCloseTo(2 * Math.E, 12);
    expect(evaluateScientific('2e3', { angleMode: 'radians' })).toBe(2000);
    expect(evaluateScientific('abs(-15)', { angleMode: 'radians' })).toBe(15);
    expect(evaluateScientific('5!', { angleMode: 'radians' })).toBe(120);
    expect(evaluateScientific('sqrt(9)', { angleMode: 'radians' })).toBe(3);
    expect(evaluateScientific('sin(π/2)', { angleMode: 'radians' })).toBeCloseTo(1, 12);
    expect(evaluateScientific('sin(90)', { angleMode: 'degrees' })).toBeCloseTo(1, 12);
    expect(evaluateScientific('1.', { angleMode: 'radians' })).toBe(1);
    expect(calculateScientific({ expression: '2 + 3 * 4', angleMode: 'radians' }).value.result).toBe(14);
    expect(calculateScientific({ expression: '2π', angleMode: 'radians' }).value.result).toBeCloseTo(2 * Math.PI, 6);
  });

  it('rejects 0^0 as undefined', () => {
    expect(() => evaluateScientific('0^0', { angleMode: 'radians' })).toThrow(/undefined/i);
  });

  it('rejects identifiers, host objects, and oversized expressions', () => {
    expect(() => evaluateScientific('window', { angleMode: 'radians' })).toThrow();
    expect(() => evaluateScientific('document', { angleMode: 'radians' })).toThrow();
    expect(() => evaluateScientific('constructor', { angleMode: 'radians' })).toThrow();
    expect(() => evaluateScientific('eval(1)', { angleMode: 'radians' })).toThrow();
    expect(() => evaluateScientific('Function("return 1")()', { angleMode: 'radians' })).toThrow();
    expect(() => evaluateScientific('alert(1)', { angleMode: 'radians' })).toThrow();
    expect(() => evaluateScientific('1'.repeat(SCIENTIFIC_LIMITS.maxExpressionLength + 1), { angleMode: 'radians' })).toThrow(/180/);
    expect(() => evaluateScientific('20!', { angleMode: 'radians' })).toThrow(/18/);
    expect(() => evaluateScientific('2^10000', { angleMode: 'radians' })).toThrow(/exponent/i);
  });
});

describe('random numbers', () => {
  it('uses an injected RNG instead of expecting a lucky draw', () => {
    let cursor = 0;
    const sequence = [0, 0.5, 0.999];
    const rng = () => sequence[cursor++] ?? 0;
    expect(generateRandomNumbers({ min: 1, max: 3, count: 3, integer: true, unique: false, rng })).toEqual([1, 2, 3]);
    const result = calculateRandomNumber({ min: 10, max: 10, count: 2, integer: true, unique: false }, () => 0.4);
    expect(result.value.values).toEqual([10, 10]);
  });

  it('rejects unique counts larger than the integer range', () => {
    expect(() => generateRandomNumbers({
      min: 1,
      max: 2,
      count: 3,
      integer: true,
      unique: true,
      rng: () => 0,
    })).toThrow(/unique/i);
  });

  it('rejects decimal mode when min equals max (empty [min, max) interval)', () => {
    expect(() => generateRandomNumbers({
      min: 5,
      max: 5,
      count: 1,
      integer: false,
      unique: false,
      rng: () => 0.5,
    })).toThrow(/non-empty range/i);
  });

  it('falls back to O(count) unique sampling without allocating the full span', () => {
    const values = generateRandomNumbers({
      min: 0,
      max: 1_000_000,
      count: 5,
      integer: true,
      unique: true,
      rng: () => 0, // pathological: always the same unit interval draw
    });
    expect(values).toHaveLength(5);
    expect(new Set(values).size).toBe(5);
    expect(values.every((value) => value >= 0 && value <= 1_000_000)).toBe(true);
  });
});

describe('tip', () => {
  it('locks $100 at 20% as $20 tip and $120 total', () => {
    const result = calculateTip({ billSubtotal: 100, tipPercent: 20, people: 3, taxAmount: 0 });
    expect(result.value.tipAmount).toBe(20);
    expect(result.value.total).toBe(120);
    expect(result.value.perPerson).toBe(40);
  });
});
