import { assertFiniteNonNegative } from './finite';

/** Calendar-year daily figures use 365 days so they match the electricity-cost calculator. */
export const ENERGY_DAYS_PER_YEAR = 365;
/** Weekly appliance usage is annualized as 52 identical weeks. */
export const ENERGY_WEEKS_PER_YEAR = 52;
/** Monthly figures are the annual total divided by 12. A month is not 30 days. */
export const ENERGY_MONTHS_PER_YEAR = 12;

export type PeriodQuantities = {
  daily: number;
  weekly: number;
  monthly: number;
  annual: number;
};

export function periodQuantitiesFromAnnual(annual: number): PeriodQuantities {
  assertFiniteNonNegative(annual, 'Annual quantity');
  return {
    annual,
    monthly: annual / ENERGY_MONTHS_PER_YEAR,
    weekly: annual / ENERGY_WEEKS_PER_YEAR,
    daily: annual / ENERGY_DAYS_PER_YEAR,
  };
}

export function periodQuantitiesFromWeekly(weekly: number): PeriodQuantities {
  assertFiniteNonNegative(weekly, 'Weekly quantity');
  return periodQuantitiesFromAnnual(weekly * ENERGY_WEEKS_PER_YEAR);
}

export function periodQuantitiesFromMonthly(monthly: number): PeriodQuantities {
  assertFiniteNonNegative(monthly, 'Monthly quantity');
  return periodQuantitiesFromAnnual(monthly * ENERGY_MONTHS_PER_YEAR);
}
