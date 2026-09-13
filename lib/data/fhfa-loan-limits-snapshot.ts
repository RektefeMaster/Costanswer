import currentJson from '@/data/fhfa-loan-limits/current.json';
import { getStateName, isStateCode } from '@/lib/location/states';
import {
  countyFromView,
  countyLoanLimitView,
  fhfaLoanLimitSnapshotSchema,
  indexLoanLimits,
  limitForUnits,
  type CountyLoanLimit,
  type FhfaLoanLimitSnapshot,
  type LoanLimitCountyView,
  type LoanUnitCount,
} from './fhfa-loan-limits';

export const fhfaLoanLimitSnapshot: FhfaLoanLimitSnapshot = fhfaLoanLimitSnapshotSchema.parse(currentJson);

const byCountyFips = indexLoanLimits(fhfaLoanLimitSnapshot);

/** Territories FHFA publishes that are not in the fifty-state list. */
export const FHFA_TERRITORY_NAMES: Record<string, string> = {
  AS: 'American Samoa',
  GU: 'Guam',
  MP: 'Northern Mariana Islands',
  PR: 'Puerto Rico',
  VI: 'U.S. Virgin Islands',
};

export function loanLimitStateName(code: string): string {
  if (isStateCode(code)) return getStateName(code);
  return FHFA_TERRITORY_NAMES[code] ?? code;
}

export function getCountyLoanLimit(countyFips: string): CountyLoanLimit | undefined {
  return byCountyFips.get(countyFips);
}

export function countyLoanLimitCount(): number {
  return byCountyFips.size;
}

/**
 * Every county in one state, for the picker on the page.
 *
 * A reader who does not know their county FIPS code knows their state, and a
 * state has at most 254 counties, so a two-step picker beats a 3,235-row list.
 */
export function countiesInState(state: string): CountyLoanLimit[] {
  return [...byCountyFips.values()]
    .filter((county) => county.state === state)
    .sort((left, right) => left.countyName.localeCompare(right.countyName));
}

export function loanLimitStates(): string[] {
  return [...new Set([...byCountyFips.values()].map((county) => county.state))].sort();
}

export function loanLimitPickerStates(): Array<{ code: string; name: string }> {
  return loanLimitStates().map((code) => ({ code, name: loanLimitStateName(code) }));
}

export { countyLoanLimitView, countyFromView, limitForUnits };
export type { CountyLoanLimit, LoanLimitCountyView, LoanUnitCount };
