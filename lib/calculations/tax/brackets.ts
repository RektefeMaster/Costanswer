import type { TaxBracket } from './types';

/**
 * Progressive tax on a non-negative income using inclusive “not over” brackets.
 * Intermediate results are not rounded.
 *
 * A bracket carrying `baseTax` states the tax owed at its own floor, and that
 * figure wins over the running total. That is not a convenience: a few states
 * publish constants that do not reconcile with summing the bands beneath them,
 * and the published constant is the one they charge.
 */
export function calculateProgressiveTax(income: number, brackets: readonly TaxBracket[]): number {
  if (!Number.isFinite(income)) throw new Error('Income must be finite.');
  if (brackets.length === 0) throw new Error('At least one tax bracket is required.');
  if (income <= 0) return 0;

  let tax = 0;
  let previousCap = 0;
  for (const [index, bracket] of brackets.entries()) {
    if (!Number.isFinite(bracket.rate) || bracket.rate < 0 || bracket.rate > 1) {
      throw new Error(`Tax bracket rate at index ${index} is out of bounds.`);
    }
    const cap = bracket.notOver ?? Number.POSITIVE_INFINITY;
    if (bracket.notOver !== null && !(cap > previousCap)) {
      throw new Error('Tax bracket thresholds must be strictly increasing.');
    }
    if (income > previousCap && bracket.baseTax !== undefined) tax = bracket.baseTax;
    const slice = Math.min(income, cap) - previousCap;
    if (slice > 0) tax += slice * bracket.rate;
    previousCap = cap;
    if (income <= cap) return tax;
  }
  throw new Error('Tax brackets do not cover the given income.');
}
