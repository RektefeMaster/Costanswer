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
  extra: Partial<Pick<StateGoldenVector, 'federalStandardDeduction' | 'federalIncomeTax' | 'dependents' | 'toleranceDollars' | 'employeeFica'>> = {},
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
const VT_SOURCE = {
  sourceName: '2025 Vermont IN-111 instructions, tax rate schedules, tax tables and worked example',
  sourceUrl: 'https://tax.vermont.gov/sites/tax/files/documents/IN-111-Instr-2025.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const RI_SOURCE = {
  sourceName: '2025 Rhode Island Tax Tables and Tax Computation Worksheet',
  sourceUrl: 'https://tax.ri.gov/sites/g/files/xkgbur541/files/2026-01/2025%20RI%20Tax%20Tables_Full.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const NM_SOURCE = {
  sourceName: 'Laws 2024, Chapter 67 (H.B. 252), 7-2-7 NMSA 1978 as amended, with the 2025 PIT-1 low- and middle-income exemption worksheet',
  sourceUrl: 'https://www.nmlegis.gov/sessions/24%20Regular/final/HB0252.PDF',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const MI_SOURCE = {
  sourceName: 'Michigan Department of Treasury, Withholding Tax Information by Calendar Year 2026',
  sourceUrl: 'https://www.michigan.gov/taxes/business-taxes/withholding/calendar-year-tax-information',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const LA_SOURCE = {
  sourceName: '2026 Form R-1306, standard deduction amounts, with Act 11 for the 3% rate',
  sourceUrl: 'https://dam.ldr.la.gov/taxforms/1306-1-26.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const MO_SOURCE = {
  sourceName: '2025 Form MO-1040 instructions: federal tax percentage, tax rate chart and worksheet examples',
  sourceUrl: 'https://dor.mo.gov/forms/MO-1040%20Instructions_2025.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const AL_SOURCE = {
  sourceName: '2025 Form 40 booklet standard deduction chart and 2025 Form 40A tax tables (Brown example)',
  sourceUrl: 'https://www.revenue.alabama.gov/wp-content/uploads/2026/01/25f40bk.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const KS_SOURCE = {
  sourceName: '2025 Kansas Individual Income Tax Booklet (K-40), tax tables and K.S.A. 79-32,110b',
  sourceUrl: 'https://www.ksrevenue.gov/incomebook25.html',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const VA_SOURCE = {
  sourceName: '2025 Form 760 Resident Individual Income Tax Instructions, tax rate schedule example',
  sourceUrl: 'https://www.tax.virginia.gov/sites/default/files/vatax-pdf/2025-760-instructions.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const WV_SOURCE = {
  sourceName: 'W.Va. Code §11-21-4j rate table and §11-21-16 personal exemption',
  sourceUrl: 'https://code.wvlegislature.gov/11-21-4J/',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const WI_SOURCE = {
  sourceName: '2026 Form 1-ES instructions: standard deduction schedules and tax rate schedules',
  sourceUrl: 'https://www.revenue.wi.gov/TaxForms2026/2026-Form1-ES-Inst.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const ID_SOURCE = {
  sourceName: '2025 Form 40 packet (EIN00046) tax worksheet and standard deduction worksheet',
  sourceUrl: 'https://tax.idaho.gov/wp-content/uploads/forms/EIN00046/EIN00046_03-02-2026.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const NE_SOURCE = {
  sourceName: '2026 Form 1040N-ES estimated income tax rate schedule and standard deduction',
  sourceUrl: 'https://revenue.nebraska.gov/sites/default/files/doc/tax-forms/2025/f_1040N-ES.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const GA_SOURCE = {
  sourceName: '2026 Employer\'s Tax Guide (updated June 2026), 4.99% rate and standard deduction',
  sourceUrl: 'https://dor.georgia.gov/document/document/2026-employers-tax-guide-updated-june-2026/download',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const AZ_SOURCE = {
  sourceName: 'A.R.S. 43-1011 and Arizona DOR 2025 Individual Income Tax Highlights',
  sourceUrl: 'https://azdor.gov/forms/individual-income-tax-highlights',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const CT_SOURCE = {
  sourceName: '2025 Form CT-1040 TCS Tables A–E (exemption, initial tax, 2% add-back, recapture, personal tax credits)',
  sourceUrl: 'https://portal.ct.gov/-/media/drs/forms/2025/income/ct-1040-tcs_1225.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const IN_SOURCE = {
  sourceName: 'SEA 451 (2025) IC 6-3-2-1 2.95% rate and DOR Information Bulletin #117 personal exemptions',
  sourceUrl: 'https://iga.in.gov/pdf-documents/124/2025/senate/bills/SB0451/SB0451.04.ENRH.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const OR_SOURCE = {
  sourceName: '2025 Publication OR-40-FY, Form OR-40 instructions: tax tables and tax rate charts',
  sourceUrl: 'https://www.oregon.gov/dor/forms/FormsPubs/form-or-40-inst_101-040-1_2025.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const MD_SOURCE = {
  sourceName: 'Comptroller of Maryland, 2025 Maryland Income Tax Rates and Brackets',
  sourceUrl: 'https://www.marylandtaxes.gov/individual/income/tax-info/tax-rates.php',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const AR_SOURCE = {
  sourceName: '2025 Arkansas Tax Tables (low income and regular) and 2025 Indexed Tax Brackets',
  sourceUrl: 'https://www.dfa.arkansas.gov/wp-content/uploads/2025_TaxTables.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const DE_SOURCE = {
  sourceName: '2025 Delaware Income Tax Table and State Income Tax Schedule',
  sourceUrl: 'https://revenuefiles.delaware.gov/2025/TY25_taxtable.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const OH_SOURCE = {
  sourceName: 'R.C. 5747.02(A)(3)(c) and 5747.025 as amended by H.B. 96, tax year 2026',
  sourceUrl: 'https://codes.ohio.gov/ohio-revised-code/section-5747.02',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const DC_SOURCE = {
  sourceName: 'DC Individual and Fiduciary Income Tax Rates (tax years after 12/31/2021)',
  sourceUrl: 'https://otr.cfo.dc.gov/page/dc-individual-and-fiduciary-income-tax-rates',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const HI_SOURCE = {
  sourceName: 'DOT Announcement 2024-03 (Act 46, SLH 2024) 2026 standard deduction, with 2025 N-11 Tax Rate Schedules I–III',
  sourceUrl: 'https://files.hawaii.gov/tax/news/announce/ann24-03.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const OK_SOURCE = {
  sourceName: 'Enrolled H.B. 2764 amending 68 O.S. 2355(D) for tax year 2026',
  sourceUrl: 'https://www.oklegislature.gov/cf_pdf/2025-26%20ENR/hB/HB2764%20ENR.PDF',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const IA_SOURCE = {
  sourceName: 'Iowa IA 1040 Expanded Instructions (instruction year 2025), lines 2, 5 and 8',
  sourceUrl: 'https://revenue.iowa.gov/taxes/tax-guidance/individual-income-tax/1040-expanded-instructions/iowa-tax',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const NY_SOURCE = {
  sourceName: '2026 Form IT-2105-I, New York State tax rates, standard deduction table and tax computation worksheets',
  sourceUrl: 'https://www.tax.ny.gov/pdf/current_forms/it/it2105i.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const MT_SOURCE = {
  sourceName: '2026 Montana Publication 1 ordinary-income tax tables (HB 337)',
  sourceUrl: 'https://revenuefiles.mt.gov/files/Forms/Publication-1/Publication-1-2026.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const ND_SOURCE = {
  sourceName: 'North Dakota Office of State Tax Commissioner, Individual Income Tax rate tables (tax year 2025)',
  sourceUrl: 'https://www.tax.nd.gov/individual-income-tax',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const SC_SOURCE = {
  sourceName: 'SCDOR Information Letter #26-20, 2026 legislative update',
  sourceUrl: 'https://dor.sc.gov/sites/dor/files/policies/IL26-20.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const ME_SOURCE = {
  sourceName: 'State of Maine, 2026 Individual Income Tax Rates (revised May 20, 2026)',
  sourceUrl: 'https://www.maine.gov/revenue/sites/maine.gov.revenue/files/2026-05/ind_tax_rate_sched_2026_rev.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
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
const AL_DEPENDENT_SOURCE = {
  sourceName: '2025 Form 40 booklet, page 8 dependent exemption chart, with the tax tables on pages 25–33',
  sourceUrl: 'https://www.revenue.alabama.gov/wp-content/uploads/2026/01/25f40bk.pdf',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const NC_CHILD_SOURCE = {
  sourceName: '2025 Form D-401 instructions, Child Deduction Table and Child Deduction Worksheet',
  sourceUrl: 'https://www.ncdor.gov/2025-d-401-individual-income-tax-instructions/open',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const NC_SOURCE = {
  sourceName: 'NCDOR Tax Rate Schedules (3.99% after 2025) and G.S. 105-153.5',
  sourceUrl: 'https://www.ncdor.gov/taxes-forms/individual-income-tax/tax-rate-schedules',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const MN_SOURCE = {
  sourceName: 'Minnesota DOR 2026 rates and brackets; Inflation Adjusted Amounts for 2026 (290.0123)',
  sourceUrl: 'https://www.revenue.state.mn.us/minnesota-income-tax-rates-and-brackets',
  verifiedAt: '2026-09-07T00:00:00.000Z',
};
const CA_SOURCE = {
  sourceName: 'California FTB 2025 indexed tax rate schedules and standard deduction',
  sourceUrl: 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2025/10.html',
  verifiedAt: '2026-09-03T00:00:00.000Z',
};
const NJ_SOURCE = {
  sourceName: 'New Jersey Division of Taxation GIT overview and 2025 NJ-1040 instructions',
  sourceUrl: 'https://www.nj.gov/treasury/taxation/git_over.shtml',
  verifiedAt: '2026-09-07T00:00:00.000Z',
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
  vector('CO', 'marriedFilingJointly', 100_000, 2_983.20, 'worked-from-schedule', CO_SOURCE, { federalStandardDeduction: FED_2026.marriedFilingJointly }),
  vector('CO', 'single', 350_000, 14_872, 'worked-from-schedule', CO_SOURCE, { federalStandardDeduction: FED_2026.single }),

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

  /*
   * Maine prints the cumulative tax at each bracket edge — $1,589 and $4,117
   * single, $3,181 filing jointly — so these vectors check the thresholds and
   * the rates against the state's own arithmetic rather than a repeat of ours.
   * Each gross figure is the bracket edge plus that status's deduction and
   * exemption, chosen below the phase-out start so nothing else is in play.
   */
  /*
   * South Carolina publishes the same schedule two ways — marginal bands, and
   * "5.21% of taxable income minus $966" — and the second is an independent
   * check on the first. Both AGI figures sit at the top of the full-deduction
   * range, so the deduction is exactly the SCIAD and nothing else is moving.
   * $40,000 single leaves $25,000 taxable at 1.99%; $80,000 filing jointly
   * leaves $50,000, where the state's formula gives $2,605 - $966 = $1,639.
   */
  /*
   * North Dakota's zero bracket reaches $48,475 of taxable income, so a
   * $60,000 salary owes nothing at all — the vector that would catch a
   * threshold accidentally transcribed as a deduction.
   */
  /*
   * Montana Publication 1 2026: 4.7% to $47,500 single, then 5.65%. $66,100 of
   * wages less the 2026 federal standard deduction is $50,000 of Montana
   * taxable income, which is $2,373.75.
   */
  /*
   * Oklahoma 2026 rates are the statute, not the 2025 Form 511 table. Each
   * gross amount is taxable income plus the statutory deduction and exemption.
   */
  /*
   * Hawaii's 2026 standard deduction is the Act 46 amount. Gross figures are
   * the 2025 N-11 bracket-edge taxable incomes plus that 2026 deduction and
   * the $1,144 exemption, so the published running totals still apply.
   */
  /*
   * The District publishes the cumulative tax at all six of its bracket edges
   * and every one reproduces to the cent, so these check thresholds rather
   * than repeating the arithmetic that produced them.
   */
  /*
   * Ohio 2026 (H.B. 96): $0 at or below $26,050, then $332 plus 2.75% of the
   * excess. The 2025 $1,497 Mitchell example is the $342 base, not used here.
   * $500,000 is the MAGI cutoff at which the personal exemption disappears.
   */
  /*
   * Each Delaware figure is the state's own table or schedule amount less the
   * $110-a-person credit it publishes separately, since the table stops at the
   * tax and the credit comes off afterwards. The bands are what is being
   * checked, and the state prints them at four points: $2,112 at $45,025 of
   * taxable income, $2,390 at $50,025, $2,943.50 at $60,000, and its worked
   * example of $3,455.06 at $67,751.
   */
  /*
   * Arkansas is checked on both of its schedules. The first three are read out
   * of the Low Income Tax Table, where a single filer owes nothing to $14,643;
   * the last two out of the regular table, less the $29 credit it does not
   * include. $97,221 of wages sits inside the stretch where the bracket
   * adjustment is being taken back, which is the part that would be missing if
   * only the headline bands had been transcribed.
   */
  /*
   * Maryland prints the cumulative tax at each band edge, and each gross figure
   * below is that edge plus the deduction and exemption that apply at it. The
   * last two sit above $150,000 of adjusted gross income, where the exemption
   * staircase has already run out — which is what makes them a check on the
   * staircase and not only on the brackets.
   */
  /*
   * Oregon's tax depends on the federal figure, so each vector states it.
   * Zero federal tax isolates the schedule itself: $25,885 of wages less the
   * $2,835 deduction is $23,050 of taxable income, where the state's table
   * prints $1,707 before the $256 exemption credit. The last two exercise the
   * parts that only appear higher up — the subtraction cap stepping down, and
   * the credit switching off entirely above $100,000.
   */
  vector('VT', 'marriedFilingJointly', 110_900, 2_929, 'published-example', VT_SOURCE),
  // IN-111 tax tables: $50,000–$50,100 of Vermont taxable income, single, is $1,698.
  // $63,000 of wages less the $7,650 deduction and $5,300 exemption is the $50,050 midpoint.
  vector('VT', 'single', 63_000, 1_698, 'published-table', VT_SOURCE),
  vector('VT', 'single', 63_000, 1_499.125, 'worked-from-schedule', VT_SOURCE, { dependents: 1 }),
  vector('VT', 'single', 12_950, 0, 'worked-from-schedule', VT_SOURCE),

  vector('RI', 'single', 41_325, 950, 'published-table', RI_SOURCE),
  // Table row $50,000–$50,050 prints $1,876, not the exact 3.75% of $50,000 ($1,875).
  // $66,025 of wages less the $10,900 deduction and $5,100 exemption is the $50,025 midpoint.
  vector('RI', 'single', 66_025, 1_876, 'published-table', RI_SOURCE),
  vector('RI', 'single', 66_025, 1_684.6875, 'worked-from-schedule', RI_SOURCE, { dependents: 1 }),
  vector('RI', 'single', 116_000, 3_951, 'worked-from-schedule', RI_SOURCE),
  vector('RI', 'marriedFilingJointly', 100_000, 2_550, 'worked-from-schedule', RI_SOURCE),

  vector('NM', 'single', 82_250, 2_716.50, 'published-example', NM_SOURCE),
  vector('NM', 'marriedFilingJointly', 81_500, 1_739, 'published-example', NM_SOURCE),
  // PIT packet table: $25,300–$25,400 of taxable income, married filing jointly, is $679.
  // $56,850 of wages less the $31,500 federal standard deduction is the $25,350 midpoint.
  vector('NM', 'marriedFilingJointly', 56_850, 679, 'published-table', NM_SOURCE),
  // Inside the low- and middle-income exemption phase-out, which the bracket
  // edges never reach: $30,000 of AGI keeps $1,000 of the $2,500.
  vector('NM', 'single', 30_000, 330.50, 'worked-from-schedule', NM_SOURCE),
  vector('NM', 'single', 30_000, 298.50, 'worked-from-schedule', NM_SOURCE, { dependents: 1 }),
  vector('NM', 'single', 15_750, 0, 'worked-from-schedule', NM_SOURCE),

  vector('MI', 'single', 60_000, 2_299.25, 'worked-from-schedule', MI_SOURCE),
  vector('MI', 'single', 60_000, 2_048.50, 'worked-from-schedule', MI_SOURCE, { dependents: 1 }),
  vector('MI', 'marriedFilingJointly', 120_000, 4_598.50, 'worked-from-schedule', MI_SOURCE),
  vector('MI', 'single', 5_900, 0, 'worked-from-schedule', MI_SOURCE),

  vector('LA', 'single', 60_000, 1_413.75, 'worked-from-schedule', LA_SOURCE),
  vector('LA', 'marriedFilingJointly', 100_000, 2_227.50, 'worked-from-schedule', LA_SOURCE),
  // At the deduction Louisiana owes nothing rather than a negative figure.
  vector('LA', 'single', 12_875, 0, 'worked-from-schedule', LA_SOURCE),

  vector('OR', 'single', 25_885, 1_451, 'published-table', OR_SOURCE, { federalIncomeTax: 0 }),
  vector('OR', 'marriedFilingJointly', 28_720, 885, 'published-table', OR_SOURCE, { federalIncomeTax: 0 }),
  vector('OR', 'single', 52_835, 3_809, 'published-table', OR_SOURCE, { federalIncomeTax: 0 }),
  vector('OR', 'marriedFilingJointly', 65_670, 4_119, 'published-table', OR_SOURCE, { federalIncomeTax: 0 }),
  vector('OR', 'single', 127_835, 10_032.50, 'worked-from-schedule', OR_SOURCE, { federalIncomeTax: 20_000 }),
  vector('OR', 'single', 150_000, 12_821.34, 'worked-from-schedule', OR_SOURCE, { federalIncomeTax: 25_000 }),

  vector('MD', 'single', 9_550, 90, 'published-table', MD_SOURCE),
  vector('MD', 'single', 96_550, 4_222.50, 'published-table', MD_SOURCE),
  vector('MD', 'marriedFilingJointly', 113_100, 4_697.50, 'published-table', MD_SOURCE),
  vector('MD', 'single', 153_350, 7_260, 'published-table', MD_SOURCE),
  vector('MD', 'single', 253_350, 12_760, 'published-table', MD_SOURCE),

  vector('AR', 'single', 14_643, 0, 'published-table', AR_SOURCE),
  vector('AR', 'single', 17_450, 222, 'published-table', AR_SOURCE),
  vector('AR', 'marriedFilingJointly', 28_950, 524, 'published-table', AR_SOURCE),
  vector('AR', 'headOfHousehold', 20_950, 77, 'published-table', AR_SOURCE),
  vector('AR', 'single', 96_521, 3_219, 'published-table', AR_SOURCE),
  vector('AR', 'single', 97_221, 3_267, 'published-table', AR_SOURCE),

  vector('DE', 'single', 48_275, 2_002, 'published-table', DE_SOURCE),
  vector('DE', 'marriedFilingJointly', 56_525, 2_170, 'published-table', DE_SOURCE),
  vector('DE', 'single', 63_250, 2_833.50, 'published-table', DE_SOURCE),
  vector('DE', 'single', 71_001, 3_345.06, 'published-example', DE_SOURCE),

  vector('OH', 'single', 26_050, 0, 'published-threshold', OH_SOURCE),
  vector('OH', 'single', 40_000, 649.625, 'worked-from-schedule', OH_SOURCE),
  vector('OH', 'single', 70_200, 1_487, 'worked-from-schedule', OH_SOURCE),
  vector('OH', 'single', 102_150, 2_372.50, 'worked-from-schedule', OH_SOURCE),
  vector('OH', 'single', 500_000, 13_365.625, 'worked-from-schedule', OH_SOURCE),

  vector('DC', 'headOfHousehold', 32_500, 400, 'published-table', DC_SOURCE),
  vector('DC', 'marriedFilingJointly', 70_000, 2_200, 'published-table', DC_SOURCE),
  vector('DC', 'single', 75_000, 3_500, 'published-table', DC_SOURCE),
  vector('DC', 'single', 265_000, 19_650, 'published-table', DC_SOURCE),

  vector('HI', 'single', 33_144, 859, 'published-table', HI_SOURCE),
  vector('HI', 'single', 134_144, 8_391, 'published-table', HI_SOURCE),
  vector('HI', 'marriedFilingJointly', 114_288, 5_078, 'published-table', HI_SOURCE),
  vector('HI', 'headOfHousehold', 85_144, 3_809, 'published-table', HI_SOURCE),

  vector('OK', 'single', 11_100, 0, 'published-threshold', OK_SOURCE),
  vector('OK', 'single', 22_125, 450.125, 'worked-from-schedule', OK_SOURCE),
  vector('OK', 'marriedFilingJointly', 29_475, 235.375, 'worked-from-schedule', OK_SOURCE),
  vector('OK', 'single', 107_350, 4_285.25, 'worked-from-schedule', OK_SOURCE),
  vector('OK', 'marriedFilingJointly', 114_700, 4_070.50, 'worked-from-schedule', OK_SOURCE),

  vector('IA', 'single', 60_000, 1_628.20, 'worked-from-schedule', IA_SOURCE, { federalStandardDeduction: FED_2026.single }),
  vector('IA', 'marriedFilingJointly', 100_000, 2_496.40, 'worked-from-schedule', IA_SOURCE, { federalStandardDeduction: FED_2026.marriedFilingJointly }),
  // At the federal standard deduction Iowa's base is zero, and the exemption
  // credit stays a credit rather than becoming a payment.
  vector('IA', 'single', 16_100, 0, 'worked-from-schedule', IA_SOURCE, { federalStandardDeduction: FED_2026.single }),

  vector('MT', 'single', 66_100, 2_373.75, 'worked-from-schedule', MT_SOURCE, { federalStandardDeduction: FED_2026.single }),
  vector('MT', 'single', 40_000, 1_123.30, 'worked-from-schedule', MT_SOURCE, { federalStandardDeduction: FED_2026.single }),
  vector('MT', 'marriedFilingJointly', 150_000, 5_753.20, 'worked-from-schedule', MT_SOURCE, { federalStandardDeduction: FED_2026.marriedFilingJointly }),

  vector('NY', 'single', 8_000, 0, 'published-threshold', NY_SOURCE),
  vector('NY', 'single', 88_650, 4_191, 'published-table', NY_SOURCE),
  // $27,900 joint edge plus the $16,050 standard deduction; NYAGI is below the recapture floor.
  vector('NY', 'marriedFilingJointly', 43_950, 1_174, 'published-table', NY_SOURCE),
  // Same $161,550 taxable-income edge, but wage NYAGI is above $157,650 so worksheet 1 is a flat 5.40%.
  vector('NY', 'marriedFilingJointly', 177_600, 8_723.70, 'worked-from-schedule', NY_SOURCE),
  vector('NY', 'single', 150_000, 8_291.19545, 'worked-from-schedule', NY_SOURCE),
  vector('NY', 'headOfHousehold', 11_200, 0, 'published-threshold', NY_SOURCE),

  vector('ND', 'single', 60_000, 0, 'worked-from-schedule', ND_SOURCE, { federalStandardDeduction: FED_2026.single }),
  vector('ND', 'single', 100_000, 690.79, 'worked-from-schedule', ND_SOURCE, { federalStandardDeduction: FED_2026.single }),
  vector('ND', 'single', 300_000, 4_805.70, 'worked-from-schedule', ND_SOURCE, { federalStandardDeduction: FED_2026.single }),
  vector('ND', 'marriedFilingJointly', 150_000, 718.09, 'worked-from-schedule', ND_SOURCE, { federalStandardDeduction: FED_2026.marriedFilingJointly }),

  vector('SC', 'single', 40_000, 497.50, 'published-example', SC_SOURCE),
  vector('SC', 'marriedFilingJointly', 80_000, 1_639, 'published-example', SC_SOURCE),
  // Inside the SCIAD phase-out, including its round-down-to-$10 rule.
  vector('SC', 'single', 60_000, 1_662.44, 'worked-from-schedule', SC_SOURCE),
  vector('SC', 'marriedFilingJointly', 150_000, 6_280.59, 'worked-from-schedule', SC_SOURCE),

  vector('ME', 'single', 48_400, 1_589, 'published-table', ME_SOURCE),
  vector('ME', 'single', 85_850, 4_117, 'published-table', ME_SOURCE),
  vector('ME', 'marriedFilingJointly', 96_850, 3_181, 'published-table', ME_SOURCE),
  // Inside the deduction phase-out band, which the bracket edges never reach.
  vector('ME', 'single', 120_000, 6_824.47, 'worked-from-schedule', ME_SOURCE),

  vector('IL', 'single', 60_000, 2_825.21, 'worked-from-schedule', IL_SOURCE),
  vector('IL', 'single', 60_000, 2_680.425, 'worked-from-schedule', IL_SOURCE, { dependents: 1 }),
  vector('IL', 'single', 120_000, 5_795.21, 'worked-from-schedule', IL_SOURCE),
  vector('IL', 'marriedFilingJointly', 150_000, 7_135.43, 'worked-from-schedule', IL_SOURCE),

  vector('PA', 'single', 45_000, 1_381.50, 'worked-from-schedule', PA_SOURCE),
  vector('PA', 'single', 90_000, 2_763.00, 'worked-from-schedule', PA_SOURCE),
  vector('PA', 'marriedFilingJointly', 150_000, 4_605.00, 'worked-from-schedule', PA_SOURCE),

  vector('MA', 'single', 60_000, 2_680, 'worked-from-schedule', MA_SOURCE, { employeeFica: 4_590 }),
  vector('MA', 'marriedFilingJointly', 100_000, 4_460, 'worked-from-schedule', MA_SOURCE, { employeeFica: 7_650 }),
  vector('MA', 'single', 150_000, 7_180, 'worked-from-schedule', MA_SOURCE, { employeeFica: 11_475 }),
  vector('MA', 'single', 1_500_000, 90_114, 'worked-from-schedule', MA_SOURCE, { employeeFica: 44_889 }),

  vector('NC', 'single', 60_000, 1_885.27, 'worked-from-schedule', NC_SOURCE),
  vector('NC', 'single', 120_000, 4_279.27, 'worked-from-schedule', NC_SOURCE),
  vector('NC', 'marriedFilingJointly', 150_000, 4_967.55, 'worked-from-schedule', NC_SOURCE),

  /*
   * Three steps of the child deduction staircase and the cliff at the top of
   * it. North Carolina prints no worked example and its tax is a flat rate, so
   * the expected figures are arithmetic on the published table rather than
   * numbers the state itself printed — which is what worked-from-schedule
   * means and why these are not labelled published-table.
   */
  // Single, $35,000 of AGI: the $2,000 band. Two children are worth $4,000.
  vector('NC', 'single', 35_000, 728.17, 'worked-from-schedule', NC_CHILD_SOURCE, { dependents: 2 }),
  // Joint, $95,000: the $1,500 band, which starts $40,000 higher than single.
  vector('NC', 'marriedFilingJointly', 95_000, 2_593.50, 'worked-from-schedule', NC_CHILD_SOURCE, { dependents: 3 }),
  // Head of household, $70,000: the $1,500 band on its own third staircase.
  vector('NC', 'headOfHousehold', 70_000, 1_970.06, 'worked-from-schedule', NC_CHILD_SOURCE, { dependents: 1 }),
  /*
   * Above $70,000 single the table pays nothing at all. This row is the one
   * that fails if the staircase is ever given a floor it does not have.
   */
  vector('NC', 'single', 75_000, 2_483.78, 'worked-from-schedule', NC_CHILD_SOURCE, { dependents: 2 }),

  vector('MN', 'single', 15_300, 0, 'published-threshold', MN_SOURCE),
  vector('MN', 'single', 60_000, 2_556.61, 'worked-from-schedule', MN_SOURCE),
  vector('MN', 'single', 150_000, 8_941.94, 'worked-from-schedule', MN_SOURCE),
  vector('MN', 'marriedFilingJointly', 200_000, 10_813.05, 'worked-from-schedule', MN_SOURCE),
  vector('MN', 'single', 250_000, 17_439.488, 'worked-from-schedule', MN_SOURCE),
  // Second-rate limitation band (3% then 10%), still short of the 80% floor.
  vector('MN', 'single', 400_000, 33_086.607, 'worked-from-schedule', MN_SOURCE),
  // AGI above $1,107,750 forces the 80% cut; the deduction is not zeroed.
  vector('MN', 'single', 1_200_000, 112_203.58, 'worked-from-schedule', MN_SOURCE),

  vector('CA', 'single', 60_000, 1_792.53, 'worked-from-schedule', CA_SOURCE),
  vector('CA', 'single', 200_000, 14_507.98, 'worked-from-schedule', CA_SOURCE),
  vector('CA', 'marriedFilingJointly', 250_000, 15_065.96, 'worked-from-schedule', CA_SOURCE),

  vector('NJ', 'single', 10_000, 0, 'published-threshold', NJ_SOURCE),
  vector('NJ', 'marriedFilingJointly', 20_000, 0, 'published-threshold', NJ_SOURCE),
  vector('NJ', 'single', 20_000, 266, 'worked-from-schedule', NJ_SOURCE),
  vector('NJ', 'single', 60_000, 1_767.25, 'worked-from-schedule', NJ_SOURCE),
  vector('NJ', 'single', 150_000, 7_365.05, 'worked-from-schedule', NJ_SOURCE),
  vector('NJ', 'marriedFilingJointly', 200_000, 8_570.10, 'worked-from-schedule', NJ_SOURCE),

  /*
   * Missouri's worksheet prints the chart arithmetic and rounds to the nearest
   * dollar. Example A is $3,090 of Missouri taxable income → $37.60 → $38.
   * Gross wages of $18,840 less the $15,750 standard deduction, with no federal
   * tax to subtract, is that $3,090.
   */
  vector('MO', 'single', 18_840, 38, 'published-example', MO_SOURCE, { federalIncomeTax: 0 }),
  vector('MO', 'single', 27_750, 388, 'published-example', MO_SOURCE, { federalIncomeTax: 0 }),
  // Combined-return estimated-tax example: annualized TI $88,500 → $3,984.
  vector('MO', 'marriedFilingJointly', 120_000, 3_984, 'published-example', MO_SOURCE, { federalIncomeTax: 0 }),
  // Line 12 example 1: Missouri AGI $22,450 is 35% of federal tax, then capped.
  vector('MO', 'single', 22_450, 124.18, 'worked-from-schedule', MO_SOURCE, { federalIncomeTax: 2_000 }),
  // Head of household: $23,625 deduction plus the $1,400 Line 15 exemption.
  vector('MO', 'headOfHousehold', 40_000, 527.85, 'worked-from-schedule', MO_SOURCE, { federalIncomeTax: 0 }),

  /*
   * Alabama's tax table: $23,300–$23,400 of taxable income is $1,128 single /
   * head of family and $1,088 married filing jointly. The Browns' $23,360 is
   * that row. Gross wages here are constructed so that the official deduction
   * chart, personal exemption and federal-tax subtraction land on that
   * taxable income — a wrong row of the chart would miss the published tax.
   */
  vector('AL', 'marriedFilingJointly', 40_000, 1_088, 'published-table', AL_SOURCE, { federalIncomeTax: 8_640 }),
  vector('AL', 'single', 40_000, 1_128, 'published-table', AL_SOURCE, { federalIncomeTax: 12_640 }),
  vector('AL', 'headOfHousehold', 40_000, 1_128, 'published-table', AL_SOURCE, { federalIncomeTax: 11_140 }),
  // Interior row of the joint standard-deduction chart: $30,000–$30,499 is $6,925.
  vector('AL', 'marriedFilingJointly', 30_000, 923.75, 'worked-from-schedule', AL_SOURCE, { federalIncomeTax: 0 }),
  // Separate filers use the $250-band chart, not half of the joint $500-band one.
  vector('AL', 'marriedFilingSeparately', 13_500, 360.70, 'worked-from-schedule', AL_SOURCE, { federalIncomeTax: 0 }),

  /*
   * Alabama's dependent chart, one row per step, each landing on a figure the
   * state printed in its own tax table.
   *
   * Federal income tax is held at one value across the first three so that the
   * only thing moving is the dependent allowance: each extra dependent needs
   * exactly $1,000 more of gross wages to stay on the $23,300–$23,400 row that
   * prints $1,088 joint. A chart read one band off would move the taxable
   * income and miss the printed figure.
   */
  vector('AL', 'marriedFilingJointly', 41_000, 1_088, 'published-table', AL_DEPENDENT_SOURCE, { federalIncomeTax: 8_640, dependents: 1 }),
  vector('AL', 'marriedFilingJointly', 42_000, 1_088, 'published-table', AL_DEPENDENT_SOURCE, { federalIncomeTax: 8_640, dependents: 2 }),
  vector('AL', 'marriedFilingJointly', 43_000, 1_088, 'published-table', AL_DEPENDENT_SOURCE, { federalIncomeTax: 8_640, dependents: 3 }),
  // $500 band: Alabama AGI $55,050 is over $50,000, so two dependents are worth
  // $1,000, not $2,000. Taxable income $44,050 prints $2,163 single.
  vector('AL', 'single', 55_050, 2_163, 'published-table', AL_DEPENDENT_SOURCE, { federalIncomeTax: 6_000, dependents: 2 }),
  // $300 band: over $100,000 of Alabama AGI. Taxable $79,450 prints $3,933.
  vector('AL', 'single', 102_050, 3_933, 'published-table', AL_DEPENDENT_SOURCE, { federalIncomeTax: 18_000, dependents: 2 }),

  /*
   * Kansas tax table: $59,951–$60,000 of Kansas taxable income is $3,259
   * single / head of household / separate and $3,172 joint. Gross wages here
   * put the official deduction and exemption on that row.
   */
  vector('KS', 'single', 72_740, 3_259, 'published-table', KS_SOURCE),
  vector('KS', 'marriedFilingJointly', 86_535, 3_172, 'published-table', KS_SOURCE),
  // Standard deduction plus exemption: a single filer at $12,765 owes nothing.
  vector('KS', 'single', 12_765, 0, 'published-threshold', KS_SOURCE),
  // Head of household takes the extra $2,320 exemption the other "all other" statuses do not.
  vector('KS', 'headOfHousehold', 40_000, 1_161.68, 'worked-from-schedule', KS_SOURCE),

  /*
   * Virginia's own rate-schedule example: $90,000 of Virginia taxable income
   * is $4,917.50, rounded to $4,918. $99,680 of wages less the $8,750
   * deduction and $930 exemption is that $90,000.
   */
  vector('VA', 'single', 99_680, 4_918, 'published-example', VA_SOURCE),
  vector('VA', 'single', 11_949, 0, 'published-threshold', VA_SOURCE),
  vector('VA', 'marriedFilingJointly', 150_000, 7_254.30, 'worked-from-schedule', VA_SOURCE),
  vector('VA', 'headOfHousehold', 99_680, 4_918, 'worked-from-schedule', VA_SOURCE),

  /*
   * West Virginia's 2026 statute prints the tax at each threshold. $12,000 of
   * wages less the $2,000 exemption is $10,000 of taxable income, which the
   * table states is $211.
   */
  vector('WV', 'single', 12_000, 211, 'published-example', WV_SOURCE),
  vector('WV', 'single', 27_000, 632.50, 'published-example', WV_SOURCE),
  vector('WV', 'marriedFilingJointly', 14_000, 211, 'published-example', WV_SOURCE),
  vector('WV', 'marriedFilingSeparately', 7_000, 105.50, 'published-example', WV_SOURCE),

  /*
   * Wisconsin 2026 Form 1-ES prints the tax at each taxable-income threshold.
   * Gross wages here are constructed so the official deduction formula and
   * $700 exemption land on that taxable income. Head of household is on the
   * second (12%) stage of its two-rate schedule at $80,000; a one-stage
   * 22.515% phase-out would miss it.
   */
  vector('WI', 'single', 28_736.07, 528.85, 'published-example', WI_SOURCE),
  vector('WI', 'marriedFilingJointly', 44_360.18, 705.25, 'published-example', WI_SOURCE),
  vector('WI', 'marriedFilingSeparately', 21_527.75, 352.80, 'published-example', WI_SOURCE),
  vector('WI', 'headOfHousehold', 20_119, 48.615, 'worked-from-schedule', WI_SOURCE),
  vector('WI', 'headOfHousehold', 80_000, 3_240.32, 'worked-from-schedule', WI_SOURCE),
  vector('WI', 'single', 20_000, 186.90, 'worked-from-schedule', WI_SOURCE),
  vector('WI', 'single', 20_119, 191.065, 'worked-from-schedule', WI_SOURCE),
  vector('WI', 'single', 136_453, 6_591.37, 'worked-from-schedule', WI_SOURCE),
  vector('WI', 'headOfHousehold', 58_827, 2_011.73, 'worked-from-schedule', WI_SOURCE),

  /*
   * Idaho 2025 Form 40 worksheet: 5.3% of taxable income over $4,811 single
   * or $9,622 joint/HOH. $20,561 and $33,247 are those floors after the
   * printed 2025 federal standard deduction.
   */
  vector('ID', 'single', 20_561, 0, 'published-threshold', ID_SOURCE),
  vector('ID', 'single', 30_561, 530, 'published-example', ID_SOURCE),
  vector('ID', 'headOfHousehold', 33_247, 0, 'published-threshold', ID_SOURCE),
  vector('ID', 'marriedFilingJointly', 50_000, 470.534, 'worked-from-schedule', ID_SOURCE),
  vector('ID', 'single', 20_562, 0.053, 'published-threshold', ID_SOURCE),

  /*
   * Nebraska 2026 1040N-ES: $24,760 of taxable income is $825.71 on the
   * single schedule, then the $176 personal exemption credit. Head of
   * household uses a wider first band and a larger standard deduction.
   */
  vector('NE', 'single', 33_610, 649.71, 'published-example', NE_SOURCE),
  vector('NE', 'single', 12_980, 0, 'published-threshold', NE_SOURCE),
  vector('NE', 'marriedFilingJointly', 67_230, 1_299.88, 'published-example', NE_SOURCE),
  vector('NE', 'headOfHousehold', 30_000, 341.605, 'worked-from-schedule', NE_SOURCE),

  vector('GA', 'single', 15_000, 0, 'published-threshold', GA_SOURCE),
  vector('GA', 'single', 50_000, 1_746.50, 'worked-from-schedule', GA_SOURCE),
  vector('GA', 'marriedFilingJointly', 50_000, 998, 'worked-from-schedule', GA_SOURCE),
  vector('GA', 'headOfHousehold', 50_000, 1_746.50, 'worked-from-schedule', GA_SOURCE),

  vector('AZ', 'single', 15_750, 0, 'published-threshold', AZ_SOURCE),
  vector('AZ', 'single', 40_000, 606.25, 'worked-from-schedule', AZ_SOURCE),
  vector('AZ', 'marriedFilingJointly', 50_000, 462.50, 'worked-from-schedule', AZ_SOURCE),
  vector('AZ', 'headOfHousehold', 40_000, 409.375, 'worked-from-schedule', AZ_SOURCE),

  /*
   * Connecticut TCS Table B example: $13,000 of taxable income is $335. At
   * $28,000 of Connecticut AGI the Table A exemption is $15,000, which lands
   * on that example; Tables C and D are zero and Table E is 15%, so the
   * published $335 becomes $284.75 after the credit. Recapture is $0 at
   * $105,000 AGI and $25 just above it.
   */
  vector('CT', 'single', 15_000, 0, 'published-threshold', CT_SOURCE),
  vector('CT', 'single', 28_000, 284.75, 'worked-from-schedule', CT_SOURCE),
  vector('CT', 'single', 28_000, 284.75, 'worked-from-schedule', CT_SOURCE, { dependents: 2 }),
  vector('CT', 'single', 105_000, 5_300, 'published-threshold', CT_SOURCE),
  vector('CT', 'single', 105_001, 5_325.06, 'published-threshold', CT_SOURCE),
  vector('CT', 'single', 110_000, 5_625, 'worked-from-schedule', CT_SOURCE),
  vector('CT', 'single', 175_000, 9_750, 'worked-from-schedule', CT_SOURCE),
  vector('CT', 'marriedFilingJointly', 46_500, 435.625, 'worked-from-schedule', CT_SOURCE),
  vector('CT', 'headOfHousehold', 20_000, 5, 'worked-from-schedule', CT_SOURCE),
  vector('CT', 'single', 600_000, 41_890, 'worked-from-schedule', CT_SOURCE),

  vector('IN', 'single', 1_000, 0, 'published-threshold', IN_SOURCE),
  vector('IN', 'single', 101_000, 2_950, 'worked-from-schedule', IN_SOURCE),
  vector('IN', 'marriedFilingJointly', 2_000, 0, 'published-threshold', IN_SOURCE),
  vector('IN', 'marriedFilingJointly', 102_000, 2_950, 'worked-from-schedule', IN_SOURCE),
];
