/**
 * HSA contribution room and HDHP eligibility for one tax year.
 *
 * The dollars come from Rev. Proc. 2025-19. Whether the person is eligible at
 * all — Medicare enrollment, other coverage, last-month testing period — is
 * answered by them, not by this page. A plan that fails the deductible or
 * out-of-pocket test is not an HDHP, so the contribution limit is zero rather
 * than a guess.
 */
import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';
import {
  HSA_COVERAGE,
  hsaBaseLimit,
  hsaHdhpThresholds,
  irsHsaLimits,
  irsHsaSnapshot,
  type HsaCoverage,
} from '@/lib/data/irs-hsa';

export const HSA_ENGINE_ID = 'irs-hsa-v1.1.0';

export const hsaInputSchema = z.object({
  coverage: z.enum(HSA_COVERAGE),
  age: finiteNumber('Age', 16, 120).refine(Number.isInteger, 'Age must be a whole number.'),
  monthsEligible: finiteNumber('Months of HDHP coverage', 0, 12).refine(Number.isInteger, 'Months must be a whole number.'),
  enrolledInMedicare: z.boolean(),
  lastMonthRule: z.boolean(),
  alreadyContributed: finiteNumber('Amount already contributed', 0, 100_000),
  planDeductible: finiteNumber('Plan deductible', 0, 100_000).optional(),
  planOutOfPocketMax: finiteNumber('Plan out-of-pocket maximum', 0, 100_000).optional(),
}).superRefine((input, ctx) => {
  if (input.enrolledInMedicare && input.monthsEligible >= 12) {
    ctx.addIssue({
      code: 'custom',
      path: ['monthsEligible'],
      message: 'If Medicare started this year, enter only the months before enrollment (at most 11).',
    });
  }
});

export type HsaInput = z.infer<typeof hsaInputSchema>;

export type HsaValue = {
  coverage: HsaCoverage;
  coverageYear: number;
  baseLimit: number;
  catchUp: number;
  monthsUsed: number;
  annualLimit: number;
  remaining: number;
  enrolledInMedicare: boolean;
  qualifiesAsHdhp: boolean | null;
  hdhpFailure: string | null;
};

export function calculateHsaContribution(rawInput: unknown): CalculationResult<HsaValue> {
  const input = hsaInputSchema.parse(rawInput);
  const coverageYear = irsHsaSnapshot.coverageYear;
  const base = hsaBaseLimit(input.coverage);
  const catchUp = input.age >= 55 ? irsHsaLimits.catchUpAge55 : 0;
  const thresholds = hsaHdhpThresholds(input.coverage);

  let qualifiesAsHdhp: boolean | null = null;
  let hdhpFailure: string | null = null;
  const hasDeductible = input.planDeductible !== undefined;
  const hasOutOfPocket = input.planOutOfPocketMax !== undefined;
  if (hasDeductible || hasOutOfPocket) {
    const deductibleOk = !hasDeductible || input.planDeductible! >= thresholds.minDeductible;
    const oopOk = !hasOutOfPocket || input.planOutOfPocketMax! <= thresholds.maxOutOfPocket;
    if (!deductibleOk) {
      qualifiesAsHdhp = false;
      hdhpFailure = `A ${input.coverage} HDHP for ${coverageYear} needs a deductible of at least ${formatMoney(thresholds.minDeductible, 0)}.`;
    } else if (!oopOk) {
      qualifiesAsHdhp = false;
      hdhpFailure = `A ${input.coverage} HDHP for ${coverageYear} cannot have an out-of-pocket maximum above ${formatMoney(thresholds.maxOutOfPocket, 0)}. Premiums are not part of that test.`;
    } else if (hasDeductible && hasOutOfPocket) {
      qualifiesAsHdhp = true;
    }
  }

  const blocked = qualifiesAsHdhp === false;
  const lastMonthApplies = input.lastMonthRule && !input.enrolledInMedicare && !blocked;
  const monthsUsed = blocked ? 0 : (lastMonthApplies ? 12 : input.monthsEligible);
  const annualLimit = blocked ? 0 : round((base + catchUp) * (monthsUsed / 12), 0);
  const remaining = round(Math.max(0, annualLimit - input.alreadyContributed), 0);

  const breakdown = [
    {
      label: `${input.coverage === 'family' ? 'Family' : 'Self-only'} contribution limit`,
      value: formatMoney(base, 0),
      detail: `Rev. Proc. 2025-19 for calendar year ${coverageYear}`,
    },
    {
      label: 'Age-55 catch-up',
      value: formatMoney(catchUp, 0),
      detail: catchUp > 0
        ? 'IRC §223(b)(3). It is $1,000 and is not inflated. It must go into this person’s HSA.'
        : 'Applies in the year you turn 55, if you are still HSA-eligible.',
    },
    {
      label: 'Months counted',
      value: `${monthsUsed} of 12`,
      detail: lastMonthApplies
        ? 'Last-month rule: the full annual limit, which you must remain eligible for through next 31 December.'
        : input.enrolledInMedicare && input.lastMonthRule
          ? 'Last-month rule does not apply once Medicare has started. Count only the months you were eligible before enrollment.'
          : 'Each eligible month is 1/12 of the annual limit, then rounded to the nearest dollar.',
    },
    {
      label: `${coverageYear} contribution limit`,
      value: formatMoney(annualLimit, 0),
      detail: blocked
        ? (hdhpFailure ?? 'Not an HDHP.')
        : `${formatMoney(base + catchUp, 0)} × ${monthsUsed}/12`,
    },
    {
      label: 'Room left this year',
      value: formatMoney(remaining, 0),
      detail: input.alreadyContributed > 0
        ? `After ${formatMoney(input.alreadyContributed, 0)} already in, from every source including employer.`
        : 'Employer contributions and yours share this cap.',
    },
  ];

  return {
    value: {
      coverage: input.coverage,
      coverageYear,
      baseLimit: base,
      catchUp,
      monthsUsed,
      annualLimit,
      remaining,
      enrolledInMedicare: input.enrolledInMedicare,
      qualifiesAsHdhp,
      hdhpFailure,
    },
    calculationVersion: HSA_ENGINE_ID,
    datasetSnapshotIds: [irsHsaSnapshot.snapshotId],
    breakdown,
    assumptions: [
      'The contribution limit is a combined cap: employee, employer, and anyone else putting money in this HSA all count.',
      'Catch-up is per eligible person and per HSA. A spouse who is 55 or older needs their own HSA to use their own $1,000.',
      'Last-month rule lets you use the full annual limit if you are eligible on 1 December, but only if you stay eligible through the following 31 December. Failing that testing period recaptures the extra.',
      'Enrolling in any part of Medicare ends HSA eligibility for later months. Enter only the months before enrollment; the last-month rule cannot apply after Medicare starts.',
      'A bronze or catastrophic Marketplace plan is not automatically an HDHP. The deductible and out-of-pocket test is the one Rev. Proc. 2025-19 prints. Both numbers are required before this page will call a plan an HDHP.',
    ],
  };
}
