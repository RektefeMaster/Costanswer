import { z } from 'zod';
import { finiteNumber, formatNumber, round, type CalculationResult } from './contracts';
import {
  addFractions,
  createFraction,
  divideFractions,
  formatFraction,
  formatMixedNumber,
  fractionToDecimal,
  multiplyFractions,
  subtractFractions,
  toMixedNumber,
  type ExactFraction,
} from './math/fraction';
import { percentChange, percentOf, percentOff, percentOfWhat, whatPercent } from './math/percentage';
import { evaluateScientific, type AngleMode } from './math/scientific';
import {
  FRACTION_ENGINE_ID,
  PERCENT_CHANGE_ENGINE_ID,
  PERCENTAGE_ENGINE_ID,
  SCIENTIFIC_ENGINE_ID,
} from './math/version';

const percentageModeSchema = z.enum(['percent-of', 'is-what-percent', 'percent-of-what', 'percent-off']);

export const percentageInputSchema = z.object({
  mode: percentageModeSchema,
  first: finiteNumber('First value', -1_000_000_000, 1_000_000_000),
  second: finiteNumber('Second value', -1_000_000_000, 1_000_000_000),
});

export function calculatePercentage(rawInput: unknown): CalculationResult<{
  result: number;
  mode: z.infer<typeof percentageModeSchema>;
  amountSaved?: number;
}> {
  const input = percentageInputSchema.parse(rawInput);
  let result: number;
  let detail: string;
  let amountSaved: number | undefined;
  switch (input.mode) {
    case 'percent-of':
      result = percentOf(input.first, input.second);
      detail = `${formatNumber(input.first, { maximumFractionDigits: 4 })}% of ${formatNumber(input.second, { maximumFractionDigits: 4 })}`;
      break;
    case 'is-what-percent':
      result = whatPercent(input.first, input.second);
      detail = `${formatNumber(input.first, { maximumFractionDigits: 4 })} is what percent of ${formatNumber(input.second, { maximumFractionDigits: 4 })}`;
      break;
    case 'percent-of-what':
      result = percentOfWhat(input.first, input.second);
      detail = `${formatNumber(input.first, { maximumFractionDigits: 4 })} is ${formatNumber(input.second, { maximumFractionDigits: 4 })}% of what`;
      break;
    case 'percent-off': {
      const discount = percentOff(input.second, input.first);
      result = discount.finalPrice;
      amountSaved = discount.amountSaved;
      detail = `${formatNumber(input.first, { maximumFractionDigits: 4 })}% off ${formatNumber(input.second, { maximumFractionDigits: 4 })}`;
      break;
    }
    default: {
      const exhaustive: never = input.mode;
      throw new Error(`Unhandled percentage mode: ${exhaustive}`);
    }
  }
  if (!Number.isFinite(result)) throw new Error('This percentage operation is not defined for these numbers.');
  return {
    value: {
      result: round(result, 6),
      mode: input.mode,
      ...(amountSaved !== undefined ? { amountSaved: round(amountSaved, 6) } : {}),
    },
    calculationVersion: PERCENTAGE_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Operation', value: detail },
      ...(amountSaved !== undefined ? [{ label: 'Amount saved', value: formatNumber(amountSaved, { maximumFractionDigits: 2 }) }] : []),
      { label: input.mode === 'percent-off' ? 'Final sale price' : 'Result', value: formatNumber(result, { maximumFractionDigits: 6 }) },
    ],
    assumptions: [
      'Percent of: (percent ÷ 100) × base.',
      'What percent: part ÷ whole × 100. A zero whole is rejected.',
      'Percent of what: part ÷ (percent ÷ 100). A zero percent is rejected.',
      'Percent off: discount cannot exceed 100%.',
    ],
  };
}

export const percentChangeInputSchema = z.object({
  oldValue: finiteNumber('Original value', -1_000_000_000, 1_000_000_000),
  newValue: finiteNumber('New value', -1_000_000_000, 1_000_000_000),
});

