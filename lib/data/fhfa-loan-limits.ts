/**
 * Shape and reader for the FHFA conforming loan limit snapshot.
 *
 * Stored as parallel arrays with a shared tier table because 3,235 counties
 * share only 25 distinct limit tuples. Reading it back into a map once, at
 * module load, is what keeps a lookup O(1) without shipping 3,235 objects.
 */
import { z } from 'zod';

export const LOAN_UNIT_COUNTS = [1, 2, 3, 4] as const;
export type LoanUnitCount = (typeof LOAN_UNIT_COUNTS)[number];

const wholeDollars = z.number().int().positive();

const limitTierSchema = z.tuple([wholeDollars, wholeDollars, wholeDollars, wholeDollars]);

export const fhfaLoanLimitSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.string(),
  snapshotId: z.string(),
  datasetId: z.literal('fhfa-loan-limits'),
  observationPeriod: z.string().regex(/^\d{4}$/),
  loanYear: z.number().int(),
  effectiveFrom: z.string(),
  effectiveTo: z.string(),
  fetchedAt: z.string(),
  verifiedAt: z.string(),
  sourceStatus: z.string(),
  sourceUrl: z.string(),
  sourceDocumentationUrl: z.string(),
  attribution: z.string(),
  baseline: z.object({ oneUnit: wholeDollars, twoUnit: wholeDollars, threeUnit: wholeDollars, fourUnit: wholeDollars }),
  ceiling: z.object({ oneUnit: wholeDollars, twoUnit: wholeDollars, threeUnit: wholeDollars, fourUnit: wholeDollars }),
  ceilingMultiple: z.number(),
  aboveCeilingCountyFips: z.array(z.string()),
  specialStatutoryAreas: z.array(z.string()),
  tiers: z.array(limitTierSchema).min(1),
  countyFips: z.array(z.string().regex(/^\d{5}$/)).min(3_000),
  countyTier: z.array(z.number().int().nonnegative()),
  countyName: z.array(z.string()),
  countyState: z.array(z.string()),
  rawSha256: z.string(),
  validationReport: z.array(z.string()),
  normalizedSha256: z.string(),
});

export type FhfaLoanLimitSnapshot = z.infer<typeof fhfaLoanLimitSnapshotSchema>;

export type CountyLoanLimit = {
  countyFips: string;
  countyName: string;
  state: string;
  /** Limits by unit count, index 0 = one unit. */
  limits: readonly [number, number, number, number];
  /** True where the county's limit is above the national baseline. */
  isHighCost: boolean;
  /** True in Alaska, Hawaii, Guam and the U.S. Virgin Islands, which the ceiling does not bind. */
  isSpecialStatutoryArea: boolean;
};

export function indexLoanLimits(snapshot: FhfaLoanLimitSnapshot): Map<string, CountyLoanLimit> {
  const { countyFips, countyTier, countyName, countyState, tiers } = snapshot;
  if (countyTier.length !== countyFips.length || countyName.length !== countyFips.length || countyState.length !== countyFips.length) {
    throw new Error('FHFA snapshot column lengths disagree.');
  }
  const special = new Set(snapshot.specialStatutoryAreas);
  const index = new Map<string, CountyLoanLimit>();
  for (let row = 0; row < countyFips.length; row += 1) {
    const limits = tiers[countyTier[row]];
    if (!limits) throw new Error(`County ${countyFips[row]} points at missing tier ${countyTier[row]}.`);
    index.set(countyFips[row], {
      countyFips: countyFips[row],
      countyName: titleCase(countyName[row]),
      state: countyState[row],
      limits,
      isHighCost: limits[0] > snapshot.baseline.oneUnit,
      isSpecialStatutoryArea: special.has(countyState[row]),
    });
  }
  return index;
}

/** FHFA ships county names in capitals; the page shows them the way people write them. */
function titleCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\bOf\b/g, 'of')
    .replace(/\bAnd\b/g, 'and');
}

export function limitForUnits(county: CountyLoanLimit, units: LoanUnitCount): number {
  return county.limits[units - 1];
}

export type LoanLimitCountyView = {
  fips: string;
  name: string;
  state: string;
  limits: [number, number, number, number];
  isHighCost: boolean;
  isSpecialStatutoryArea: boolean;
};

export function countyLoanLimitView(county: CountyLoanLimit): LoanLimitCountyView {
  return {
    fips: county.countyFips,
    name: county.countyName,
    state: county.state,
    limits: [county.limits[0], county.limits[1], county.limits[2], county.limits[3]],
    isHighCost: county.isHighCost,
    isSpecialStatutoryArea: county.isSpecialStatutoryArea,
  };
}

export function countyFromView(view: LoanLimitCountyView): CountyLoanLimit {
  return {
    countyFips: view.fips,
    countyName: view.name,
    state: view.state,
    limits: view.limits,
    isHighCost: view.isHighCost,
    isSpecialStatutoryArea: view.isSpecialStatutoryArea,
  };
}
