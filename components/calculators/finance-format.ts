import { type CompoundingFrequency } from '@/lib/calculations/investment';

export function money(value: number, digits = 2) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });
}

export function frequencyLabel(frequency: CompoundingFrequency): string {
  switch (frequency) {
    case 'annually': return 'Annually';
    case 'semiannually': return 'Twice a year';
    case 'quarterly': return 'Quarterly';
    case 'monthly': return 'Monthly';
    case 'weekly': return 'Weekly';
    default: {
      const exhaustive: never = frequency;
      throw new Error(`Unhandled frequency: ${exhaustive}`);
    }
  }
}

/**
 * Money that came out of a guideline, not out of a contract.
 *
 * An affordability band is a threshold we chose, so a comfortable price of
 * "$311,876" claims a precision the model does not have — down to the dollar
 * off a rule of thumb. Rounding to a readable step, and saying "about", keeps
 * the figure useful without dressing a heuristic up as a quote.
 */
export function roundedGuidelineMoney(value: number): string {
  const magnitude = Math.abs(value);
  const step = magnitude >= 100_000 ? 1_000 : magnitude >= 10_000 ? 500 : 100;
  return money(Math.round(value / step) * step, 0);
}

/** The same figure with the hedge in front, for running text and stat notes. */
export function approxMoney(value: number): string {
  return `about ${roundedGuidelineMoney(value)}`;
}
