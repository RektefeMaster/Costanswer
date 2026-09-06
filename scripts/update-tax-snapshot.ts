import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { STATE_CODES, US_STATES, type StateCode } from '../lib/location/states';
import { sha256 } from '../lib/data/sha256';
import { taxYearSnapshotSchema, type StateTaxPolicy, type TaxYearSnapshot } from '../lib/data/tax/schema';
import type { FilingStatus, TaxBracket } from '../lib/calculations/tax/types';

const TAX_YEAR = 2026;
const VERIFIED_AT = '2026-09-03T00:00:00.000Z';
const VERSION = '1.0.0';
/** Date the IRS source for supplemental withholding was read, not the site's release date. */
const SUPPLEMENTAL_VERIFIED_AT = '2026-09-04T00:00:00.000Z';

function brackets(rows: Array<readonly [number | null, number]>): TaxBracket[] {
  return rows.map(([notOver, rate]) => ({ notOver, rate }));
}

function filingAmounts(single: number, joint: number, separate: number, head: number): Record<FilingStatus, number> {
  return {
    single,
    marriedFilingJointly: joint,
    marriedFilingSeparately: separate,
    headOfHousehold: head,
  };
}

const AGENCY: Record<StateCode, { provider: string; sourceUrl: string }> = {
  AL: { provider: 'Alabama Department of Revenue', sourceUrl: 'https://www.revenue.alabama.gov/' },
  AK: { provider: 'Alaska Department of Revenue', sourceUrl: 'https://www.tax.alaska.gov/' },
  AZ: { provider: 'Arizona Department of Revenue', sourceUrl: 'https://azdor.gov/' },
  AR: { provider: 'Arkansas Department of Finance and Administration', sourceUrl: 'https://www.dfa.arkansas.gov/' },
  CA: { provider: 'California Franchise Tax Board', sourceUrl: 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2025/10.html' },
  CO: { provider: 'Colorado Department of Revenue', sourceUrl: 'https://tax.colorado.gov/sites/tax/files/documents/Book104_2025.pdf' },
  CT: { provider: 'Connecticut Department of Revenue Services', sourceUrl: 'https://portal.ct.gov/drs' },
  DE: { provider: 'Delaware Division of Revenue', sourceUrl: 'https://revenue.delaware.gov/' },
  DC: { provider: 'D.C. Office of Tax and Revenue', sourceUrl: 'https://otr.cfo.dc.gov/' },
  FL: { provider: 'Florida Department of Revenue', sourceUrl: 'https://floridarevenue.com/' },
  GA: { provider: 'Georgia Department of Revenue', sourceUrl: 'https://dor.georgia.gov/' },
  HI: { provider: 'Hawaii Department of Taxation', sourceUrl: 'https://tax.hawaii.gov/' },
  ID: { provider: 'Idaho State Tax Commission', sourceUrl: 'https://tax.idaho.gov/' },
  IL: { provider: 'Illinois Department of Revenue', sourceUrl: 'https://tax.illinois.gov/research/taxrates/income.html' },
  IN: { provider: 'Indiana Department of Revenue', sourceUrl: 'https://www.in.gov/dor/' },
  IA: { provider: 'Iowa Department of Revenue', sourceUrl: 'https://tax.iowa.gov/' },
  KS: { provider: 'Kansas Department of Revenue', sourceUrl: 'https://www.ksrevenue.gov/' },
  KY: { provider: 'Kentucky Department of Revenue', sourceUrl: 'https://revenue.ky.gov/Forms/2026%20Withholding%20Formula.pdf' },
  LA: { provider: 'Louisiana Department of Revenue', sourceUrl: 'https://revenue.louisiana.gov/' },
  ME: { provider: 'Maine Revenue Services', sourceUrl: 'https://www.maine.gov/revenue/sites/maine.gov.revenue/files/2026-05/ind_tax_rate_sched_2026_rev.pdf' },
  MD: { provider: 'Comptroller of Maryland', sourceUrl: 'https://www.marylandtaxes.gov/' },
  MA: { provider: 'Massachusetts Department of Revenue', sourceUrl: 'https://www.mass.gov/info-details/massachusetts-tax-rates' },
  MI: { provider: 'Michigan Department of Treasury', sourceUrl: 'https://www.michigan.gov/taxes' },
  MN: { provider: 'Minnesota Department of Revenue', sourceUrl: 'https://www.revenue.state.mn.us/' },
  MS: { provider: 'Mississippi Department of Revenue', sourceUrl: 'https://www.dor.ms.gov/individual/tax-rates' },
  MO: { provider: 'Missouri Department of Revenue', sourceUrl: 'https://dor.mo.gov/' },
  MT: { provider: 'Montana Department of Revenue', sourceUrl: 'https://mtrevenue.gov/taxes/tax-tables-and-deductions/2025' },
  NE: { provider: 'Nebraska Department of Revenue', sourceUrl: 'https://revenue.nebraska.gov/' },
  NV: { provider: 'Nevada Department of Taxation', sourceUrl: 'https://tax.nv.gov/' },
  NH: { provider: 'New Hampshire Department of Revenue Administration', sourceUrl: 'https://www.revenue.nh.gov/interest-dividends-tax' },
  NJ: { provider: 'New Jersey Division of Taxation', sourceUrl: 'https://www.nj.gov/treasury/taxation/nj1040faqs.shtml' },
  NM: { provider: 'New Mexico Taxation and Revenue Department', sourceUrl: 'https://www.tax.newmexico.gov/' },
  NY: { provider: 'New York State Department of Taxation and Finance', sourceUrl: 'https://www.tax.ny.gov/pit/file/tax_tables.htm' },
  NC: { provider: 'North Carolina Department of Revenue', sourceUrl: 'https://www.ncdor.gov/' },
  ND: { provider: 'North Dakota Office of State Tax Commissioner', sourceUrl: 'https://www.tax.nd.gov/individual-income-tax' },
  OH: { provider: 'Ohio Department of Taxation', sourceUrl: 'https://tax.ohio.gov/' },
  OK: { provider: 'Oklahoma Tax Commission', sourceUrl: 'https://oklahoma.gov/tax.html' },
  OR: { provider: 'Oregon Department of Revenue', sourceUrl: 'https://www.oregon.gov/dor' },
  PA: { provider: 'Pennsylvania Department of Revenue', sourceUrl: 'https://www.legis.state.pa.us/WU01/LI/LI/US/HTM/2003/0/0046..HTM' },
  RI: { provider: 'Rhode Island Division of Taxation', sourceUrl: 'https://tax.ri.gov/' },
  SC: { provider: 'South Carolina Department of Revenue', sourceUrl: 'https://dor.sc.gov/sites/dor/files/policies/IL26-20.pdf' },
  SD: { provider: 'South Dakota Department of Revenue', sourceUrl: 'https://dor.sd.gov/' },
  TN: { provider: 'Tennessee Department of Revenue', sourceUrl: 'https://www.tn.gov/revenue/taxes/hall-income-tax.html' },
  TX: { provider: 'Texas Comptroller of Public Accounts', sourceUrl: 'https://comptroller.texas.gov/economy/fiscal-notes/archive/2016/february/starting.php' },
  UT: { provider: 'Utah State Tax Commission', sourceUrl: 'https://incometax.utah.gov/paying/tax-rates' },
  VT: { provider: 'Vermont Department of Taxes', sourceUrl: 'https://tax.vermont.gov/' },
  VA: { provider: 'Virginia Department of Taxation', sourceUrl: 'https://www.tax.virginia.gov/' },
  WA: { provider: 'Washington Department of Revenue', sourceUrl: 'https://dor.wa.gov/taxes-rates/income-tax' },
  WV: { provider: 'West Virginia State Tax Department', sourceUrl: 'https://tax.wv.gov/' },
  WI: { provider: 'Wisconsin Department of Revenue', sourceUrl: 'https://www.revenue.wi.gov/' },
  WY: { provider: 'Wyoming Department of Revenue', sourceUrl: 'https://revenue.wyo.gov/' },
};

/**
 * Who published this row's figures, and when they were read.
 *
 * `sourceName` defaults to the agency because a row with nothing better should
 * at least say which agency it came from. A state whose numbers were read out
 * of one identifiable document names that document instead, so a reader
 * checking the figure knows what to open rather than which website to search.
 *
 * `verifiedAt` is per-state on purpose. The transcription work runs over weeks,
 * and stamping every row with one date would claim that states read in
 * September were re-checked whenever the last one was.
 */
function meta(stateCode: StateCode, source?: { sourceName?: string; verifiedAt?: string }) {
  const agency = AGENCY[stateCode];
  return {
    stateCode,
    provider: agency.provider,
    sourceName: source?.sourceName ?? agency.provider,
    sourceUrl: agency.sourceUrl,
    publishedAt: VERIFIED_AT,
    verifiedAt: source?.verifiedAt ?? VERIFIED_AT,
    version: VERSION,
  };
}

function noneState(stateCode: StateCode, notes: string[]): StateTaxPolicy {
  return {
    ...meta(stateCode),
    status: 'supported',
    kind: 'none',
    sourceStatus: 'verified',
    notes,
  };
}

function unsupportedState(stateCode: StateCode, reason: string): StateTaxPolicy {
  return {
    ...meta(stateCode),
    status: 'unsupported',
    sourceStatus: 'unsupported',
    reason,
  };
}

/*
 * The entries are typed as a plain array before the Map is built.
 *
 * Inline, TypeScript narrows each tuple's first element to its own literal —
 * `["AK", …] | ["FL", …] | …` — and then cannot match that against the Map's
 * `readonly [StateCode, StateTaxPolicy]` parameter. Naming the element type
 * once is clearer than fifty `as const` casts, and it is the annotation that
 * actually documents what this table is.
 */
const supportedEntries: Array<[StateCode, StateTaxPolicy]> = [
  ['AK', noneState('AK', ['Alaska does not levy a personal income tax on wages.'])],
  ['FL', noneState('FL', ['Florida does not levy a personal income tax on wages.'])],
  ['NV', noneState('NV', ['Nevada does not levy a personal income tax on wages.'])],
  ['NH', noneState('NH', [
    'New Hampshire does not tax wages.',
    'The Interest and Dividends Tax is repealed for taxable periods beginning after December 31, 2024 (NH DRA).',
  ])],
  ['SD', noneState('SD', ['South Dakota does not levy a personal income tax on wages.'])],
  ['TN', noneState('TN', [
    'Tennessee does not tax wages.',
    'The Hall income tax on investment income is fully repealed.',
  ])],
  ['TX', noneState('TX', [
    'Texas does not have a personal income tax (Texas Comptroller Fiscal Notes).',
    'Texas Constitution Article 8, Section 24 requires voter approval before a personal income tax on natural persons can be imposed.',
  ])],
  ['WA', noneState('WA', [
    'Washington does not currently have an individual income tax on wages (Washington DOR).',
    'Washington capital gains tax is not included.',
    'A new high-income tax enacted in 2026 takes effect January 1, 2028 and is outside this tax year.',
  ])],
  ['WY', noneState('WY', ['Wyoming does not levy a personal income tax on wages.'])],
  ['IL', {
    ...meta('IL'),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    // Stated rather than assumed. A flat state used to inherit the snapshot's
    // year silently, which is a claim about which schedule was read that nobody
    // had actually checked.
    scheduleTaxYear: TAX_YEAR,
    rate: 0.0495,
    exemptionByFilingStatus: filingAmounts(2_925, 5_850, 2_925, 2_925),
    notes: [
      'Illinois individual income tax is 4.95% of net income (IDOR; rate effective July 1, 2017).',
      'Tax year 2026 personal exemption is $2,925 per taxpayer (IDOR FY 2026-15). Joint returns use two taxpayer exemptions. Dependents are not modeled.',
      'Illinois additions, subtractions, and credits are not modeled. The starting point is gross wages minus the personal exemption.',
    ],
  }],
  ['PA', {
    ...meta('PA'),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    scheduleTaxYear: TAX_YEAR,
    rate: 0.0307,
    exemptionByFilingStatus: filingAmounts(0, 0, 0, 0),
    localAddOn: {
      label: 'Pennsylvania local earned income tax',
      basis: 'municipality',
      // Act 32 EIT rates, levied by municipality and school district together.
      // Philadelphia's wage tax sits well above this band and is separate.
      typicalRateRange: { low: 0.01, high: 0.0275 },
      appliesTo: 'taxable-income',
    },
    notes: [
      'Pennsylvania personal income tax is 3.07% (Tax Reform Code of 1971, Section 302, as amended by Act 46 of 2003).',
      'No standard deduction is applied.',
      'Local earned income tax is levied separately by municipality and school district and is named as an omission rather than estimated.',
    ],
  }],
  ['MN', {
    ...meta('MN'),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: TAX_YEAR,
    // Minnesota Statutes 290.0123, Subd. 1, as indexed for 2026.
    standardDeductionByFilingStatus: filingAmounts(15_300, 30_600, 15_300, 23_000),
    /*
     * Rates from the department's rate-and-bracket page; thresholds from the
     * statutory inflation-adjustment table, which gives the 2nd, 3rd and 4th
     * bracket thresholds directly. The two agree exactly, which is the check
     * that matters — one document alone would have been a transcription with
     * nothing to test it against.
     */
    bracketsByFilingStatus: {
      single: brackets([
        [33_310, 0.0535], [109_430, 0.0680], [203_150, 0.0785], [null, 0.0985],
      ]),
      marriedFilingJointly: brackets([
        [48_700, 0.0535], [193_480, 0.0680], [337_930, 0.0785], [null, 0.0985],
      ]),
      marriedFilingSeparately: brackets([
        [24_350, 0.0535], [96_740, 0.0680], [168_965, 0.0785], [null, 0.0985],
      ]),
      headOfHousehold: brackets([
        [41_010, 0.0535], [164_800, 0.0680], [270_060, 0.0785], [null, 0.0985],
      ]),
    },
    perDependentExemption: 5_300,
    notes: [
      'Minnesota income tax brackets and rates for tax year 2026 (Minn. Stat. 290.06, Subd. 2c; Minnesota Department of Revenue rates and brackets page).',
      'Standard deduction for 2026 is $15,300 single and married filing separately, $30,600 married filing jointly, $23,000 head of household (Minn. Stat. 290.0123, Subd. 1, as inflation-adjusted for tax year 2026).',
      'Dependent exemption is $5,300 per dependent for 2026 (Minn. Stat. 290.0121, Subd. 1).',
      'The standard deduction phases out above $244,400 of income ($122,200 married filing separately) and is not modeled; this understates tax at high incomes.',
      'Minnesota subtractions, credits and the alternative minimum tax are not modeled. The starting point is gross wages.',
    ],
  }],
  ['NC', {
    ...meta('NC'),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    /*
     * The rate is 2026's; the deduction is 2025's, because that is the newest
     * NCDOR has published. Declaring the older of the two is the honest choice:
     * it is the figure a reader could disagree with, and the note says exactly
     * which part came from where.
     */
    scheduleTaxYear: 2025,
    rate: 0.0399,
    // NC gives no personal exemption. The deduction does that work.
    exemptionByFilingStatus: filingAmounts(0, 0, 0, 0),
    standardDeductionByFilingStatus: filingAmounts(12_750, 25_500, 12_750, 19_125),
    notes: [
      'North Carolina taxes individual income at a flat 3.99% for taxable years after 2025 (NCDOR Tax Rate Schedules; G.S. 105-153.7).',
      'The standard deduction is the latest NCDOR published figure, for tax year 2025: $12,750 single, $25,500 married filing jointly, $12,750 married filing separately, $19,125 head of household. NCDOR had not published 2026 amounts at verification.',
      'Married filing separately uses $12,750 only where the spouse does not claim itemized deductions; where the spouse itemizes, North Carolina allows $0. This model uses the more common case.',
      'The North Carolina child deduction, other subtractions and credits are not modeled. The starting point is gross wages.',
    ],
  }],
  ['MT', {
    ...meta('MT', {
      sourceName: '2025 Montana Tax Tables and Deductions, with the 2025 Form 2 instruction booklet',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    /*
     * Form 2 starts from federal taxable income: line 1 is federal AGI, line 2
     * the federal deduction, line 3 the difference. Montana's own deduction of
     * federal income tax was repealed with the 2024 restructure, so despite
     * what older summaries say there is nothing here to deduct.
     */
    taxableIncomeBasis: 'federal-taxable-income',
    bracketsByFilingStatus: {
      single: brackets([[21_100, 0.047], [null, 0.059]]),
      marriedFilingSeparately: brackets([[21_100, 0.047], [null, 0.059]]),
      marriedFilingJointly: brackets([[42_200, 0.047], [null, 0.059]]),
      headOfHousehold: brackets([[31_700, 0.047], [null, 0.059]]),
    },
    standardDeductionByFilingStatus: filingAmounts(0, 0, 0, 0),
    notes: [
      'Montana taxes ordinary income at 4.7% on the first $21,100 single or married filing separately, $42,200 married filing jointly and $31,700 head of household, and 5.9% above that (Montana DOR, 2025 Montana Tax Tables and Deductions; MCA 15-30-2103).',
      'Montana Form 2 starts from federal taxable income, so the federal standard deduction is already out of the base and Montana adds no deduction of its own.',
      'The department publishes 2025 rates and had not published 2026 at verification, so this row declares the 2025 schedule.',
      'Montana taxes net long-term capital gains at separate 3.0% and 4.1% rates. Those do not apply to wages and are not modeled.',
      'The $5,660 subtraction for taxpayers 65 and older, Montana additions and subtractions, and credits are not modeled. The starting point is gross wages.',
    ],
  }],
  ['ND', {
    ...meta('ND', {
      sourceName: 'North Dakota Office of State Tax Commissioner, Individual Income Tax rate tables, with Form ND-1 (SFN 28702, 12-2025) line 1b',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    // The commissioner's rate tables are published for tax year 2025; 2026
    // schedules were not available at verification.
    scheduleTaxYear: 2025,
    // Form ND-1 line 1b starts from federal taxable income, so the federal
    // standard deduction is already out of the base.
    taxableIncomeBasis: 'federal-taxable-income',
    bracketsByFilingStatus: {
      single: brackets([[48_475, 0], [244_825, 0.0195], [null, 0.025]]),
      marriedFilingJointly: brackets([[80_975, 0], [298_075, 0.0195], [null, 0.025]]),
      marriedFilingSeparately: brackets([[40_475, 0], [149_025, 0.0195], [null, 0.025]]),
      headOfHousehold: brackets([[64_950, 0], [271_450, 0.0195], [null, 0.025]]),
    },
    // North Dakota gives no deduction of its own; the federal one is inside
    // the starting figure.
    standardDeductionByFilingStatus: filingAmounts(0, 0, 0, 0),
    notes: [
      'North Dakota taxes North Dakota taxable income at 0%, 1.95% and 2.50% (Office of State Tax Commissioner, Individual Income Tax rate tables for tax year 2025; N.D.C.C. 57-38-30.3).',
      'The zero bracket runs to $48,475 single, $80,975 married filing jointly, $40,475 married filing separately and $64,950 head of household, so many North Dakota wage earners owe no state income tax at all.',
      'Form ND-1 line 1b starts from federal taxable income, so North Dakota has no deduction or exemption of its own and the federal standard deduction is read from this same snapshot.',
      'The commissioner had published 2025 rate tables and not 2026 at verification, so this row declares the 2025 schedule.',
      'North Dakota additions, subtractions including the long-term capital gain exclusion, and credits are not modeled. The starting point is gross wages.',
    ],
  }],
  ['SC', {
    ...meta('SC', {
      sourceName: 'SCDOR Information Letter #26-20, 2026 legislative update (brackets, rates and the South Carolina Income Adjusted Deduction)',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: TAX_YEAR,
    /*
     * South Carolina states its 2026 schedule as "1.99% below $30,000" and
     * "5.21% minus $966 at $30,000 or more". Those are the same curve: at
     * $30,000 both give $597, so the subtraction is just the cumulative tax of
     * the lower band written out. Storing it as two marginal brackets keeps one
     * shape in the engine and reproduces the state's formula exactly.
     */
    bracketsByFilingStatus: {
      single: brackets([[30_000, 0.0199], [null, 0.0521]]),
      marriedFilingSeparately: brackets([[30_000, 0.0199], [null, 0.0521]]),
      marriedFilingJointly: brackets([[30_000, 0.0199], [null, 0.0521]]),
      headOfHousehold: brackets([[30_000, 0.0199], [null, 0.0521]]),
    },
    // The SCIAD, which replaced the federal standard deduction for 2026.
    standardDeductionByFilingStatus: filingAmounts(15_000, 30_000, 15_000, 22_500),
    standardDeductionPhaseOut: {
      startIncomeByFilingStatus: filingAmounts(40_000, 80_000, 40_000, 60_000),
      rangeByFilingStatus: filingAmounts(55_000, 110_000, 55_000, 82_500),
      roundReductionDownToMultipleOf: 10,
    },
    notes: [
      'South Carolina has two brackets for tax year 2026: 1.99% below $30,000 of taxable income and 5.21% above it, which the state writes as 5.21% minus $966 (SCDOR Information Letter #26-20; S.C. Code 12-6-510).',
      'For 2026 South Carolina decoupled from the federal deductions in IRC 63(b)-(g), so its starting point is federal adjusted gross income rather than federal taxable income. For a wage-only filer that is gross pay.',
      'The South Carolina Income Adjusted Deduction replaces the federal standard deduction: $15,000 single and married filing separately, $22,500 head of household, $30,000 married filing jointly. It falls to zero across AGI of $40,000-$95,000, $60,000-$142,500 and $80,000-$190,000 respectively, and the reduction is rounded down to the next lowest $10.',
      'The dependent exemption, the 125% earned income credit capped at $200, and other South Carolina credits are not modeled. The starting point is gross wages.',
      'The 5.21% top rate is scheduled to fall in later years when revenue triggers are met; this row is the 2026 schedule as published.',
    ],
  }],
  ['ME', {
    ...meta('ME', {
      sourceName: 'State of Maine, 2026 Individual Income Tax Rates (revised May 20, 2026), with the 2026 deduction and exemption phase-out worksheets',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: TAX_YEAR,
    // 36 M.R.S. 5111, as inflation-adjusted for 2026 by 36 M.R.S. 5403.
    bracketsByFilingStatus: {
      single: brackets([[27_400, 0.058], [64_850, 0.0675], [null, 0.0715]]),
      marriedFilingSeparately: brackets([[27_400, 0.058], [64_850, 0.0675], [null, 0.0715]]),
      marriedFilingJointly: brackets([[54_850, 0.058], [129_750, 0.0675], [null, 0.0715]]),
      headOfHousehold: brackets([[41_100, 0.058], [97_300, 0.0675], [null, 0.0715]]),
    },
    standardDeductionByFilingStatus: filingAmounts(15_700, 31_400, 15_700, 23_550),
    standardDeductionPhaseOut: {
      startIncomeByFilingStatus: filingAmounts(102_250, 204_550, 102_250, 153_400),
      rangeByFilingStatus: filingAmounts(75_000, 150_000, 75_000, 112_500),
    },
    // $5,300 for the taxpayer, and again for a spouse on a joint return.
    personalExemptionByFilingStatus: filingAmounts(5_300, 10_600, 5_300, 5_300),
    personalExemptionPhaseOut: {
      startIncomeByFilingStatus: filingAmounts(341_000, 409_150, 204_575, 375_050),
      rangeByFilingStatus: filingAmounts(125_000, 125_000, 62_500, 125_000),
    },
    additionalTax: {
      name: 'Maine income tax surcharge',
      thresholdByFilingStatus: filingAmounts(1_000_000, 1_500_000, 750_000, 1_500_000),
      rate: 0.02,
    },
    notes: [
      'Maine income tax rates for tax year 2026 are 5.8%, 6.75% and 7.15% (36 M.R.S. 5111 as inflation-adjusted under 36 M.R.S. 5403; Maine Revenue Services, 2026 Individual Income Tax Rates, revised May 20, 2026).',
      'Standard deduction for 2026: $15,700 single and married filing separately, $31,400 married filing jointly, $23,550 head of household. Personal exemption is $5,300 for the taxpayer, doubled on a joint return.',
      'Both are phased out in proportion to income above $102,250 single, $153,400 head of household and $204,550 filing jointly, reaching zero $75,000, $112,500 and $150,000 further up. That band starts inside ordinary salaries, so it is modeled rather than noted.',
      'A 2% surcharge applies to Maine taxable income above $1,000,000 single, $750,000 married filing separately and $1,500,000 filing jointly or head of household, for tax years beginning on or after January 1, 2026.',
      'The rate schedule states that it must not be used to compute withholding from wages; this model estimates annual liability, not withholding.',
      'Maine credits, itemized deductions and the additional deduction for age or blindness are not modeled. The starting point is gross wages.',
    ],
  }],
  ['KY', {
    ...meta('KY', {
      sourceName: '2026 Kentucky Withholding Tax Formula, form 42A003 (TCF)(10-2025)',
      verifiedAt: '2026-09-06T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    scheduleTaxYear: TAX_YEAR,
    rate: 0.035,
    // Kentucky's standard deduction sits in `exemption` because the flat shape
    // subtracts both and Kentucky has only one figure to subtract.
    exemptionByFilingStatus: filingAmounts(3_360, 3_360, 3_360, 3_360),
    localAddOn: {
      label: 'Kentucky local occupational license tax',
      basis: 'county',
      appliesTo: 'taxable-income',
      // Deliberately unsized. Hundreds of Kentucky cities and counties set
      // their own occupational rates and no state agency publishes a statewide
      // band, so the page names the omission without inventing its size.
    },
    notes: [
      'Kentucky taxes individual income at a flat 3.5% for 2026, on wages less a $3,360 standard deduction (Kentucky DOR, 2026 Kentucky Withholding Tax Formula, form 42A003 (TCF)(10-2025); KRS 141.020 as amended by H.B. 1 of 2025; KRS 141.081(2)(a)).',
      'That document computes gross annual Kentucky tax, not a withholding approximation: its own example takes $39,240 of annual wages to $35,880 of Kentucky taxable wages and $1,255.80 of tax.',
      'The standard deduction is one figure for every filing status. On a Kentucky combined return each spouse claims it separately; this model has one income and claims it once.',
      'Kentucky cities and counties levy occupational license taxes on wages, which are not included and are not estimated because no state agency publishes a statewide rate.',
      'Kentucky itemized deductions, the family size tax credit and the pension income exclusion are not modeled.',
    ],
  }],
  ['UT', {
    ...meta('UT', {
      sourceName: 'Utah Income Tax: Tax Rates, and the TC-40 line-by-line instructions for lines 9\u201322 (taxpayer tax credit)',
      verifiedAt: '2026-09-06T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    /*
     * The Tax Commission's rate table reads "January 1, 2025 \u2014 current: 4.5%",
     * and its whole instruction site is still headed 2025. A 2026 reduction
     * appears in third-party parameter sets, but le.utah.gov was unreachable
     * from here and the Commission has not republished, so the rate this row
     * ships is the one the state currently prints.
     */
    scheduleTaxYear: 2025,
    rate: 0.045,
    // Utah starts from federal AGI, which for a wage-only filer is gross pay.
    // It gives no deduction of its own; the credit below does that work.
    exemptionByFilingStatus: filingAmounts(0, 0, 0, 0),
    exemptionCredit: {
      // Utah's personal exemption is per dependent only, and dependents are
      // not an input here, so the per-filer part is genuinely zero.
      perFilerByFilingStatus: filingAmounts(0, 0, 0, 0),
      perDependent: 0.06 * 2_111,
      // TC-40 line 16: six percent of exemptions plus the federal deduction.
      rateOfFederalStandardDeduction: 0.06,
      phaseOut: {
        startIncomeByFilingStatus: filingAmounts(18_213, 36_426, 18_213, 27_320),
        ratePerDollar: 0.013,
      },
    },
    notes: [
      'Utah taxes income at a flat 4.5% from January 1, 2025 (Utah State Tax Commission, Tax Rates; Utah Code 59-10-104).',
      'Utah gives no deduction. Instead TC-40 line 16 grants a credit of 6% of the federal standard deduction plus Utah personal exemptions, reduced by 1.3% of income above a base of $18,213 single, $36,426 filing jointly, $18,213 filing separately and $27,320 head of household, and never below zero.',
      'That credit is read from the federal standard deduction in this same snapshot rather than copied as a dollar figure, so it moves when the IRS indexes the deduction instead of going stale.',
      'The Utah personal exemption is $2,111 per dependent for 2025. Dependents are not an input to this calculation, so only the federal share of the credit applies here.',
      'Utah had not published 2026 amounts at verification, so this row declares the 2025 schedule. Utah\u2019s other credits and its additions and subtractions are not modeled.',
    ],
  }],
  ['MS', {
    ...meta('MS', {
      sourceName: 'Individual Income Tax \u2014 General Information: Tax Rates, Exemptions and Deductions; and the 2025 Resident Individual Income Tax Instructions (Form 80-100)',
      verifiedAt: '2026-09-06T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: TAX_YEAR,
    // Mississippi's zero band is a bracket, not a deduction: the first $10,000
    // of taxable income is taxed at 0% and everything above it at one rate.
    // Modelling it as a flat tax with a $10,000 deduction gives the same answer
    // only by accident, and stops doing so the moment the state adds a band.
    bracketsByFilingStatus: {
      single: brackets([[10_000, 0], [null, 0.04]]),
      marriedFilingJointly: brackets([[10_000, 0], [null, 0.04]]),
      marriedFilingSeparately: brackets([[10_000, 0], [null, 0.04]]),
      headOfHousehold: brackets([[10_000, 0], [null, 0.04]]),
    },
    standardDeductionByFilingStatus: filingAmounts(2_300, 4_600, 2_300, 3_400),
    personalExemptionByFilingStatus: filingAmounts(6_000, 12_000, 6_000, 8_000),
    perDependentExemption: 1_500,
    notes: [
      'Mississippi taxes the first $10,000 of taxable income at 0% and the excess at 4.00% for tax year 2026 (MS DOR, Individual Income Tax \u2014 Tax Rates; H.B. 1 of 2025).',
      'Exemption for 2026: $6,000 single and married filing separately, $12,000 married filing jointly or combined, $8,000 head of family. Standard deduction: $2,300, $4,600, $2,300 and $3,400 respectively (MS DOR).',
      'The department\u2019s own filing thresholds confirm those pairs: a single resident files above $8,300 of gross income and a married resident above $16,600, which are exactly exemption plus standard deduction.',
      'On a Mississippi combined return each spouse computes tax on their own income, so a two-earner couple gets the $10,000 zero band twice. This model has one income and applies it once, which is correct for a single-earner household and overstates tax for a two-earner one.',
      'Mississippi credits and the aged, blind and dependent exemptions are not modeled. The starting point is gross wages.',
    ],
  }],
  ['CO', {
    ...meta('CO', {
      sourceName: '2025 Colorado Individual Income Tax Filing Guide (DR 0104 Book), lines 12\u201313 and the 2025 income tax table',
      verifiedAt: '2026-09-06T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    /*
     * Colorado's rate is not fixed in statute: TABOR refund mechanisms move it
     * year to year, so it cannot be carried forward on the assumption that a
     * flat rate stays flat. 4.4% is the rate the department printed on the 2025
     * filing guide, and that is the year this row declares.
     */
    scheduleTaxYear: 2025,
    // Colorado starts from federal taxable income, line 1 of the DR 0104. It
    // has no deduction or exemption of its own.
    taxableIncomeBasis: 'federal-taxable-income',
    rate: 0.044,
    exemptionByFilingStatus: filingAmounts(0, 0, 0, 0),
    notes: [
      'Colorado taxes federal taxable income at a flat 4.40% (2025 Colorado Individual Income Tax Filing Guide, DR 0104 Book, line 13).',
      'Colorado has no standard deduction or personal exemption of its own. The federal standard deduction is already inside its starting figure, which is why this row reads it from the federal snapshot rather than restating it.',
      'The rate moves with TABOR refund mechanisms rather than staying fixed, so this row is declared as the 2025 schedule. It had not been republished for 2026 at verification.',
      'Above $300,000 of federal adjusted gross income Colorado adds back the part of the federal standard or itemized deduction over $12,000 ($16,000 filing jointly). That addback is not modeled, so this understates tax for those filers by at most about $180 single and $713 filing jointly.',
      'Colorado additions, subtractions, the alternative minimum tax and credits are not modeled.',
    ],
  }],
  ['MA', {
    ...meta('MA'),
    status: 'supported',
    kind: 'flatWithSurtax',
    sourceStatus: 'verified',
    scheduleTaxYear: TAX_YEAR,
    rate: 0.05,
    surtaxRate: 0.04,
    surtaxThreshold: 1_107_750,
    notes: [
      'Massachusetts Part B income (including wages) is taxed at 5% for tax year 2026 (Massachusetts DOR tax rates page, updated December 30, 2025).',
      'Income exceeding $1,107,750 is subject to an additional 4% surtax in tax year 2026.',
      'Massachusetts deductions, exemptions, and the short-term capital gains rate are not modeled.',
    ],
  }],
  ['CA', {
    ...meta('CA'),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    standardDeductionByFilingStatus: filingAmounts(5_706, 11_412, 5_706, 11_412),
    bracketsByFilingStatus: {
      single: brackets([
        [11_079, 0.01], [26_264, 0.02], [41_452, 0.04], [57_542, 0.06], [72_724, 0.08],
        [371_479, 0.093], [445_771, 0.103], [742_953, 0.113], [null, 0.123],
      ]),
      marriedFilingSeparately: brackets([
        [11_079, 0.01], [26_264, 0.02], [41_452, 0.04], [57_542, 0.06], [72_724, 0.08],
        [371_479, 0.093], [445_771, 0.103], [742_953, 0.113], [null, 0.123],
      ]),
      marriedFilingJointly: brackets([
        [22_158, 0.01], [52_528, 0.02], [82_904, 0.04], [115_084, 0.06], [145_448, 0.08],
        [742_958, 0.093], [891_542, 0.103], [1_485_906, 0.113], [null, 0.123],
      ]),
      headOfHousehold: brackets([
        [22_173, 0.01], [52_530, 0.02], [67_716, 0.04], [83_805, 0.06], [98_990, 0.08],
        [505_208, 0.093], [606_251, 0.103], [1_010_417, 0.113], [null, 0.123],
      ]),
    },
    additionalTax: {
      name: 'Mental Health Services Tax',
      thresholdByFilingStatus: filingAmounts(1_000_000, 1_000_000, 1_000_000, 1_000_000),
      rate: 0.01,
    },
    notes: [
      'California 2026 Form 540 rate schedules were not published at verification. This snapshot uses the official 2025 FTB indexed tax rate schedules and 2025 standard deduction.',
      'Mental Health Services Tax is 1% of taxable income over $1,000,000 (Cal. Rev. & Tax. Code § 17043).',
      'California credits, itemized deductions, and locality taxes are not modeled.',
    ],
  }],
  ['NJ', {
    ...meta('NJ'),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    standardDeductionByFilingStatus: filingAmounts(0, 0, 0, 0),
    bracketsByFilingStatus: {
      single: brackets([
        [20_000, 0.014], [35_000, 0.0175], [40_000, 0.035], [75_000, 0.05525],
        [500_000, 0.0637], [1_000_000, 0.0897], [null, 0.1075],
      ]),
      marriedFilingSeparately: brackets([
        [20_000, 0.014], [35_000, 0.0175], [40_000, 0.035], [75_000, 0.05525],
        [500_000, 0.0637], [1_000_000, 0.0897], [null, 0.1075],
      ]),
      marriedFilingJointly: brackets([
        [20_000, 0.014], [50_000, 0.0175], [70_000, 0.0245], [80_000, 0.035],
        [150_000, 0.05525], [500_000, 0.0637], [1_000_000, 0.0897], [null, 0.1075],
      ]),
      headOfHousehold: brackets([
        [20_000, 0.014], [50_000, 0.0175], [70_000, 0.0245], [80_000, 0.035],
        [150_000, 0.05525], [500_000, 0.0637], [1_000_000, 0.0897], [null, 0.1075],
      ]),
    },
    notes: [
      'New Jersey Division of Taxation stated that GIT rates did not change for tax year 2025. 2026 NJ-1040 rate schedules were not separately located at verification; the latest published 2025 GIT rate schedules are used.',
      'New Jersey personal exemptions, retirement exclusions, and credits are not modeled. The starting point is gross wages.',
    ],
  }],
];

const supported = new Map<StateCode, StateTaxPolicy>(supportedEntries);

const nyReason = 'New York 2026 Form IT-201 resident tax rate schedules were not published at verification. 2026 withholding tables are not used as annual tax liability. Federal income tax and FICA are still estimated.';

function buildStates(): StateTaxPolicy[] {
  return STATE_CODES.map((stateCode) => {
    const policy = supported.get(stateCode);
    if (policy) return policy;
    if (stateCode === 'NY') return unsupportedState('NY', nyReason);
    return unsupportedState(
      stateCode,
      `This release does not include a verified ${TAX_YEAR} wage income tax schedule for ${US_STATES[stateCode]}. Federal income tax and FICA are still estimated.`,
    );
  }).sort((left, right) => left.stateCode.localeCompare(right.stateCode));
}

async function main(): Promise<void> {
  const hashable = {
    schemaVersion: '1.0.0' as const,
    adapterVersion: 'us-tax-v1.0.0' as const,
    snapshotId: `us-tax-${TAX_YEAR}-v1`,
    taxYear: TAX_YEAR,
    provider: 'IRS, SSA, and state tax agencies',
    publishedAt: VERIFIED_AT,
    verifiedAt: VERIFIED_AT,
    sourceStatus: 'verified' as const,
    version: VERSION,
    federal: {
      taxYear: TAX_YEAR,
      provider: 'Internal Revenue Service' as const,
      sourceName: 'Revenue Procedure 2025-32',
      sourceUrl: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf',
      publishedAt: '2025-10-09T00:00:00.000Z',
      verifiedAt: VERIFIED_AT,
      sourceStatus: 'verified' as const,
      version: VERSION,
      standardDeductionByFilingStatus: filingAmounts(16_100, 32_200, 16_100, 24_150),
      bracketsByFilingStatus: {
        single: brackets([
          [12_400, 0.10], [50_400, 0.12], [105_700, 0.22], [201_775, 0.24],
          [256_225, 0.32], [640_600, 0.35], [null, 0.37],
        ]),
        marriedFilingJointly: brackets([
          [24_800, 0.10], [100_800, 0.12], [211_400, 0.22], [403_550, 0.24],
          [512_450, 0.32], [768_700, 0.35], [null, 0.37],
        ]),
        marriedFilingSeparately: brackets([
          [12_400, 0.10], [50_400, 0.12], [105_700, 0.22], [201_775, 0.24],
          [256_225, 0.32], [384_350, 0.35], [null, 0.37],
        ]),
        headOfHousehold: brackets([
          [17_700, 0.10], [67_450, 0.12], [105_700, 0.22], [201_750, 0.24],
          [256_200, 0.32], [640_600, 0.35], [null, 0.37],
        ]),
      },
    },
    supplemental: {
      taxYear: TAX_YEAR,
      provider: 'Internal Revenue Service' as const,
      sourceName: 'Publication 15 (2026), (Circular E), Employer\u2019s Tax Guide, section 7',
      // The PDF edition carries a document date; the HTML page does not.
      sourceUrl: 'https://www.irs.gov/pub/irs-pdf/p15.pdf',
      publishedAt: '2025-12-16T00:00:00.000Z',
      verifiedAt: SUPPLEMENTAL_VERIFIED_AT,
      sourceStatus: 'verified' as const,
      version: VERSION,
      optionalFlatRate: 0.22,
      mandatoryFlatRate: 0.37,
      mandatoryRateThreshold: 1_000_000,
      notes: [
        'Pub. 15 section 7: when supplemental wages are identified separately from regular wages, an employer may "withhold a flat 22% (no other percentage allowed)".',
        'Pub. 15 section 7: where supplemental wages paid to one employee during the calendar year exceed $1 million, "the excess is subject to withholding at 37% (or the highest rate of income tax for the year)", withheld without regard to the employee\u2019s Form W-4.',
        'Pub. 15 (2026) states the 22% and 37% rates remain in place because P.L. 119-21 permanently extended the individual rates enacted in P.L. 115-97.',
        'The $1 million threshold counts cumulative supplemental wages for the calendar year, including payments from all businesses under common control.',
        'These are withholding rates, not tax rates. Final liability for the year is settled on the tax return.',
        'Publication date is the document date of the 2026 PDF edition (dc:title "2026 Publication 15", produced 2025-12-16). The publication carries no "(Rev. Month Year)" line, only "For use in 2026".',
        'The aggregate method, in which the bonus is combined with regular wages and withheld from the Pub. 15-T tables, is an alternative this snapshot does not model.',
      ],
    },
    fica: {
      taxYear: TAX_YEAR,
      provider: 'Social Security Administration' as const,
      sourceName: 'OASDI contribution and benefit base',
      sourceUrl: 'https://www.ssa.gov/oact/cola/cbb.html',
      additionalMedicareSourceUrl: 'https://www.irs.gov/businesses/small-businesses-self-employed/questions-and-answers-for-the-additional-medicare-tax',
      publishedAt: '2025-10-24T00:00:00.000Z',
      verifiedAt: VERIFIED_AT,
      sourceStatus: 'verified' as const,
      version: VERSION,
      socialSecurityWageBase: 184_500,
      socialSecurityRate: 0.062,
      medicareRate: 0.0145,
      additionalMedicareRate: 0.009,
      additionalMedicareThresholdByFilingStatus: filingAmounts(200_000, 250_000, 125_000, 200_000),
    },
    states: buildStates(),
  };

  const normalizedSha256 = sha256(JSON.stringify(hashable));
  const snapshot: TaxYearSnapshot = { ...hashable, normalizedSha256 };
  taxYearSnapshotSchema.parse(snapshot);
  const nodeHash = createHash('sha256').update(JSON.stringify(hashable)).digest('hex');
  if (nodeHash !== normalizedSha256) {
    throw new Error('Project SHA-256 helper does not match Node crypto for the tax snapshot.');
  }

  const outputDirectory = path.join(process.cwd(), 'data', 'tax');
  await mkdir(outputDirectory, { recursive: true });
  if (snapshot.taxYear !== TAX_YEAR) {
    throw new Error(`Tax snapshot year ${snapshot.taxYear} does not match the generator year ${TAX_YEAR}.`);
  }
  const outputPath = path.join(outputDirectory, `${snapshot.taxYear}.json`);
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${outputPath} (${snapshot.snapshotId}). Existing year files were not replaced.`);
}

await main();
