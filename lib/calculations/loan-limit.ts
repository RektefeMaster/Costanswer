/**
 * Is this loan conforming, high-balance, or jumbo?
 *
 * The question sounds like a size comparison and is really a product question.
 * Fannie Mae and Freddie Mac may only buy a loan at or under its county's FHFA
 * limit; above it, a lender keeps the loan or sells it privately, which is why
 * jumbo underwriting asks for more reserves, a larger down payment and often a
 * different rate. "High balance" is the band in between: still conforming,
 * still saleable to the agencies, but above the national baseline and priced
 * with a loan-level adjustment of its own.
 *
 * Three bands, and the page names all three because the middle one is the one
 * borrowers are surprised by.
 */
import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';
import { LOAN_UNIT_COUNTS, type CountyLoanLimit, type LoanUnitCount } from '@/lib/data/fhfa-loan-limits';

export const LOAN_LIMIT_ENGINE_ID = 'fhfa-loan-limit-v1.1.0';

export const LOAN_LIMIT_BANDS = ['baseline-conforming', 'high-balance-conforming', 'jumbo'] as const;
export type LoanLimitBand = (typeof LOAN_LIMIT_BANDS)[number];

export const loanLimitInputSchema = z.object({
  /** The financed amount, not the purchase price. */
  loanAmount: finiteNumber('Loan amount', 0, 100_000_000),
  units: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  /** Optional, so the page can answer "what price can I buy" as well as "is this jumbo". */
  downPaymentPercent: finiteNumber('Down payment', 0, 100).optional(),
});

export type LoanLimitInput = z.infer<typeof loanLimitInputSchema>;

export type LoanLimitValue = {
  band: LoanLimitBand;
  bandLabel: string;
  countyLimit: number;
  baselineLimit: number;
  units: LoanUnitCount;
  loanAmount: number;
  /** Positive when the loan is under the county limit, negative when it is over. */
  headroom: number;
  /** How much more you would need to put down to land at the county limit. Zero when already under. */
  additionalDownPaymentToConform: number;
  /** The largest purchase price that still conforms, at the down payment given. */
  maximumConformingPrice: number | null;
  /** The local conforming baseline used for high-balance banding. Equals `baselineLimit` except in AK/HI/GU/VI, where it is 150% of that. */
  areaBaselineLimit: number;
  isHighCostCounty: boolean;
  isSpecialStatutoryArea: boolean;
};

const BAND_LABELS: Record<LoanLimitBand, string> = {
  'baseline-conforming': 'Conforming',
  'high-balance-conforming': 'High-balance conforming',
  jumbo: 'Jumbo',
};

export function classifyLoan(loanAmount: number, baselineLimit: number, countyLimit: number): LoanLimitBand {
  if (loanAmount > countyLimit) return 'jumbo';
  if (loanAmount > baselineLimit) return 'high-balance-conforming';
  return 'baseline-conforming';
}

export function calculateLoanLimit(
  rawInput: unknown,
  county: CountyLoanLimit,
  baseline: readonly [number, number, number, number],
  snapshotId: string,
  loanYear: number,
): CalculationResult<LoanLimitValue> {
  const input = loanLimitInputSchema.parse(rawInput);
  const units = input.units as LoanUnitCount;
  const countyLimit = county.limits[units - 1];
  const baselineLimit = baseline[units - 1];
  /*
   * HERA sets AK/HI/GU/VI at 150% of the otherwise applicable limit. That 150%
   * figure is the local conforming baseline, not a high-balance ceiling. Fannie
   * Mae high-balance LLPAs start above that local baseline, not above the
   * mainland $832,750 number.
   */
  const areaBaselineLimit = county.isSpecialStatutoryArea ? round(baselineLimit * 1.5, 0) : baselineLimit;
  const band = classifyLoan(input.loanAmount, areaBaselineLimit, countyLimit);
  const headroom = round(countyLimit - input.loanAmount);
  const hasHighBalanceBand = areaBaselineLimit < countyLimit;

  /*
   * A borrower over the limit has two ways back under it, and only one of them
   * is "buy a cheaper house". Putting the overage down as extra cash is the
   * other, and it is the number the page should hand them.
   */
  const additionalDownPaymentToConform = headroom >= 0 ? 0 : round(-headroom);

  const downPaymentPercent = input.downPaymentPercent;
  const maximumConformingPrice = downPaymentPercent === undefined || downPaymentPercent >= 100
    ? null
    : round(countyLimit / (1 - downPaymentPercent / 100));

  const breakdown = [
    {
      label: `${county.countyName}, ${county.state} limit`,
      value: formatMoney(countyLimit, 0),
      detail: `${units}-unit property, FHFA ${loanYear}${county.isHighCost ? ', a high-cost county' : ''}`,
    },
    {
      label: county.isSpecialStatutoryArea ? `${county.state} statutory baseline` : 'National baseline limit',
      value: formatMoney(areaBaselineLimit, 0),
      detail: county.isSpecialStatutoryArea
        ? `Alaska, Hawaii, Guam and the U.S. Virgin Islands start at 150% of the national baseline (${formatMoney(baselineLimit, 0)}). High-balance begins above this local figure.`
        : hasHighBalanceBand
          ? 'Above this and up to the county limit, the loan is high-balance conforming'
          : 'This county is at the baseline, so there is no high-balance band here',
    },
    {
      label: 'Your loan amount',
      value: formatMoney(input.loanAmount, 0),
      detail: headroom >= 0
        ? `${formatMoney(headroom, 0)} under the county limit`
        : `${formatMoney(-headroom, 0)} over the county limit`,
    },
    ...(maximumConformingPrice === null ? [] : [{
      label: `Largest conforming purchase price at ${downPaymentPercent}% down`,
      value: formatMoney(maximumConformingPrice, 0),
      detail: `${formatMoney(countyLimit, 0)} ÷ (1 − ${downPaymentPercent}%)`,
    }]),
  ];

  const assumptions = [
    'The limit applies to the loan amount, not the purchase price. A larger down payment can bring an expensive house under the limit.',
    `These are the values FHFA set for loans acquired in calendar year ${loanYear}. A file published in November does not apply to a loan closed before 1 January.`,
    'A conforming loan is one the agencies may buy. It is not an approval: credit, income, reserves and the property still decide whether a lender will lend.',
    ...(county.isSpecialStatutoryArea
      ? ['Alaska, Hawaii, Guam and the U.S. Virgin Islands are set at 150% of the otherwise applicable limit by statute, so their limits can exceed the national ceiling.']
      : []),
    ...(band === 'high-balance-conforming'
      ? ['High-balance conforming loans are still agency-eligible, but they carry their own loan-level price adjustment, so the rate is usually a little above a baseline conforming loan.']
      : []),
    ...(band === 'jumbo'
      ? ['Jumbo underwriting is the lender’s own. Reserve, down payment and credit requirements vary between lenders in a way conforming rules do not.']
      : []),
    'FHA and VA set their own limits, which are not these. A VA loan with full entitlement has no limit at all.',
  ];

  return {
    value: {
      band,
      bandLabel: BAND_LABELS[band],
      countyLimit,
      baselineLimit,
      units,
      loanAmount: round(input.loanAmount),
      headroom,
      additionalDownPaymentToConform,
      maximumConformingPrice,
      areaBaselineLimit,
      isHighCostCounty: county.isHighCost,
      isSpecialStatutoryArea: county.isSpecialStatutoryArea,
    },
    calculationVersion: LOAN_LIMIT_ENGINE_ID,
    datasetSnapshotIds: [snapshotId],
    breakdown,
    assumptions,
  };
}

export { LOAN_UNIT_COUNTS };
