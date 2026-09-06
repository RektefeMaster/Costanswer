/**
 * Figures the engine has to reproduce, and where each one came from.
 *
 * A state row is a transcription, and transcriptions fail silently: a bracket
 * threshold off by a digit still produces a take-home number that looks
 * ordinary. These vectors are the only thing standing between that and tens of
 * thousands of published pages, so each one records not just an expected
 * answer but how strong the evidence for it is.
 *
 * `basis` is that strength, and it is not decoration:
 *
 *  - `published-table` and `published-example` are figures the state itself
 *    printed. They are independent of how this project read the schedule, so
 *    they catch a misread rate or threshold.
 *  - `published-threshold` is a number the state states in prose — a filing
 *    threshold, an income at which tax is zero — that happens to pin a
 *    deduction or exemption exactly.
 *  - `worked-from-schedule` is arithmetic applied to the schedule this row was
 *    transcribed from. It cannot catch a misreading of that schedule; it
 *    catches a later edit that breaks a row nobody meant to touch. That is
 *    worth having and is not the same thing, which is why it is labelled.
 */
import type { FilingStatus } from '@/lib/calculations/tax/types';
import type { StateCode } from '@/lib/location/states';
import type { StateGoldenVector } from './verify-states';

function vector(
  stateCode: StateCode,
  filingStatus: FilingStatus,
  taxableIncome: number,
  expectedTax: number,
  basis: StateGoldenVector['basis'],
  source: { sourceName: string; sourceUrl: string; verifiedAt: string },
  extra: Partial<Pick<StateGoldenVector, 'federalStandardDeduction' | 'federalIncomeTax' | 'dependents' | 'toleranceDollars'>> = {},
): StateGoldenVector {
  return { stateCode, filingStatus, taxableIncome, expectedTax, basis, ...source, ...extra };
}

const CO_SOURCE = {
  sourceName: '2025 Colorado Individual Income Tax Filing Guide (DR 0104 Book), 2025 income tax table',
  sourceUrl: 'https://tax.colorado.gov/sites/tax/files/documents/Book104_2025.pdf',
  verifiedAt: '2026-09-06T00:00:00.000Z',
};
const MS_RATES = {
  sourceName: 'Mississippi DOR, Individual Income Tax — General Information (tax rates, exemptions, deductions, filing thresholds)',
  sourceUrl: 'https://www.dor.ms.gov/individual/tax-rates',
  verifiedAt: '2026-09-06T00:00:00.000Z',
};
const UT_SOURCE = {
  sourceName: 'Utah State Tax Commission, Tax Rates and TC-40 line-by-line instructions lines 10–22',
  sourceUrl: 'https://incometax.utah.gov/paying/tax-rates',
  verifiedAt: '2026-09-06T00:00:00.000Z',
};
const KY_SOURCE = {
  sourceName: '2026 Kentucky Withholding Tax Formula, form 42A003 (TCF)(10-2025)',
  sourceUrl: 'https://revenue.ky.gov/Forms/2026%20Withholding%20Formula.pdf',
  verifiedAt: '2026-09-06T00:00:00.000Z',
};
const IL_SOURCE = {
  sourceName: 'Illinois DOR income tax rate page and Informational Bulletin FY 2026-15 (personal exemption)',
  sourceUrl: 'https://tax.illinois.gov/research/taxrates/income.html',
  verifiedAt: '2026-09-03T00:00:00.000Z',
};
const PA_SOURCE = {
  sourceName: 'Tax Reform Code of 1971, Section 302, as amended by Act 46 of 2003',
  sourceUrl: 'https://www.legis.state.pa.us/WU01/LI/LI/US/HTM/2003/0/0046..HTM',
  verifiedAt: '2026-09-03T00:00:00.000Z',
};
const MA_SOURCE = {
  sourceName: 'Massachusetts DOR, Massachusetts Tax Rates (updated December 30, 2025)',
  sourceUrl: 'https://www.mass.gov/info-details/massachusetts-tax-rates',
  verifiedAt: '2026-09-03T00:00:00.000Z',
};
const NC_SOURCE = {
  sourceName: 'NCDOR Tax Rate Schedules and Form NC-30 (2026 withholding), G.S. 105-153.7',
  sourceUrl: 'https://www.ncdor.gov/',
  verifiedAt: '2026-09-03T00:00:00.000Z',
};
const MN_SOURCE = {
  sourceName: 'Minnesota DOR rates and brackets; Minn. Stat. 290.0123 inflation-adjustment table for 2026',
  sourceUrl: 'https://www.revenue.state.mn.us/',
  verifiedAt: '2026-09-03T00:00:00.000Z',
};
const CA_SOURCE = {
  sourceName: 'California FTB 2025 indexed tax rate schedules and standard deduction',
  sourceUrl: 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2025/10.html',
  verifiedAt: '2026-09-03T00:00:00.000Z',
};
const NJ_SOURCE = {
  sourceName: 'New Jersey Division of Taxation, 2025 NJ-1040 gross income tax rate schedules',
  sourceUrl: 'https://www.nj.gov/treasury/taxation/nj1040faqs.shtml',
  verifiedAt: '2026-09-03T00:00:00.000Z',
};

/** 2026 federal standard deduction, for the states whose base or credit uses it. */
const FED_2026 = { single: 16_100, marriedFilingJointly: 32_200, marriedFilingSeparately: 16_100, headOfHousehold: 24_150 } as const;

