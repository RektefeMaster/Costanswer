/**
 * Required minimum distribution from IRS Table III (Uniform Lifetime).
 *
 * RMD = prior year-end balance ÷ the denominator for the owner’s age as of
 * birthday in the distribution year. The table is used unless the sole
 * beneficiary is a spouse more than 10 years younger — that case is Table II,
 * which this page refuses rather than inventing.
 *
 * Whether an RMD is due at all is SECURE 2.0 (age 73 or 75), not the table.
 * Roth IRAs the owner still holds have no lifetime RMD.
 */
import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { irsRmdSnapshot, rmdRequiredBeginningAge, uniformLifetimePeriod } from '@/lib/data/irs-rmd';

export const RMD_ENGINE_ID = 'irs-rmd-v1.0.0';

export const rmdInputSchema = z.object({
  priorYearEndBalance: finiteNumber('Year-end account balance', 0, 100_000_000),
  age: finiteNumber('Age this year', 18, 120).refine(Number.isInteger, 'Age must be a whole number.'),
  birthYear: finiteNumber('Birth year', 1900, 2020).refine(Number.isInteger, 'Birth year must be a whole number.'),
  inherited: z.boolean(),
  spouseMoreThanTenYearsYounger: z.boolean(),
  rothIra: z.boolean(),
});

export type RmdInput = z.infer<typeof rmdInputSchema>;

export type RmdValue = {
  distributionYear: number;
  required: boolean;
  blockedReason: string | null;
  startAge: number;
  age: number;
  denominator: number | null;
  rmd: number | null;
};

export function calculateRmd(rawInput: unknown): CalculationResult<RmdValue> {
  const input = rmdInputSchema.parse(rawInput);
  const distributionYear = irsRmdSnapshot.distributionYear;
  const startAge = rmdRequiredBeginningAge(input.birthYear);
  const ageFromBirth = distributionYear - input.birthYear;

  let blockedReason: string | null = null;
  if (input.rothIra) {
    blockedReason = 'A Roth IRA the original owner still holds has no lifetime RMD. Inherited Roth IRAs can.';
  } else if (input.inherited) {
    blockedReason = 'Inherited IRAs use Table I or the 10-year rule, depending on who died when. Table III is the owner’s own lifetime table, so this page does not compute an inherited RMD.';
  } else if (input.spouseMoreThanTenYearsYounger) {
    blockedReason = 'When the sole beneficiary is a spouse more than 10 years younger, IRS Table II (joint life) applies. That matrix is not in this snapshot.';
  }

  // Table III and SECURE 2.0 gating use age as of birthday in the distribution
  // year from birth year — never a typed age that disagrees with that year.
  const age = ageFromBirth;
  const stillTooYoung = age < startAge;
  const denominator = blockedReason || stillTooYoung ? null : (uniformLifetimePeriod(age) ?? null);
  const required = blockedReason === null && !stillTooYoung && denominator !== null && input.priorYearEndBalance > 0;
  const rmd = required && denominator !== null ? round(input.priorYearEndBalance / denominator, 0) : (stillTooYoung && !blockedReason ? 0 : null);

  const breakdown = [
    {
      label: 'Required beginning age',
      value: String(startAge),
      detail: input.birthYear >= 1960
        ? 'Born 1960 or later: SECURE 2.0 starts RMDs at 75.'
        : input.birthYear >= 1951
          ? 'Born 1951 through 1959: SECURE 2.0 starts RMDs at 73.'
          : 'Born 1950 or earlier: RMDs already started at 72.',
    },
    {
      label: `Age as of birthday in ${distributionYear}`,
      value: String(age),
      detail: ageFromBirth !== input.age
        ? `You typed age ${input.age}, but birth year ${input.birthYear} is age ${age} in ${distributionYear}. IRS Table III uses ${age}.`
        : `Age as of birthday in ${distributionYear} from birth year ${input.birthYear}.`,
    },
    ...(denominator !== null ? [{
      label: 'Table III denominator',
      value: formatNumber(denominator, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      detail: `IRS Publication 590-B, Appendix B, Uniform Lifetime, age ${age}`,
    }] : []),
    {
      label: `${distributionYear} required minimum distribution`,
      value: rmd === null ? 'Not computed' : formatMoney(rmd, 0),
      detail: blockedReason
        ?? (stillTooYoung
          ? `No lifetime RMD until the year you reach ${startAge}.`
          : `${formatMoney(input.priorYearEndBalance, 0)} ÷ ${denominator}`),
    },
  ];

  return {
    value: {
      distributionYear,
      required,
      blockedReason,
      startAge,
      age,
      denominator,
      rmd,
    },
    calculationVersion: RMD_ENGINE_ID,
    datasetSnapshotIds: [irsRmdSnapshot.snapshotId],
    breakdown,
    assumptions: [
      `The balance is the account value on 31 December ${distributionYear - 1}, including outstanding rollovers and recharacterizations the instructions tell you to add back.`,
      'Each IRA is computed separately; 401(k) plans use the same table but the plan administrator usually pays them.',
      'The first RMD can be delayed until 1 April of the following year. Doing that means two distributions in that following year.',
      'A spouse more than 10 years younger who is the sole beneficiary uses Table II, which this page does not ship.',
      'The 10-year rule for most inherited IRAs after the SECURE Act is not modeled.',
    ],
  };
}
