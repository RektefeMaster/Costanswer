const MAX_ABS = 1_000_000_000_000n;

function gcdBig(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}

export type ExactFraction = {
  numerator: bigint;
  denominator: bigint;
};

export function createFraction(numerator: bigint, denominator: bigint): ExactFraction {
  if (denominator === 0n) throw new Error('Denominator cannot be zero.');
  if (abs(numerator) > MAX_ABS || abs(denominator) > MAX_ABS) {
    throw new Error('Fraction parts must stay within ±1,000,000,000,000.');
  }
  if (denominator < 0n) {
    return simplify({ numerator: -numerator, denominator: -denominator });
  }
  return simplify({ numerator, denominator });
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

export function simplify(fraction: ExactFraction): ExactFraction {
  if (fraction.denominator === 0n) throw new Error('Denominator cannot be zero.');
  const divisor = gcdBig(fraction.numerator, fraction.denominator);
  let numerator = fraction.numerator / divisor;
  let denominator = fraction.denominator / divisor;
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  return { numerator, denominator };
}

export function addFractions(left: ExactFraction, right: ExactFraction): ExactFraction {
  return createFraction(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function subtractFractions(left: ExactFraction, right: ExactFraction): ExactFraction {
  return createFraction(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function multiplyFractions(left: ExactFraction, right: ExactFraction): ExactFraction {
  return createFraction(left.numerator * right.numerator, left.denominator * right.denominator);
}

export function divideFractions(left: ExactFraction, right: ExactFraction): ExactFraction {
  if (right.numerator === 0n) throw new Error('Cannot divide by zero.');
  return createFraction(left.numerator * right.denominator, left.denominator * right.numerator);
}

export type MixedNumber = {
  sign: 1 | -1 | 0;
  whole: bigint;
  numerator: bigint;
  denominator: bigint;
};

export function toMixedNumber(fraction: ExactFraction): MixedNumber {
  const simplified = simplify(fraction);
  if (simplified.numerator === 0n) {
    return { sign: 0, whole: 0n, numerator: 0n, denominator: simplified.denominator };
  }
  const sign: 1 | -1 = simplified.numerator < 0n ? -1 : 1;
  const absNum = abs(simplified.numerator);
  return {
    sign,
    whole: absNum / simplified.denominator,
    numerator: absNum % simplified.denominator,
    denominator: simplified.denominator,
  };
}

export function fromMixedNumber(mixed: MixedNumber): ExactFraction {
  const sign = mixed.sign === 0 ? 1n : BigInt(mixed.sign);
  return createFraction(sign * (mixed.whole * mixed.denominator + mixed.numerator), mixed.denominator);
}

export function fractionToDecimal(fraction: ExactFraction): number {
  return Number(fraction.numerator) / Number(fraction.denominator);
}

export function formatFraction(fraction: ExactFraction): string {
  const simplified = simplify(fraction);
  return `${simplified.numerator.toString()}/${simplified.denominator.toString()}`;
}

export function formatMixedNumber(mixed: MixedNumber): string {
  if (mixed.sign === 0 || (mixed.whole === 0n && mixed.numerator === 0n)) return '0';
  const prefix = mixed.sign < 0 ? '−' : '';
  if (mixed.numerator === 0n) return `${prefix}${mixed.whole.toString()}`;
  if (mixed.whole === 0n) return `${prefix}${mixed.numerator.toString()}/${mixed.denominator.toString()}`;
  return `${prefix}${mixed.whole.toString()} ${mixed.numerator.toString()}/${mixed.denominator.toString()}`;
}