export const STATE_GOLDEN_VECTORS: readonly StateGoldenVector[] = [
  /*
   * Colorado is the strongest kind of check available: the state prints a tax
   * table, and these three rows are read straight out of it. The engine is fed
   * gross wages, so each figure is the table's Colorado taxable income plus the
   * federal standard deduction that Colorado's base has already removed.
   *
   * The table quotes tax at each band's midpoint, so a fifth of a dollar of
   * disagreement is the table rounding, not the engine.
   */
  vector('CO', 'single', 39_150, 1_014, 'published-table', CO_SOURCE, { federalStandardDeduction: FED_2026.single }),
  vector('CO', 'single', 28_150, 530, 'published-table', CO_SOURCE, { federalStandardDeduction: FED_2026.single }),
  vector('CO', 'single', 21_250, 227, 'published-table', CO_SOURCE, { federalStandardDeduction: FED_2026.single }),

  /*
   * Mississippi's own filing thresholds are the check. The department says a
   * single resident files above $8,300 of gross income and a married resident
   * above $16,600 — which are exactly standard deduction plus exemption, so a
   * wrong figure for either shows up as tax owed at the threshold.
   */
  vector('MS', 'single', 8_300, 0, 'published-threshold', MS_RATES),
  vector('MS', 'marriedFilingJointly', 16_600, 0, 'published-threshold', MS_RATES),
  vector('MS', 'single', 60_000, 1_668, 'worked-from-schedule', MS_RATES),
  vector('MS', 'marriedFilingJointly', 100_000, 2_936, 'worked-from-schedule', MS_RATES),

  /*
   * Utah exercises the credit in all three of its states: fully available,
   * partly phased out, and phased out past the tax itself. The middle one is
   * the only one that would catch a wrong phase-out rate.
   */
  vector('UT', 'single', 45_000, 1_407.23, 'worked-from-schedule', UT_SOURCE, { federalStandardDeduction: FED_2026.single }),
  vector('UT', 'single', 90_000, 4_017.23, 'worked-from-schedule', UT_SOURCE, { federalStandardDeduction: FED_2026.single }),
  vector('UT', 'marriedFilingJointly', 150_000, 6_294.46, 'worked-from-schedule', UT_SOURCE, { federalStandardDeduction: FED_2026.marriedFilingJointly }),
  // Below the phase-out base the credit exceeds the tax, and Utah's line 22
  // says enter zero rather than a refund.
  vector('UT', 'single', 20_000, 0, 'worked-from-schedule', UT_SOURCE, { federalStandardDeduction: FED_2026.single }),

  /*
   * Kentucky prints the arithmetic itself: $39,240 of annual wages less the
   * $3,360 standard deduction is $35,880, and 3.5% of that is $1,255.80. That
   * one line pins the rate and the deduction together, which is more than
   * either figure proves alone.
   */
  vector('KY', 'single', 39_240, 1_255.80, 'published-example', KY_SOURCE),
  vector('KY', 'single', 90_000, 3_032.40, 'worked-from-schedule', KY_SOURCE),
  vector('KY', 'marriedFilingJointly', 150_000, 5_132.40, 'worked-from-schedule', KY_SOURCE),
  // Below the deduction Kentucky owes nothing rather than a negative figure.
  vector('KY', 'single', 3_360, 0, 'worked-from-schedule', KY_SOURCE),

  vector('IL', 'single', 60_000, 2_825.21, 'worked-from-schedule', IL_SOURCE),
  vector('IL', 'single', 120_000, 5_795.21, 'worked-from-schedule', IL_SOURCE),
  vector('IL', 'marriedFilingJointly', 150_000, 7_135.43, 'worked-from-schedule', IL_SOURCE),

  vector('PA', 'single', 45_000, 1_381.50, 'worked-from-schedule', PA_SOURCE),
  vector('PA', 'single', 90_000, 2_763.00, 'worked-from-schedule', PA_SOURCE),
  vector('PA', 'marriedFilingJointly', 150_000, 4_605.00, 'worked-from-schedule', PA_SOURCE),

  vector('MA', 'single', 60_000, 3_000, 'worked-from-schedule', MA_SOURCE),
  vector('MA', 'single', 150_000, 7_500, 'worked-from-schedule', MA_SOURCE),
  // Past the millionaire surtax threshold, which nothing else here reaches.
  vector('MA', 'single', 1_500_000, 90_690, 'worked-from-schedule', MA_SOURCE),

  vector('NC', 'single', 60_000, 1_885.27, 'worked-from-schedule', NC_SOURCE),
  vector('NC', 'single', 120_000, 4_279.27, 'worked-from-schedule', NC_SOURCE),
  vector('NC', 'marriedFilingJointly', 150_000, 4_967.55, 'worked-from-schedule', NC_SOURCE),

  vector('MN', 'single', 60_000, 2_556.61, 'worked-from-schedule', MN_SOURCE),
  vector('MN', 'single', 150_000, 8_941.94, 'worked-from-schedule', MN_SOURCE),
  vector('MN', 'marriedFilingJointly', 200_000, 10_813.05, 'worked-from-schedule', MN_SOURCE),

  vector('CA', 'single', 60_000, 1_792.53, 'worked-from-schedule', CA_SOURCE),
  vector('CA', 'single', 200_000, 14_507.98, 'worked-from-schedule', CA_SOURCE),
  vector('CA', 'marriedFilingJointly', 250_000, 15_065.96, 'worked-from-schedule', CA_SOURCE),

  vector('NJ', 'single', 60_000, 1_822.50, 'worked-from-schedule', NJ_SOURCE),
  vector('NJ', 'single', 150_000, 7_428.75, 'worked-from-schedule', NJ_SOURCE),
  vector('NJ', 'marriedFilingJointly', 200_000, 8_697.50, 'worked-from-schedule', NJ_SOURCE),
];
