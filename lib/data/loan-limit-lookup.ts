/**
 * ZIP and state lookups for the conforming loan limit page.
 *
 * Kept off the client so the Census ZCTA table and the 3,235-county FHFA file
 * stay out of the browser chunk. The calculator fetches one state or one ZIP.
 */
import { countiesForZip } from './zcta-county-snapshot';
import {
  countyLoanLimitView,
  countiesInState,
  getCountyLoanLimit,
  loanLimitStateName,
  type LoanLimitCountyView,
} from './fhfa-loan-limits-snapshot';

export type LoanLimitZipResolution =
  | { status: 'not-a-zcta'; zip: string; message: string }
  | { status: 'resolved'; zip: string; counties: LoanLimitCountyView[]; split: boolean; message?: string };

export function countiesForLoanLimitState(state: string): LoanLimitCountyView[] {
  return countiesInState(state.toUpperCase()).map(countyLoanLimitView);
}

export function resolveZipToLoanLimitCounties(rawZip: string): LoanLimitZipResolution {
  const zip = rawZip.trim();
  if (!/^\d{5}$/.test(zip)) {
    return { status: 'not-a-zcta', zip, message: 'Enter a five-digit U.S. ZIP code, or pick the county by name.' };
  }
  const geoids = countiesForZip(zip);
  if (!geoids || geoids.length === 0) {
    return {
      status: 'not-a-zcta',
      zip,
      message: 'This ZIP is not in the Census ZCTA file, so it cannot be mapped to a county. Pick the county by name.',
    };
  }
  const counties = geoids
    .map((geoid) => getCountyLoanLimit(geoid))
    .filter((county): county is NonNullable<typeof county> => county !== undefined)
    .map(countyLoanLimitView);
  if (counties.length === 0) {
    return {
      status: 'not-a-zcta',
      zip,
      message: 'This ZIP maps to a county FHFA does not publish a limit for. Pick the county by name.',
    };
  }
  const split = counties.length > 1;
  return {
    status: 'resolved',
    zip,
    counties,
    split,
    message: split
      ? `This ZIP covers more than one county. The first listed, ${counties[0].name} ${loanLimitStateName(counties[0].state)}, occupies the largest land share.`
      : undefined,
  };
}