export function calculatePercentChange(rawInput: unknown): CalculationResult<{
  percent: number;
  direction: 'increase' | 'decrease' | 'unchanged';
}> {
  const input = percentChangeInputSchema.parse(rawInput);
  const percent = percentChange(input.oldValue, input.newValue);
  const direction = percent > 0 ? 'increase' : percent < 0 ? 'decrease' : 'unchanged';
  return {
    value: { percent: round(percent, 4), direction },
    calculationVersion: PERCENT_CHANGE_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Original', value: formatNumber(input.oldValue, { maximumFractionDigits: 6 }) },
      { label: 'New', value: formatNumber(input.newValue, { maximumFractionDigits: 6 }) },
      { label: 'Percent change', value: `${formatNumber(percent, { maximumFractionDigits: 4 })}%`, detail: '(new − original) ÷ |original| × 100' },
    ],
    assumptions: [
      'Percent change uses the absolute value of the original number in the denominator.',
      'A zero original value is not a defined percent change.',
    ],
  };
}

export const scientificInputSchema = z.object({
  expression: z.string().min(1, 'Enter an expression.').max(180, 'Expressions cannot be longer than 180 characters.'),
  angleMode: z.enum(['radians', 'degrees']),
});

export function calculateScientific(rawInput: unknown): CalculationResult<{ result: number; expression: string; angleMode: AngleMode }> {
  const input = scientificInputSchema.parse(rawInput);
  const result = evaluateScientific(input.expression, { angleMode: input.angleMode });
  return {
    value: { result, expression: input.expression, angleMode: input.angleMode },
    calculationVersion: SCIENTIFIC_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Expression', value: input.expression },
      { label: 'Angle mode', value: input.angleMode },
      { label: 'Result', value: formatNumber(result, { maximumFractionDigits: 10 }) },
    ],
    assumptions: [
      'The evaluator is a bounded parser. It does not run JavaScript.',
      'sin, cos, and tan use the selected angle mode. log is base 10. ln is natural log.',
      'Factorial is limited to whole numbers through 18.',
    ],
  };
}

const integerPart = finiteNumber('Fraction part', -1_000_000_000_000, 1_000_000_000_000).refine(Number.isInteger, 'Use whole numbers for fraction parts.');

const fractionLiteralSchema = z.object({
  numerator: integerPart,
  denominator: integerPart,
});

export const fractionInputSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'simplify']),
  left: fractionLiteralSchema,
  right: fractionLiteralSchema,
});

function asExact(parts: { numerator: number; denominator: number }): ExactFraction {
  return createFraction(BigInt(parts.numerator), BigInt(parts.denominator));
}

export function calculateFraction(rawInput: unknown): CalculationResult<{
  numerator: string;
  denominator: string;
  mixed: string;
  decimal: number;
}> {
  const input = fractionInputSchema.parse(rawInput);
  const left = asExact(input.left);
  const right = asExact(input.right);
  let result: ExactFraction;
  switch (input.operation) {
    case 'add':
      result = addFractions(left, right);
      break;
    case 'subtract':
      result = subtractFractions(left, right);
      break;
    case 'multiply':
      result = multiplyFractions(left, right);
      break;
    case 'divide':
      result = divideFractions(left, right);
      break;
    case 'simplify':
      result = left;
      break;
    default: {
      const exhaustive: never = input.operation;
      throw new Error(`Unhandled fraction operation: ${exhaustive}`);
    }
  }
  const mixed = toMixedNumber(result);
  const decimal = fractionToDecimal(result);
  if (!Number.isFinite(decimal)) throw new Error('This fraction cannot be displayed as a decimal.');
  return {
    value: {
      numerator: result.numerator.toString(),
      denominator: result.denominator.toString(),
      mixed: formatMixedNumber(mixed),
      decimal: round(decimal, 8),
    },
    calculationVersion: FRACTION_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Exact result', value: formatFraction(result) },
      { label: 'Mixed number', value: formatMixedNumber(mixed) },
      { label: 'Decimal', value: formatNumber(decimal, { maximumFractionDigits: 8 }) },
    ],
    assumptions: [
      'Arithmetic uses exact integer numerators and denominators, then simplifies with GCD.',
      'Simplify uses the left fraction. The right fraction is ignored for that operation.',
    ],
  };
}

export { FRACTION_ENGINE_ID, PERCENT_CHANGE_ENGINE_ID, PERCENTAGE_ENGINE_ID, SCIENTIFIC_ENGINE_ID };
