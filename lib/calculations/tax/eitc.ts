import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from '@/lib/calculations/contracts';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import type { EarnedIncomeCreditBand } from '@/lib/data/tax/schema';
import { FILING_STATUSES, FILING_STATUS_LABELS, type FilingStatus } from './types';
import { EITC_ENGINE_ID } from './version';

export const EITC_CHILD_COUNTS = [0, 1, 2, 3] as const;
export type EitcChildCount = (typeof EITC_CHILD_COUNTS)[number];

export const eitcInputSchema = z.object({
  earnedIncome: finiteNumber('Earned income', 0, 100_000_000),
  adjustedGrossIncome: finiteNumber('Adjusted gross income', 0, 100_000_000),
  qualifyingChildren: z.number().int({ error: 'Qualifying children must be a whole number.' }).min(0).max(3),
  investmentIncome: finiteNumber('Investment income', 0, 100_000_000).default(0),
  filingStatus: z.enum(FILING_STATUSES),
  taxYear: z.number().int({ error: 'Tax year must be a whole number.' }),
});

export type EitcInput = z.infer<typeof eitcInputSchema>;

export type EitcValue = {
  taxYear: number;
  filingStatus: FilingStatus;
  earnedIncome: number;
  adjustedGrossIncome: number;
  qualifyingChildren: EitcChildCount;
  investmentIncome: number;
  disallowedForInvestmentIncome: boolean;
  maximumCredit: number;
  credit: number;
  phase: 'none' | 'phase-in' | 'plateau' | 'phase-out';
};

function eitcPhaseDetail(
  phase: EitcValue['phase'],
  band: EarnedIncomeCreditBand,
  threshold: number,
  completed: number,
  filingStatus: FilingStatus,
  childLabel: string,
): string {
  switch (phase) {
    case 'phase-in':
      return `Phasing in toward ${formatMoney(band.maximumCredit)} at ${formatMoney(band.earnedIncomeAmount)} of earned income`;
    case 'phase-out':
      return `Phasing out between ${formatMoney(threshold)} and ${formatMoney(completed)} for ${FILING_STATUS_LABELS[filingStatus]}`;
    case 'plateau':
      return `Maximum credit for ${childLabel}`;
    case 'none':
      return 'No credit at this income';
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function bandForChildren(bandByChildren: {
  none: EarnedIncomeCreditBand;
  one: EarnedIncomeCreditBand;
  two: EarnedIncomeCreditBand;
  threeOrMore: EarnedIncomeCreditBand;
}, qualifyingChildren: number): EarnedIncomeCreditBand {
  if (qualifyingChildren <= 0) return bandByChildren.none;
  if (qualifyingChildren === 1) return bandByChildren.one;
  if (qualifyingChildren === 2) return bandByChildren.two;
  return bandByChildren.threeOrMore;
}

/**
 * Earned Income Tax Credit from the Rev. Proc. 2025-32 amounts.
 *
 * The IRS Form 1040 instructions publish the same parameters as $50-band
 * lookup tables. This engine uses the Revenue Procedure figures directly and
 * rounds the credit to the nearest dollar, which can differ from a table cell
 * by a few dollars.
 */
export function calculateEitc(rawInput: unknown): CalculationResult<EitcValue> {
  const input = eitcInputSchema.parse(rawInput);
  const snapshot = getTaxYearSnapshot(input.taxYear);
  const eitc = snapshot.federalCredits.earnedIncomeCredit;
  const qualifyingChildren = Math.min(input.qualifyingChildren, 3) as EitcChildCount;
  const band = bandForChildren(eitc.byQualifyingChildren, qualifyingChildren);
  const joint = input.filingStatus === 'marriedFilingJointly';
  const threshold = joint ? band.thresholdPhaseoutMarriedFilingJointly : band.thresholdPhaseoutOtherStatuses;
  const completed = joint ? band.completedPhaseoutMarriedFilingJointly : band.completedPhaseoutOtherStatuses;
  const disallowedForInvestmentIncome = input.investmentIncome > eitc.investmentIncomeLimit;
  const phaseoutIncome = Math.max(input.adjustedGrossIncome, input.earnedIncome);

  let creditFromEarned = 0;
  let phase: EitcValue['phase'] = 'none';
  if (input.earnedIncome > 0 && input.earnedIncome < band.earnedIncomeAmount) {
    creditFromEarned = input.earnedIncome * (band.maximumCredit / band.earnedIncomeAmount);
    phase = 'phase-in';
  } else if (input.earnedIncome >= band.earnedIncomeAmount) {
    creditFromEarned = band.maximumCredit;
    phase = 'plateau';
  }

  let credit = creditFromEarned;
  if (phaseoutIncome > threshold) {
    const width = completed - threshold;
    const afterPhaseOut = Math.max(0, band.maximumCredit - (phaseoutIncome - threshold) * (band.maximumCredit / width));
    credit = Math.min(credit, afterPhaseOut);
    phase = credit === 0 ? 'none' : 'phase-out';
  }
  if (input.earnedIncome <= 0 || disallowedForInvestmentIncome) {
    credit = 0;
    phase = 'none';
  }

  const value: EitcValue = {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    earnedIncome: round(input.earnedIncome),
    adjustedGrossIncome: round(input.adjustedGrossIncome),
    qualifyingChildren,
    investmentIncome: round(input.investmentIncome),
    disallowedForInvestmentIncome,
    maximumCredit: round(band.maximumCredit),
    credit: round(credit, 0),
    phase,
  };

  const childLabel = qualifyingChildren === 0
    ? 'no qualifying children'
    : qualifyingChildren === 1
      ? 'one qualifying child'
      : `${qualifyingChildren} qualifying children`;

  return {
    value,
    calculationVersion: EITC_ENGINE_ID,
    datasetSnapshotIds: [snapshot.snapshotId],
    breakdown: [
      { label: 'Earned income', value: formatMoney(input.earnedIncome) },
      { label: 'Adjusted gross income', value: formatMoney(input.adjustedGrossIncome) },
      { label: 'Qualifying children', value: String(qualifyingChildren) },
      ...(disallowedForInvestmentIncome
        ? [{
          label: 'Investment income',
          value: formatMoney(input.investmentIncome),
          detail: `Over the ${formatMoney(eitc.investmentIncomeLimit)} limit, so no credit is allowed`,
        }]
        : [{
          label: 'Earned income credit',
          value: formatMoney(value.credit),
          detail: eitcPhaseDetail(phase, band, threshold, completed, input.filingStatus, childLabel),
        }]),
    ],
    assumptions: [
      `Tax year ${input.taxYear}. Amounts are from ${snapshot.federalCredits.sourceName} §4.06, not from a blog or prior-year table.`,
      qualifyingChildren === 0
        ? 'A credit with no qualifying children also requires the filer (and spouse, on a joint return) to be at least 25 and under 65. That age test is not applied here, so someone outside that range is shown a credit they cannot take.'
        : 'A qualifying child has to meet the relationship, age, residency and joint-return tests on Schedule EIC. This page takes the count you enter as given.',
      'Married filing separately is treated like every other non-joint status. The special separated-spouse rule in §32(d) is not tested, so a separated spouse who does not qualify is overstated.',
      `Investment income above ${formatMoney(eitc.investmentIncomeLimit)} disallows the credit entirely.`,
      'The IRS lookup tables round in $50 earned-income bands. This page uses the Revenue Procedure amounts and rounds the credit to the nearest dollar, so a table cell can differ by a few dollars.',
      'This is the federal EITC only. State earned-income credits are not modelled.',
    ],
  };
}
