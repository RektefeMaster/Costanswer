/**
 * Money inside the monetization layer.
 *
 * The calculation engines work in dollars as floats and round at the edge,
 * which is correct for an estimate someone reads. A revenue ledger is not an
 * estimate: it is added up, reconciled against a provider statement, and
 * reversed. Half a cent of drift per row is a reconciliation that never
 * balances, so money here is an integer count of minor units and never leaves
 * that form until it is formatted for a screen.
 */
export type CurrencyCode = 'USD';

export type Money = {
  /** Integer minor units. 1234 is $12.34. Never a float. */
  readonly minorUnits: number;
  readonly currency: CurrencyCode;
};

const MINOR_UNITS_PER_MAJOR: Record<CurrencyCode, number> = { USD: 100 };

/** Largest value we will accept from a provider report, guarding a bad parse. */
const MAX_MINOR_UNITS = 1_000_000_000_00;

export function money(minorUnits: number, currency: CurrencyCode = 'USD'): Money {
  if (!Number.isInteger(minorUnits)) {
    throw new Error(`Money must be whole minor units, received ${minorUnits}.`);
  }
  if (Math.abs(minorUnits) > MAX_MINOR_UNITS) {
    throw new Error(`Money value ${minorUnits} is outside the range this ledger accepts.`);
  }
  return { minorUnits, currency };
}

export const ZERO_USD: Money = money(0);

/**
 * Parse a provider's decimal string without going through a float.
 *
 * `Number('0.07') * 100` is 7.000000000000001, and a ledger built on that
 * disagrees with the statement it is supposed to match. The digits are read
 * directly instead.
 */
export function moneyFromDecimalString(value: string, currency: CurrencyCode = 'USD'): Money {
  const trimmed = value.trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) throw new Error(`Not a decimal amount: ${value}`);
  const [, sign, whole, fraction = ''] = match;
  const scale = MINOR_UNITS_PER_MAJOR[currency];
  const digits = String(scale).length - 1;
  if (fraction.length > digits) {
    const remainder = fraction.slice(digits);
    if (/[1-9]/.test(remainder)) {
      throw new Error(`Amount ${value} carries more precision than ${currency} can hold.`);
    }
  }
  const padded = fraction.padEnd(digits, '0').slice(0, digits);
  const minor = Number(whole) * scale + Number(padded || '0');
  return money(sign === '-' ? -minor : minor, currency);
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.minorUnits + right.minorUnits, left.currency);
}

export function sumMoney(values: readonly Money[], currency: CurrencyCode = 'USD'): Money {
  return values.reduce<Money>((total, value) => addMoney(total, value), money(0, currency));
}

export function negateMoney(value: Money): Money {
  return money(-value.minorUnits, value.currency);
}

export function isZeroMoney(value: Money): boolean {
  return value.minorUnits === 0;
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new Error(`Cannot combine ${left.currency} with ${right.currency}.`);
  }
}

export function formatMoneyValue(value: Money, locale = 'en-US'): string {
  const scale = MINOR_UNITS_PER_MAJOR[value.currency];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: 2,
  }).format(value.minorUnits / scale);
}

/**
 * Revenue per thousand, in minor units, without a float division artefact.
 *
 * Returns null rather than zero when there were no sessions: "we earned $0 per
 * thousand sessions" and "we had no sessions" are different statements and a
 * dashboard must not show the first when it means the second.
 */
export function revenuePerThousand(total: Money, denominator: number): Money | null {
  if (!Number.isInteger(denominator) || denominator <= 0) return null;
  return money(Math.round((total.minorUnits * 1000) / denominator), total.currency);
}
