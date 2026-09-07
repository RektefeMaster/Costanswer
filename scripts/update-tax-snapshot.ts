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
/** Date the 2026 credits, SE, and 1040-ES figures were read from IRS PDFs. */
const CREDITS_VERIFIED_AT = '2026-09-07T00:00:00.000Z';

function brackets(rows: Array<readonly [number | null, number]>): TaxBracket[] {
  return rows.map(([notOver, rate]) => ({ notOver, rate }));
}

/**
 * Brackets that also carry the tax the state publishes at each band's floor.
 *
 * Only for schedules whose published constants do not reconcile with summing
 * the bands beneath them; everywhere else `brackets` says the same thing with
 * one fewer number to get wrong.
 */
function brackets3(rows: Array<readonly [number | null, number, number | undefined]>): TaxBracket[] {
  return rows.map(([notOver, rate, baseTax]) => (baseTax === undefined ? { notOver, rate } : { notOver, rate, baseTax }));
}

type ExemptionStep = { notOver: number | null; amount: number };

/** For states whose exemption staircase does not vary with filing status. */
function sameStepsForEveryStatus(steps: ExemptionStep[]): Record<FilingStatus, ExemptionStep[]> {
  return {
    single: steps,
    marriedFilingJointly: steps,
    marriedFilingSeparately: steps,
    headOfHousehold: steps,
  };
}

function filingAmounts(single: number, joint: number, separate: number, head: number): Record<FilingStatus, number> {
  return {
    single,
    marriedFilingJointly: joint,
    marriedFilingSeparately: separate,
    headOfHousehold: head,
  };
}

/** Colorado child tax credit, 2025 DR 0104CN / ITT Child Tax Credit January 2026. Single, HOH and MFS share one table. */
const CO_CTC_SINGLE: ExemptionStep[] = [
  { notOver: 26_000, amount: 1_200 },
  { notOver: 51_000, amount: 600 },
  { notOver: 77_000, amount: 200 },
  { notOver: null, amount: 0 },
];
const CO_CTC_JOINT: ExemptionStep[] = [
  { notOver: 36_000, amount: 1_200 },
  { notOver: 61_000, amount: 600 },
  { notOver: 87_000, amount: 200 },
  { notOver: null, amount: 0 },
];

/**
 * Kentucky family size tax credit share of liability, KRS 141.066.
 *
 * Bands 1–7 are 4% of FPL; band 8 is 128–130%; band 9 is 130–133%. Writing
 * them out is what stops a uniform 4% step from giving 20% in the 10% band.
 */
const KY_FAMILY_SIZE_SHARE_STEPS = [
  { notOverPovertyShare: 1, rate: 1 },
  { notOverPovertyShare: 1.04, rate: 0.90 },
  { notOverPovertyShare: 1.08, rate: 0.80 },
  { notOverPovertyShare: 1.12, rate: 0.70 },
  { notOverPovertyShare: 1.16, rate: 0.60 },
  { notOverPovertyShare: 1.20, rate: 0.50 },
  { notOverPovertyShare: 1.24, rate: 0.40 },
  { notOverPovertyShare: 1.28, rate: 0.30 },
  { notOverPovertyShare: 1.30, rate: 0.20 },
  { notOverPovertyShare: 1.33, rate: 0.10 },
  { notOverPovertyShare: null, rate: 0 },
];

/**
 * Arkansas's 2025 regular schedule, as the state publishes it.
 *
 * The third column is the tax owed at the band's floor, which is what turns the
 * department's "minus adjustment" figures into this engine's shape without
 * changing what they compute. Each one is `rate * floor - adjustment`.
 */
/**
 * Oregon's federal tax subtraction cap, from Table 4 of the OR-40 instructions.
 *
 * Five steps down to zero. The bands are AGI, which for a wage-only filer is
 * gross pay, so this is looked up on the same income the brackets use.
 */
const OR_FEDERAL_CAP_SINGLE: ExemptionStep[] = [
  { notOver: 125_000, amount: 8_500 },
  { notOver: 130_000, amount: 6_800 },
  { notOver: 135_000, amount: 5_100 },
  { notOver: 140_000, amount: 3_400 },
  { notOver: 145_000, amount: 1_700 },
  { notOver: null, amount: 0 },
];
const OR_FEDERAL_CAP_SEPARATE: ExemptionStep[] = [
  { notOver: 125_000, amount: 4_250 },
  { notOver: 130_000, amount: 3_400 },
  { notOver: 135_000, amount: 2_550 },
  { notOver: 140_000, amount: 1_700 },
  { notOver: 145_000, amount: 850 },
  { notOver: null, amount: 0 },
];
const OR_FEDERAL_CAP_JOINT: ExemptionStep[] = [
  { notOver: 250_000, amount: 8_500 },
  { notOver: 260_000, amount: 6_800 },
  { notOver: 270_000, amount: 5_100 },
  { notOver: 280_000, amount: 3_400 },
  { notOver: 290_000, amount: 1_700 },
  { notOver: null, amount: 0 },
];

type RateStep = { notOver: number | null; rate: number };

function sameRateStepsForEveryStatus(steps: RateStep[]): Record<FilingStatus, RateStep[]> {
  return {
    single: steps,
    marriedFilingJointly: steps,
    marriedFilingSeparately: steps,
    headOfHousehold: steps,
  };
}

/**
 * Missouri's federal income tax percentage, from the 2025 MO-1040 instructions
 * for Line 12. The bands are Missouri AGI on Line 6 and are the same for every
 * filing status; only the dollar cap on Line 13 changes.
 */
const MO_FEDERAL_TAX_SHARE: RateStep[] = [
  { notOver: 25_000, rate: 0.35 },
  { notOver: 50_000, rate: 0.25 },
  { notOver: 100_000, rate: 0.15 },
  { notOver: 125_000, rate: 0.05 },
  { notOver: null, rate: 0 },
];

/**
 * Alabama's standard-deduction chart: a first closed band, then equal-width
 * bands that drop by a fixed amount, then an open floor.
 *
 * The 2025 Form 40 booklet prints 21 rows per filing status. Generating them
 * from the published first band, step, decrement and floor is the transcription
 * of that chart, not an approximation of it — every interior row is the same
 * arithmetic the table uses.
 */
function alabamaDeductionChart(spec: {
  firstBandNotOver: number;
  stepWidth: number;
  startAmount: number;
  decrement: number;
  floorAmount: number;
}): ExemptionStep[] {
  const steps: ExemptionStep[] = [{ notOver: spec.firstBandNotOver, amount: spec.startAmount }];
  let amount = spec.startAmount - spec.decrement;
  let bandTop = spec.firstBandNotOver + spec.stepWidth;
  while (amount > spec.floorAmount) {
    steps.push({ notOver: bandTop, amount });
    amount -= spec.decrement;
    bandTop += spec.stepWidth;
  }
  steps.push({ notOver: null, amount: spec.floorAmount });
  return steps;
}

/**
 * Alabama's dependent exemption chart, 2025 Form 40 booklet page 8.
 *
 * Read on Form 40 line 10 — Alabama AGI, before the federal income tax
 * subtraction on line 12 — which is the same line its standard deduction chart
 * is read on. One table for every filing status; Alabama does not widen it for
 * couples the way it widens the standard deduction chart.
 */
const AL_DEPENDENT_STEPS: ExemptionStep[] = [
  { notOver: 50_000, amount: 1_000 },
  { notOver: 100_000, amount: 500 },
  { notOver: null, amount: 300 },
];

/**
 * North Carolina's child deduction table, 2025 Form D-401.
 *
 * Read on federal AGI (Form D-400 line 6). The joint staircase is twice the
 * single one and the head-of-household staircase is one and a half times it,
 * so all three are written out rather than derived: North Carolina prints
 * them, and a derivation would silently drift if it ever stopped being a clean
 * multiple.
 */
const NC_CHILD_SINGLE: ExemptionStep[] = [
  { notOver: 20_000, amount: 3_000 },
  { notOver: 30_000, amount: 2_500 },
  { notOver: 40_000, amount: 2_000 },
  { notOver: 50_000, amount: 1_500 },
  { notOver: 60_000, amount: 1_000 },
  { notOver: 70_000, amount: 500 },
  { notOver: null, amount: 0 },
];
const NC_CHILD_JOINT: ExemptionStep[] = [
  { notOver: 40_000, amount: 3_000 },
  { notOver: 60_000, amount: 2_500 },
  { notOver: 80_000, amount: 2_000 },
  { notOver: 100_000, amount: 1_500 },
  { notOver: 120_000, amount: 1_000 },
  { notOver: 140_000, amount: 500 },
  { notOver: null, amount: 0 },
];
const NC_CHILD_HEAD: ExemptionStep[] = [
  { notOver: 30_000, amount: 3_000 },
  { notOver: 45_000, amount: 2_500 },
  { notOver: 60_000, amount: 2_000 },
  { notOver: 75_000, amount: 1_500 },
  { notOver: 90_000, amount: 1_000 },
  { notOver: 105_000, amount: 500 },
  { notOver: null, amount: 0 },
];

const AL_SD_JOINT = alabamaDeductionChart({
  firstBandNotOver: 25_999, stepWidth: 500, startAmount: 8_500, decrement: 175, floorAmount: 5_000,
});
const AL_SD_SEPARATE = alabamaDeductionChart({
  firstBandNotOver: 12_999, stepWidth: 250, startAmount: 4_250, decrement: 88, floorAmount: 2_500,
});
const AL_SD_HEAD = alabamaDeductionChart({
  firstBandNotOver: 25_999, stepWidth: 500, startAmount: 5_200, decrement: 135, floorAmount: 2_500,
});
const AL_SD_SINGLE = alabamaDeductionChart({
  firstBandNotOver: 25_999, stepWidth: 500, startAmount: 3_000, decrement: 25, floorAmount: 2_500,
});

type DeductionRateStage = { notOver: number | null; amount: number; rate?: number; excessOver?: number };

/** 2026 Form 1-ES standard deduction schedules. Head of household has two rates. */
const WI_SD_SINGLE: DeductionRateStage[] = [
  { notOver: 20_119, amount: 13_960 },
  { notOver: 136_453, amount: 13_960, rate: 0.12, excessOver: 20_120 },
  { notOver: null, amount: 0 },
];
const WI_SD_HEAD: DeductionRateStage[] = [
  { notOver: 20_119, amount: 18_030 },
  { notOver: 58_827, amount: 18_030, rate: 0.22515, excessOver: 20_120 },
  { notOver: 136_453, amount: 13_960, rate: 0.12, excessOver: 20_120 },
  { notOver: null, amount: 0 },
];
const WI_SD_JOINT: DeductionRateStage[] = [
  { notOver: 29_039, amount: 25_840 },
  { notOver: 159_690, amount: 25_840, rate: 0.19778, excessOver: 29_040 },
  { notOver: null, amount: 0 },
];
const WI_SD_SEPARATE: DeductionRateStage[] = [
  { notOver: 13_779, amount: 12_280 },
  { notOver: 75_869, amount: 12_280, rate: 0.19778, excessOver: 13_780 },
  { notOver: null, amount: 0 },
];

type IncomeRateStep = { notOver: number | null; rate: number };

function ctAddBack(zeroThrough: number, width: number, increment: number, maxAmount: number): ExemptionStep[] {
  const steps: ExemptionStep[] = [{ notOver: zeroThrough, amount: 0 }];
  let amount = increment;
  let top = zeroThrough + width;
  while (amount < maxAmount) {
    steps.push({ notOver: top, amount });
    amount += increment;
    top += width;
  }
  steps.push({ notOver: null, amount: maxAmount });
  return steps;
}

const CT_RECAPTURE_SINGLE: ExemptionStep[] = (() => {
  const steps: ExemptionStep[] = [{ notOver: 105_000, amount: 0 }];
  let amount = 25;
  for (let top = 110_000; top <= 150_000; top += 5_000) {
    steps.push({ notOver: top, amount });
    amount += 25;
  }
  steps.push({ notOver: 200_000, amount: 250 });
  amount = 340;
  for (let top = 205_000; top <= 345_000; top += 5_000) {
    steps.push({ notOver: top, amount });
    amount += 90;
  }
  steps.push({ notOver: 500_000, amount: 2_950 });
  amount = 3_000;
  for (let top = 505_000; top <= 540_000; top += 5_000) {
    steps.push({ notOver: top, amount });
    amount += 50;
  }
  steps.push({ notOver: null, amount: 3_400 });
  return steps;
})();

const CT_RECAPTURE_JOINT: ExemptionStep[] = (() => {
  const steps: ExemptionStep[] = [{ notOver: 210_000, amount: 0 }];
  let amount = 50;
  for (let top = 220_000; top <= 300_000; top += 10_000) {
    steps.push({ notOver: top, amount });
    amount += 50;
  }
  steps.push({ notOver: 400_000, amount: 500 });
  amount = 680;
  for (let top = 410_000; top <= 690_000; top += 10_000) {
    steps.push({ notOver: top, amount });
    amount += 180;
  }
  steps.push({ notOver: 1_000_000, amount: 5_900 });
  amount = 6_000;
  for (let top = 1_010_000; top <= 1_080_000; top += 10_000) {
    steps.push({ notOver: top, amount });
    amount += 100;
  }
  steps.push({ notOver: null, amount: 6_800 });
  return steps;
})();

const CT_RECAPTURE_HEAD: ExemptionStep[] = (() => {
  const steps: ExemptionStep[] = [{ notOver: 168_000, amount: 0 }];
  let amount = 40;
  for (let top = 176_000; top <= 240_000; top += 8_000) {
    steps.push({ notOver: top, amount });
    amount += 40;
  }
  steps.push({ notOver: 320_000, amount: 400 });
  amount = 540;
  for (let top = 328_000; top <= 552_000; top += 8_000) {
    steps.push({ notOver: top, amount });
    amount += 140;
  }
  steps.push({ notOver: 800_000, amount: 4_600 });
  amount = 4_680;
  for (let top = 808_000; top <= 864_000; top += 8_000) {
    steps.push({ notOver: top, amount });
    amount += 80;
  }
  steps.push({ notOver: null, amount: 5_320 });
  return steps;
})();

function ctCredit(rows: Array<readonly [number | null, number]>): IncomeRateStep[] {
  return rows.map(([notOver, rate]) => ({ notOver, rate }));
}

const CT_CREDIT_SINGLE = ctCredit([
  [18_800, 0.75], [19_300, 0.70], [19_800, 0.65], [20_300, 0.60], [20_800, 0.55],
  [21_300, 0.50], [21_800, 0.45], [22_300, 0.40], [25_000, 0.35], [25_500, 0.30],
  [26_000, 0.25], [26_500, 0.20], [31_300, 0.15], [31_800, 0.14], [32_300, 0.13],
  [32_800, 0.12], [33_300, 0.11], [60_000, 0.10], [60_500, 0.09], [61_000, 0.08],
  [61_500, 0.07], [62_000, 0.06], [62_500, 0.05], [63_000, 0.04], [63_500, 0.03],
  [64_000, 0.02], [64_500, 0.01], [null, 0],
]);
const CT_CREDIT_JOINT = ctCredit([
  [30_000, 0.75], [30_500, 0.70], [31_000, 0.65], [31_500, 0.60], [32_000, 0.55],
  [32_500, 0.50], [33_000, 0.45], [33_500, 0.40], [40_000, 0.35], [40_500, 0.30],
  [41_000, 0.25], [41_500, 0.20], [50_000, 0.15], [50_500, 0.14], [51_000, 0.13],
  [51_500, 0.12], [52_000, 0.11], [96_000, 0.10], [96_500, 0.09], [97_000, 0.08],
  [97_500, 0.07], [98_000, 0.06], [98_500, 0.05], [99_000, 0.04], [99_500, 0.03],
  [100_000, 0.02], [100_500, 0.01], [null, 0],
]);
const CT_CREDIT_SEPARATE = ctCredit([
  [15_000, 0.75], [15_500, 0.70], [16_000, 0.65], [16_500, 0.60], [17_000, 0.55],
  [17_500, 0.50], [18_000, 0.45], [18_500, 0.40], [20_000, 0.35], [20_500, 0.30],
  [21_000, 0.25], [21_500, 0.20], [25_000, 0.15], [25_500, 0.14], [26_000, 0.13],
  [26_500, 0.12], [27_000, 0.11], [48_000, 0.10], [48_500, 0.09], [49_000, 0.08],
  [49_500, 0.07], [50_000, 0.06], [50_500, 0.05], [51_000, 0.04], [51_500, 0.03],
  [52_000, 0.02], [52_500, 0.01], [null, 0],
]);
const CT_CREDIT_HEAD = ctCredit([
  [24_000, 0.75], [24_500, 0.70], [25_000, 0.65], [25_500, 0.60], [26_000, 0.55],
  [26_500, 0.50], [27_000, 0.45], [27_500, 0.40], [34_000, 0.35], [34_500, 0.30],
  [35_000, 0.25], [35_500, 0.20], [44_000, 0.15], [44_500, 0.14], [45_000, 0.13],
  [45_500, 0.12], [46_000, 0.11], [74_000, 0.10], [74_500, 0.09], [75_000, 0.08],
  [75_500, 0.07], [76_000, 0.06], [76_500, 0.05], [77_000, 0.04], [77_500, 0.03],
  [78_000, 0.02], [78_500, 0.01], [null, 0],
]);

/** Maryland's exemption staircase, from the Exemption Amount Chart (10A). */
const MD_EXEMPTION_STEPS_SINGLE: ExemptionStep[] = [
  { notOver: 100_000, amount: 3_200 },
  { notOver: 125_000, amount: 1_600 },
  { notOver: 150_000, amount: 800 },
  { notOver: null, amount: 0 },
];
const MD_EXEMPTION_STEPS_JOINT: ExemptionStep[] = [
  { notOver: 150_000, amount: 3_200 },
  { notOver: 175_000, amount: 1_600 },
  { notOver: 200_000, amount: 800 },
  { notOver: null, amount: 0 },
];

const AR_RATE_TOP = 0.039;

/**
 * The adjustment Arkansas subtracts, band by band, above $94,700.
 *
 * This is the state's bracket adjustment being taken back: the $419.96 that
 * applies through $94,700 shrinks by $10 for every $100 of income until it
 * settles at $89.30, which raises tax by up to $330 across that stretch.
 * Dropping it would undercharge every Arkansas filer earning between $94,700
 * and $100,000, so the bands are generated from the published list rather than
 * approximated by a rate.
 */
function arAdjustmentPhaseOut(): Array<readonly [number | null, number, number | undefined]> {
  const rows: Array<readonly [number | null, number, number | undefined]> = [];
  for (let step = 0; step <= 30; step += 1) {
    const floor = 94_700 + step * 100;
    const adjustment = 399.30 - step * 10;
    rows.push([floor + 100, AR_RATE_TOP, AR_RATE_TOP * floor - adjustment]);
  }
  // $97,801 and over carries $89.30, up to where the table stops.
  rows.push([100_000, AR_RATE_TOP, AR_RATE_TOP * 97_800 - 89.30]);
  /*
   * Above $100,000 the state states the tax outright as "$3,809 plus 3.9% of
   * the excess". Continuing the band below would give $3,810.70 at $100,000,
   * so the two do not meet. The published figure is used, and the $1.70 step is
   * Arkansas's, not this model's.
   */
  rows.push([null, AR_RATE_TOP, 3_809]);
  return rows;
}

const AR_REGULAR: Array<readonly [number | null, number, number | undefined]> = [
  [5_599, 0, undefined],
  [11_199, 0.02, 0],           // 2.00% less $111.98
  [15_999, 0.03, 112.00],      // 3.00% less $223.97
  [26_399, 0.034, 255.996],    // 3.40% less $287.97
  [94_700, 0.039, 609.601],    // 3.90% less $419.96
  ...arAdjustmentPhaseOut(),
];

const AGENCY: Record<StateCode, { provider: string; sourceUrl: string }> = {
  AL: { provider: 'Alabama Department of Revenue', sourceUrl: 'https://www.revenue.alabama.gov/wp-content/uploads/2026/01/25f40bk.pdf' },
  AK: { provider: 'Alaska Department of Revenue', sourceUrl: 'https://www.tax.alaska.gov/' },
  AZ: { provider: 'Arizona Department of Revenue', sourceUrl: 'https://azdor.gov/forms/individual-income-tax-highlights' },
  AR: { provider: 'Arkansas Department of Finance and Administration', sourceUrl: 'https://www.dfa.arkansas.gov/wp-content/uploads/2025_TaxBrackets.pdf' },
  CA: { provider: 'California Franchise Tax Board', sourceUrl: 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2025/10.html' },
  CO: { provider: 'Colorado Department of Revenue', sourceUrl: 'https://tax.colorado.gov/sites/tax/files/documents/Book104_2025.pdf' },
  CT: { provider: 'Connecticut Department of Revenue Services', sourceUrl: 'https://portal.ct.gov/-/media/drs/forms/2025/income/ct-1040-tcs_1225.pdf' },
  DE: { provider: 'Delaware Division of Revenue', sourceUrl: 'https://revenuefiles.delaware.gov/2025/TY25_taxtable.pdf' },
  DC: { provider: 'D.C. Office of Tax and Revenue', sourceUrl: 'https://otr.cfo.dc.gov/page/dc-individual-and-fiduciary-income-tax-rates' },
  FL: { provider: 'Florida Department of Revenue', sourceUrl: 'https://floridarevenue.com/' },
  GA: { provider: 'Georgia Department of Revenue', sourceUrl: 'https://dor.georgia.gov/document/document/2026-employers-tax-guide-updated-june-2026/download' },
  HI: { provider: 'Hawaii Department of Taxation', sourceUrl: 'https://files.hawaii.gov/tax/news/announce/ann24-03.pdf' },
  ID: { provider: 'Idaho State Tax Commission', sourceUrl: 'https://tax.idaho.gov/wp-content/uploads/forms/EIN00046/EIN00046_03-02-2026.pdf' },
  IL: { provider: 'Illinois Department of Revenue', sourceUrl: 'https://tax.illinois.gov/research/taxrates/income.html' },
  IN: { provider: 'Indiana Department of Revenue', sourceUrl: 'https://iga.in.gov/pdf-documents/124/2025/senate/bills/SB0451/SB0451.04.ENRH.pdf' },
  IA: { provider: 'Iowa Department of Revenue', sourceUrl: 'https://revenue.iowa.gov/taxes/tax-guidance/individual-income-tax/1040-expanded-instructions/iowa-tax' },
  KS: { provider: 'Kansas Department of Revenue', sourceUrl: 'https://www.ksrevenue.gov/incomebook25.html' },
  KY: { provider: 'Kentucky Department of Revenue', sourceUrl: 'https://revenue.ky.gov/Forms/2026%20Withholding%20Formula.pdf' },
  LA: { provider: 'Louisiana Department of Revenue', sourceUrl: 'https://dam.ldr.la.gov/taxforms/1306-1-26.pdf' },
  ME: { provider: 'Maine Revenue Services', sourceUrl: 'https://www.maine.gov/revenue/sites/maine.gov.revenue/files/2026-05/ind_tax_rate_sched_2026_rev.pdf' },
  MD: { provider: 'Comptroller of Maryland', sourceUrl: 'https://www.marylandtaxes.gov/individual/income/tax-info/tax-rates.php' },
  MA: { provider: 'Massachusetts Department of Revenue', sourceUrl: 'https://www.mass.gov/info-details/massachusetts-tax-rates' },
  MI: { provider: 'Michigan Department of Treasury', sourceUrl: 'https://www.michigan.gov/taxes/business-taxes/withholding/calendar-year-tax-information' },
  MN: { provider: 'Minnesota Department of Revenue', sourceUrl: 'https://www.revenue.state.mn.us/minnesota-income-tax-rates-and-brackets' },
  MS: { provider: 'Mississippi Department of Revenue', sourceUrl: 'https://www.dor.ms.gov/individual/tax-rates' },
  MO: { provider: 'Missouri Department of Revenue', sourceUrl: 'https://dor.mo.gov/forms/MO-1040%20Instructions_2025.pdf' },
  MT: { provider: 'Montana Department of Revenue', sourceUrl: 'https://revenuefiles.mt.gov/files/Forms/Publication-1/Publication-1-2026.pdf' },
  NE: { provider: 'Nebraska Department of Revenue', sourceUrl: 'https://revenue.nebraska.gov/sites/default/files/doc/tax-forms/2025/f_1040N-ES.pdf' },
  NV: { provider: 'Nevada Department of Taxation', sourceUrl: 'https://tax.nv.gov/' },
  NH: { provider: 'New Hampshire Department of Revenue Administration', sourceUrl: 'https://www.revenue.nh.gov/interest-dividends-tax' },
  NJ: { provider: 'New Jersey Division of Taxation', sourceUrl: 'https://www.nj.gov/treasury/taxation/git_over.shtml' },
  NM: { provider: 'New Mexico Taxation and Revenue Department', sourceUrl: 'https://www.nmlegis.gov/sessions/24%20Regular/final/HB0252.PDF' },
  NY: { provider: 'New York State Department of Taxation and Finance', sourceUrl: 'https://www.tax.ny.gov/pdf/current_forms/it/it2105i.pdf' },
  NC: { provider: 'North Carolina Department of Revenue', sourceUrl: 'https://www.ncdor.gov/taxes-forms/individual-income-tax/tax-rate-schedules' },
  ND: { provider: 'North Dakota Office of State Tax Commissioner', sourceUrl: 'https://www.tax.nd.gov/individual-income-tax' },
  OH: { provider: 'Ohio Department of Taxation', sourceUrl: 'https://codes.ohio.gov/ohio-revised-code/section-5747.02' },
  OK: { provider: 'Oklahoma Tax Commission', sourceUrl: 'https://www.oklegislature.gov/cf_pdf/2025-26%20ENR/hB/HB2764%20ENR.PDF' },
  OR: { provider: 'Oregon Department of Revenue', sourceUrl: 'https://www.oregon.gov/dor/forms/FormsPubs/form-or-40-inst_101-040-1_2025.pdf' },
  PA: { provider: 'Pennsylvania Department of Revenue', sourceUrl: 'https://www.legis.state.pa.us/WU01/LI/LI/US/HTM/2003/0/0046..HTM' },
  RI: { provider: 'Rhode Island Division of Taxation', sourceUrl: 'https://tax.ri.gov/sites/g/files/xkgbur541/files/2026-01/2025%20RI%20Tax%20Tables_Full.pdf' },
  SC: { provider: 'South Carolina Department of Revenue', sourceUrl: 'https://dor.sc.gov/sites/dor/files/policies/IL26-20.pdf' },
  SD: { provider: 'South Dakota Department of Revenue', sourceUrl: 'https://dor.sd.gov/' },
  TN: { provider: 'Tennessee Department of Revenue', sourceUrl: 'https://www.tn.gov/revenue/taxes/hall-income-tax.html' },
  TX: { provider: 'Texas Comptroller of Public Accounts', sourceUrl: 'https://comptroller.texas.gov/economy/fiscal-notes/archive/2016/february/starting.php' },
  UT: { provider: 'Utah State Tax Commission', sourceUrl: 'https://incometax.utah.gov/paying/tax-rates' },
  VT: { provider: 'Vermont Department of Taxes', sourceUrl: 'https://tax.vermont.gov/sites/tax/files/documents/IN-111-Instr-2025.pdf' },
  VA: { provider: 'Virginia Department of Taxation', sourceUrl: 'https://www.tax.virginia.gov/sites/default/files/vatax-pdf/2025-760-instructions.pdf' },
  WA: { provider: 'Washington Department of Revenue', sourceUrl: 'https://dor.wa.gov/taxes-rates/income-tax' },
  WV: { provider: 'West Virginia State Tax Department', sourceUrl: 'https://code.wvlegislature.gov/11-21-4J/' },
  WI: { provider: 'Wisconsin Department of Revenue', sourceUrl: 'https://www.revenue.wi.gov/TaxForms2026/2026-Form1-ES-Inst.pdf' },
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
    perDependentExemption: 2_925,
    notes: [
      'Illinois individual income tax is 4.95% of net income (IDOR; rate effective July 1, 2017).',
      'Tax year 2026 personal exemption is $2,925 per taxpayer (IDOR FY 2026-15). Joint returns use two taxpayer exemptions. Each dependent is another $2,925 (35 ILCS 5/204(c); Schedule IL-E/EITC dependent exemption allowance).',
      'The exemption allowance is not allowed if adjusted gross income exceeds $500,000 on a joint return or $250,000 on any other return (FY 2026-15). That high-income cliff is not modeled, which understates tax for those filers.',
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
      typicalRateRange: { low: 0.01, high: 0.03735 },
      appliesTo: 'taxable-income',
      omissionNote: 'Act 32 EIT is commonly 1%–2.75% of wages. Philadelphia\'s wage tax is 3.735% for residents and 3.425% for non-residents as of 1 July 2026 (City of Philadelphia Department of Revenue). Pittsburgh, Reading and Scranton also sit above the Act 32 band. Your real take-home is lower than the state figure.',
    },
    taxForgiveness: {
      // 2025 PA-40 Schedule SP Eligibility Income Tables 1 and 2. Unmarried
      // (single, HOH) uses Table 1; married (joint or separate) uses Table 2.
      // Amounts have been $6,500 / $13,000 + $9,500 a child since tax year 2004.
      fullCreditIncomeByFilingStatus: filingAmounts(6_500, 13_000, 13_000, 6_500),
      perDependent: 9_500,
      increment: 250,
      shareLostPerIncrement: 0.10,
    },
    dependentAllowanceStatus: {
      kind: 'assumption',
      reason: 'Pennsylvania Tax Forgiveness is a share of Pennsylvania tax, and this estimate treats wages as eligibility income and every dependent as a dependent child on Schedule SP. A filer with extra nontaxable eligibility income, or whose dependents are not qualifying children, is shown less tax than they owe.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'Pennsylvania personal income tax is 3.07% (Tax Reform Code of 1971, Section 302, as amended by Act 46 of 2003).',
      'No standard deduction is applied.',
      'Tax Forgiveness (PA-40 Schedule SP) is modeled: 100% of the tax is forgiven at eligibility income of $6,500 unmarried or $13,000 married, plus $9,500 per dependent child, then 10% less for each $250 over that ceiling (2025 PA-40 SP Eligibility Income Tables 1 and 2; amounts unchanged since tax year 2004). This estimate treats wages as eligibility income. Nontaxable Schedule SP income is omitted, so a filer who has any is shown less tax than they owe. Dependents are counted as dependent children; a filer whose dependents are not qualifying children is also shown less tax than they owe. Married filing separately uses the married table on this income only, not joint eligibility income.',
      'Local earned income tax is levied separately by municipality and school district. The omitted-tax band is Act 32\'s 1% floor through Philadelphia\'s published 3.735% resident wage tax, so the page does not describe Philadelphia as a 2.75% town.',
    ],
  }],
  ['MN', {
    ...meta('MN', {
      sourceName: 'Minnesota DOR 2026 income tax rates and brackets, with Inflation Adjusted Amounts for 2026',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
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
    standardDeductionLimitation: {
      startIncomeByFilingStatus: filingAmounts(244_400, 244_400, 122_200, 244_400),
      secondStartIncomeByFilingStatus: filingAmounts(337_800, 337_800, 168_900, 337_800),
      firstRate: 0.03,
      secondRate: 0.10,
      maximumReductionShare: 0.80,
      fullLimitationIncomeByFilingStatus: filingAmounts(1_107_750, 1_107_750, 1_107_750, 1_107_750),
    },
    notes: [
      'Minnesota income tax brackets and rates for tax year 2026 (Minn. Stat. 290.06, Subd. 2c; Minnesota Department of Revenue rates and brackets page, 16 December 2025).',
      'Standard deduction for 2026 is $15,300 single and married filing separately, $30,600 married filing jointly, $23,000 head of household (Minn. Stat. 290.0123, Subd. 1; Inflation Adjusted Amounts for 2026).',
      'Dependent exemption is $5,300 per dependent for 2026 (Minn. Stat. 290.0121, Subd. 1).',
      'The standard deduction is reduced by 3% of AGI over $244,400 ($122,200 married filing separately) plus 10% over $337,800 ($168,900), never by more than 80% of the deduction, and the 80% cut is forced above $1,107,750 (Minn. Stat. 290.0123, Subd. 5 as indexed).',
      'Minnesota subtractions, credits and the alternative minimum tax are not modeled. The starting point is gross wages.',
    ],
  }],
  ['NC', {
    ...meta('NC', {
      sourceName: 'NCDOR Tax Rate Schedules (3.99% after 2025) and G.S. 105-153.5 standard deduction',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    scheduleTaxYear: TAX_YEAR,
    rate: 0.0399,
    exemptionByFilingStatus: filingAmounts(0, 0, 0, 0),
    standardDeductionByFilingStatus: filingAmounts(12_750, 25_500, 12_750, 19_125),
    steppedDependentExemption: {
      amountStepsByFilingStatus: {
        single: NC_CHILD_SINGLE,
        marriedFilingJointly: NC_CHILD_JOINT,
        marriedFilingSeparately: NC_CHILD_SINGLE,
        headOfHousehold: NC_CHILD_HEAD,
      },
      countedAs: 'qualifying-child',
    },
    dependentAllowanceStatus: {
      kind: 'assumption',
      reason: 'North Carolina allows this only for a child claimed for the federal child tax credit. This estimate counts every dependent, so a filer whose dependents are not qualifying children is shown less tax than they owe.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'North Carolina taxes individual income at a flat 3.99% for taxable years after 2025 (NCDOR Tax Rate Schedules; Session Law 2023-134; G.S. 105-153.7).',
      'The standard deduction is the amount currently in G.S. 105-153.5: $12,750 single or married filing separately, $25,500 married filing jointly, $19,125 head of household. Those figures are the enacted 2026 amounts — Senate Bill 437 would have raised them and did not pass.',
      'Married filing separately uses $12,750 only where the spouse does not claim itemized deductions; where the spouse itemizes, North Carolina allows $0. This model uses the more common case.',
      'The child deduction is $3,000 per qualifying child, stepping down to $0 by federal AGI on a staircase that differs by filing status (2025 Form D-401, Child Deduction Table). North Carolina allows it only for a child claimed for the federal child tax credit, so this model overstates it for a filer whose dependents are not qualifying children. That table is the 2025 one, the latest North Carolina has published, applied alongside the enacted 2026 rate.',
      'Other North Carolina subtractions and credits are not modeled. The starting point is gross wages.',
    ],
  }],
  ['MI', {
    ...meta('MI', {
      sourceName: 'Michigan Department of Treasury, Withholding Tax Information by Calendar Year 2026, with the April 15, 2026 rate notice',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    rate: 0.0425,
    // Michigan gives no standard deduction; the personal exemption is the
    // whole of what comes off income, and a joint return claims two.
    exemptionByFilingStatus: filingAmounts(5_900, 11_800, 5_900, 5_900),
    perDependentExemption: 5_900,
    localAddOn: {
      label: 'Michigan city income tax',
      basis: 'municipality',
      appliesTo: 'taxable-income',
      // Twenty-four cities levy one and Treasury publishes the list without a
      // statewide rate, so the size is left unstated rather than invented.
    },
    notes: [
      'Michigan taxes income at a flat 4.25% for tax year 2026 (Treasury taxpayer notice, April 15, 2026; MCL 206.51). The FY 2025 ACFR did not trigger the statutory rate-reduction formula.',
      'The personal exemption is $5,900 a person for 2026 (Treasury withholding calendar and 2026 Form 446). A joint return claims two. Michigan has no standard deduction of its own. Each dependent is another $5,900 (Form 446: personal and dependency exemptions).',
      'Twenty-four Michigan cities levy their own income tax, Detroit\u2019s administered by Treasury and the rest by the cities themselves. Treasury publishes the list but no statewide rate, so that tax is named here without a size.',
      'The special exemption for disability, the qualified disabled veteran deduction, retirement and pension subtractions, the homestead property tax credit and the home heating credit are not modeled. The starting point is gross wages.',
    ],
  }],
  ['NM', {
    ...meta('NM', {
      sourceName: 'Laws 2024, Chapter 67 (H.B. 252), amending 7-2-7 NMSA 1978 for tax years beginning 2025, with the 2025 PIT-1 instructions for the federal standard deduction and the low- and middle-income exemption worksheet',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    /*
     * 7-2-7 prints each band as "$X plus Y% of the excess", and every constant
     * reconciles with the band beneath it to the cent, so plain marginal
     * brackets say the same thing. Heads of household share the joint
     * schedule; separate filers have their own, half-width, version.
     */
    bracketsByFilingStatus: {
      single: brackets([
        [5_500, 0.015], [16_500, 0.032], [33_500, 0.043], [66_500, 0.047], [210_000, 0.049], [null, 0.059],
      ]),
      marriedFilingSeparately: brackets([
        [4_000, 0.015], [12_500, 0.032], [25_000, 0.043], [50_000, 0.047], [157_500, 0.049], [null, 0.059],
      ]),
      marriedFilingJointly: brackets([
        [8_000, 0.015], [25_000, 0.032], [50_000, 0.043], [100_000, 0.047], [315_000, 0.049], [null, 0.059],
      ]),
      headOfHousehold: brackets([
        [8_000, 0.015], [25_000, 0.032], [50_000, 0.043], [100_000, 0.047], [315_000, 0.049], [null, 0.059],
      ]),
    },
    /*
     * PIT-1 line 12 is the federal standard deduction. These are the 2025
     * Form 1040 amounts, because that is the year this schedule belongs to.
     */
    standardDeductionByFilingStatus: filingAmounts(15_750, 31_500, 15_750, 23_625),
    // $2,500 a person, doubled on a joint return, from the PIT-1 worksheet.
    personalExemptionByFilingStatus: filingAmounts(2_500, 5_000, 2_500, 2_500),
    perDependentExemption: 2_500,
    personalExemptionPhaseOut: {
      startIncomeByFilingStatus: filingAmounts(20_000, 30_000, 15_000, 30_000),
      /*
       * The worksheet subtracts 15¢ / 10¢ / 20¢ per dollar over the floor from
       * the $2,500, which is the same curve as a proportional fall across
       * $2,500 divided by that rate. Written that way so a later editor does
       * not have to reverse-engineer 16,666.67.
       */
      rangeByFilingStatus: filingAmounts(2_500 / 0.15, 2_500 / 0.10, 2_500 / 0.20, 2_500 / 0.10),
    },
    notes: [
      'New Mexico taxes New Mexico taxable income at 1.5%, 3.2%, 4.3%, 4.7%, 4.9% and 5.9% for tax years beginning on or after January 1, 2025 (7-2-7 NMSA 1978 as amended by Laws 2024, Chapter 67 (H.B. 252)).',
      'The starting point is federal adjusted gross income. PIT-1 line 12 then subtracts the federal standard deduction \u2014 $15,750 single or married filing separately, $31,500 married filing jointly, $23,625 head of household, from the 2025 Form 1040 instructions.',
      'A low- and middle-income exemption of $2,500 a person applies at or below $36,667 of federal AGI single, $27,500 married filing separately, and $55,000 filing jointly or head of household. It is the full $2,500 below $20,000 / $15,000 / $30,000 and then falls by 15\u00a2, 20\u00a2 or 10\u00a2 per dollar (2025 PIT-1 instructions, line 14 worksheet). A joint return claims two. The worksheet then multiplies that remaining $2,500 by PIT-1 line 5 (taxpayer, spouse and dependents); each dependent is another $2,500 of that same phased amount.',
      'The 2025 PIT packet prints a Tax Rate Table on taxable income in $100 bands. NMAC 3.3.7.9 says to use 7-2-7 itself when taxable income is outside that table. These bands are the statute. The table is midpoint-based, so a printed figure can differ from 7-2-7 by about a dollar at a band edge. The packet\u2019s own example is $679 of tax at $25,300\u2013$25,400 of taxable income, married filing jointly.',
      'The $4,000 deduction for certain dependents on a joint or head-of-household return, the Working Families Tax Credit, the child income tax credit, the low-income comprehensive tax rebate and other PIT-ADJ / PIT-RC items are not modeled. New Mexico does not levy a local wage income tax.',
      'The department had published the 2025 PIT-1 and not a 2026 schedule at verification, so this row declares the 2025 schedule.',
    ],
  }],
  ['VT', {
    ...meta('VT', {
      sourceName: '2025 Vermont IN-111 instructions, standard deduction chart, personal exemption, and tax rate schedules X, Y-1, Y-2 and Z',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    /*
     * Vermont prints a base tax at each band floor. Several of those constants
     * are a few tens of cents away from summing the band beneath them, so the
     * published figure is carried rather than smoothed.
     */
    bracketsByFilingStatus: {
      single: brackets3([
        [49_400, 0.0335, undefined], [75_000, 0.066, 1_655], [119_700, 0.066, 3_345],
        [249_700, 0.076, 6_295], [null, 0.0875, 16_175],
      ]),
      marriedFilingSeparately: brackets3([
        [41_250, 0.0335, undefined], [75_000, 0.066, 1_382], [99_725, 0.066, 3_609],
        [152_000, 0.076, 5_241], [null, 0.0875, 9_214],
      ]),
      marriedFilingJointly: brackets3([
        [75_000, 0.0335, undefined], [82_500, 0.0335, 2_513], [199_450, 0.066, 2_764],
        [304_000, 0.076, 10_482], [null, 0.0875, 18_428],
      ]),
      headOfHousehold: brackets3([
        [66_200, 0.0335, undefined], [75_000, 0.066, 2_218], [171_000, 0.066, 2_799],
        [276_850, 0.076, 9_135], [null, 0.0875, 17_179],
      ]),
    },
    standardDeductionByFilingStatus: filingAmounts(7_650, 15_300, 7_650, 11_450),
    personalExemptionByFilingStatus: filingAmounts(5_300, 10_600, 5_300, 5_300),
    perDependentExemption: 5_300,
    notes: [
      'Vermont taxes Vermont taxable income at 3.35%, 6.60%, 7.60% and 8.75% for tax year 2025 (2025 IN-111 instructions, tax rate schedules X, Y-1, Y-2 and Z).',
      'Standard deduction for 2025 is $7,650 single or married filing separately, $15,300 married filing jointly, $11,450 head of household. The personal exemption is $5,300 a person (IN-111 line 5e), including other dependents on line 5c.',
      'The booklet works a married filing jointly example: $85,000 of Vermont taxable income is $2,929 of tax, which is the $2,764 printed at $82,500 plus 6.60% of the $2,500 excess.',
      'Above $150,000 of federal adjusted gross income Vermont charges the greater of the schedule and 3% of that AGI. On a wage-only return with these deductions the schedule is already higher, so the floor is noted rather than modelled.',
      'The additional standard deduction for age or blindness, the charitable contribution credit and Vermont school district taxes are not modeled. The starting point is gross wages.',
      'The department had published the 2025 IN-111 and not a 2026 schedule at verification, so this row declares the 2025 schedule.',
    ],
  }],
  ['RI', {
    ...meta('RI', {
      sourceName: '2025 Rhode Island Tax Tables and Tax Computation Worksheet, with the 2025 RI-1040 instructions for the standard deduction and personal exemption',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    // One schedule for every filing status. 3.75% of $79,900 is exactly the
    // $2,996.25 the computation worksheet prints at that floor.
    bracketsByFilingStatus: {
      single: brackets([[79_900, 0.0375], [181_650, 0.0475], [null, 0.0599]]),
      marriedFilingSeparately: brackets([[79_900, 0.0375], [181_650, 0.0475], [null, 0.0599]]),
      marriedFilingJointly: brackets([[79_900, 0.0375], [181_650, 0.0475], [null, 0.0599]]),
      headOfHousehold: brackets([[79_900, 0.0375], [181_650, 0.0475], [null, 0.0599]]),
    },
    standardDeductionByFilingStatus: filingAmounts(10_900, 21_800, 10_900, 16_350),
    personalExemptionByFilingStatus: filingAmounts(5_100, 10_200, 5_100, 5_100),
    perDependentExemption: 5_100,
    notes: [
      'Rhode Island taxes Rhode Island taxable income at 3.75%, 4.75% and 5.99% for tax year 2025, the same bands for every filing status (2025 Rhode Island Tax Tables, page T-1 computation worksheet).',
      'Standard deduction for 2025 is $10,900 single or married filing separately, $21,800 married filing jointly, $16,350 head of household. The personal exemption is $5,100 a person, doubled on a joint return, and $5,100 for each dependent (2025 RI-1040 line 6; Schedule E). Rhode Island does not allow federal itemized deductions.',
      'Both the deduction and the exemption phase out above $254,250 of modified federal AGI. That band is well above ordinary wages, so it is noted rather than modelled; this overstates the deduction for those filers.',
      'The 2025 table is midpoint-based over $50 income bands, so its printed figure can differ from the exact 3.75% by up to about a dollar. The booklet\u2019s own example is $950 of tax at $25,300\u2013$25,350 of taxable income.',
      'The percentage of allowable federal credits, the earned income credit at 16% of the federal credit, and other Rhode Island credits are not modeled. The starting point is gross wages.',
      'The division had published the 2025 RI-1040 and not a 2026 schedule at verification, so this row declares the 2025 schedule.',
    ],
  }],
  ['LA', {
    ...meta('LA', {
      sourceName: '2026 Form R-1306 withholding tables, with Act 11 / RIB 25-012 for the 3% rate',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    rate: 0.03,
    // IT-540 line 7 is federal AGI, which for a wage-only filer is gross pay,
    // and line 8 is one combined deduction figure.
    exemptionByFilingStatus: filingAmounts(12_875, 25_750, 12_875, 25_750),
    dependentAllowanceStatus: {
      kind: 'none',
      reason: 'Louisiana does not give a per-dependent allowance for 2026: the flat tax enacted by Act 11 of the 2024 Third Extraordinary Session replaced the personal and dependent exemptions with a single combined deduction.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'Louisiana taxes income at a flat 3% from tax year 2025 onward (Act 11 of the 2024 Third Extraordinary Session; RIB 25-012; 2025 IT-540 line 11). The 2026 withholding tables use 3.09%; that is a withholding formula, not the tax rate, so this row keeps 3%.',
      'The 2026 standard deduction used in Form R-1306 and RIB 26-005 is $12,875 filing single or separately and $25,750 filing jointly, as a surviving spouse or as head of household. Those are the CPI-U-indexed withholding figures. RIB 26-005 says the official return amounts may differ slightly based on January 2026 CPI-U; no different return figure had been published at verification.',
      'The additional exemptions for dependents, blindness and age were repealed, though the deduction for taxpayers 65 and older was raised to $12,000 a person and is not modeled here.',
      'Louisiana credits and Schedule E adjustments are not modeled. The starting point is gross wages.',
    ],
  }],
  ['OR', {
    ...meta('OR', {
      sourceName: '2025 Publication OR-40-FY, Form OR-40 instructions: tax rate charts, tax tables, Table 4 and Table 5',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    /*
     * Oregon publishes the same schedule twice and the two do not quite agree.
     * Its tax tables imply $3,755 of tax at $50,000 for a joint filer; its rate
     * chart states $3,756. The chart is what a filer at or above $50,000 is
     * told to use, so its constants are carried as `baseTax` from that point
     * and the dollar step at the boundary is Oregon's.
     */
    bracketsByFilingStatus: {
      single: brackets3([
        [4_400, 0.0475, undefined], [11_100, 0.0675, undefined], [125_000, 0.0875, undefined], [null, 0.099, 10_627],
      ]),
      marriedFilingSeparately: brackets3([
        [4_400, 0.0475, undefined], [11_100, 0.0675, undefined], [125_000, 0.0875, undefined], [null, 0.099, 10_627],
      ]),
      marriedFilingJointly: brackets3([
        [8_800, 0.0475, undefined], [22_200, 0.0675, undefined], [50_000, 0.0875, undefined],
        [250_000, 0.0875, 3_756], [null, 0.099, 21_256],
      ]),
      headOfHousehold: brackets3([
        [8_800, 0.0475, undefined], [22_200, 0.0675, undefined], [50_000, 0.0875, undefined],
        [250_000, 0.0875, 3_756], [null, 0.099, 21_256],
      ]),
    },
    standardDeductionByFilingStatus: filingAmounts(2_835, 5_670, 2_835, 4_560),
    federalDeduction: {
      capByFilingStatus: filingAmounts(8_500, 8_500, 4_250, 8_500),
      capStepsByFilingStatus: {
        single: OR_FEDERAL_CAP_SINGLE,
        marriedFilingSeparately: OR_FEDERAL_CAP_SEPARATE,
        marriedFilingJointly: OR_FEDERAL_CAP_JOINT,
        headOfHousehold: OR_FEDERAL_CAP_JOINT,
      },
    },
    exemptionCredit: {
      perFilerByFilingStatus: filingAmounts(256, 512, 256, 256),
      perDependent: 256,
      // Oregon's instruction is to enter zero above these, not to taper.
      disallowedAboveIncomeByFilingStatus: filingAmounts(100_000, 200_000, 100_000, 200_000),
    },
    notes: [
      'Oregon taxes taxable income at 4.75%, 6.75%, 8.75% and 9.9% for tax year 2025 (2025 Form OR-40 instructions, tax rate charts and tax tables; ORS 316.037).',
      'Standard deduction for 2025 is $2,835 single or married filing separately, $5,670 married filing jointly, $4,560 head of household.',
      'Oregon subtracts federal income tax from state taxable income, capped at $8,500 ($4,250 married filing separately). That cap falls in five steps to nothing between $125,000 and $145,000 of adjusted gross income, and between $250,000 and $290,000 on a joint return.',
      'The exemption credit is $256 a person against tax, and is not allowed at all above $100,000 of adjusted gross income single or married filing separately, or $200,000 for other filers.',
      'Oregon publishes its tax tables and its rate charts with a dollar of disagreement at $50,000 for joint filers. The chart is used from $50,000 upward because that is what the state tells those filers to use.',
      'The federal subtraction here uses federal income tax after credits as this engine computes it, which is the same figure for a wage-only filer. The kicker credit, the political contribution credit and Oregon local transit taxes are not modeled.',
    ],
  }],
  ['MD', {
    ...meta('MD', {
      sourceName: 'Comptroller of Maryland, 2025 Maryland Income Tax Rates and Brackets, with the 2025 Resident Income Tax Return instruction booklet',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    /*
     * Maryland publishes each band as "$X plus Y% of the excess", and unlike
     * Ohio's and Arkansas's, every one of its constants reconciles with the
     * band beneath it to the cent, so plain marginal brackets say the same
     * thing with fewer numbers to get wrong.
     */
    bracketsByFilingStatus: {
      single: brackets([
        [1_000, 0.02], [2_000, 0.03], [3_000, 0.04], [100_000, 0.0475], [125_000, 0.05],
        [150_000, 0.0525], [250_000, 0.055], [500_000, 0.0575], [1_000_000, 0.0625], [null, 0.065],
      ]),
      marriedFilingSeparately: brackets([
        [1_000, 0.02], [2_000, 0.03], [3_000, 0.04], [100_000, 0.0475], [125_000, 0.05],
        [150_000, 0.0525], [250_000, 0.055], [500_000, 0.0575], [1_000_000, 0.0625], [null, 0.065],
      ]),
      marriedFilingJointly: brackets([
        [1_000, 0.02], [2_000, 0.03], [3_000, 0.04], [150_000, 0.0475], [175_000, 0.05],
        [225_000, 0.0525], [300_000, 0.055], [600_000, 0.0575], [1_200_000, 0.0625], [null, 0.065],
      ]),
      headOfHousehold: brackets([
        [1_000, 0.02], [2_000, 0.03], [3_000, 0.04], [150_000, 0.0475], [175_000, 0.05],
        [225_000, 0.0525], [300_000, 0.055], [600_000, 0.0575], [1_200_000, 0.0625], [null, 0.065],
      ]),
    },
    standardDeductionByFilingStatus: filingAmounts(3_350, 6_700, 3_350, 6_700),
    steppedPersonalExemption: {
      /*
       * The staircase is the same shape for everyone but starts $50,000 higher
       * on a joint return, which is why these are per status rather than one
       * shared list.
       */
      amountStepsByFilingStatus: {
        single: MD_EXEMPTION_STEPS_SINGLE,
        marriedFilingSeparately: MD_EXEMPTION_STEPS_SINGLE,
        marriedFilingJointly: MD_EXEMPTION_STEPS_JOINT,
        headOfHousehold: MD_EXEMPTION_STEPS_JOINT,
      },
      // Each spouse claims their own personal exemption on a joint return.
      countByFilingStatus: filingAmounts(1, 2, 1, 1),
    },
    localAddOn: {
      label: 'Maryland county or Baltimore City income tax',
      basis: 'county',
      appliesTo: 'taxable-income',
      // The Comptroller states the current range outright.
      typicalRateRange: { low: 0.0225, high: 0.033 },
    },
    notes: [
      'Maryland taxes taxable net income in ten bands from 2% to 6.5% (Comptroller of Maryland, 2025 Maryland Income Tax Rates and Brackets; Md. Code, Tax-Gen. 10-105).',
      'Joint filers and heads of household get wider bands from $3,000 upward; below that the schedule is the same for everyone.',
      'Standard deduction for 2025 is a flat $3,350 single, married filing separately or dependent, and $6,700 filing jointly, head of household or qualifying surviving spouse.',
      'The personal exemption is $3,200, halved above $100,000 of federal adjusted gross income and halved again above $125,000, reaching zero above $150,000. Those thresholds are $150,000, $175,000 and $200,000 on a joint return. Each dependent is another exemption at the same amount.',
      'Maryland\u2019s 23 counties and Baltimore City levy a local income tax between 2.25% and 3.30% of taxable income, collected on the same return. It depends on where you live and is not included here, and for many Marylanders it is comparable to the state tax itself.',
      'The 2% additional tax on net capital gain income, the poverty level credit, itemized deductions and the two-income subtraction are not modeled. The starting point is gross wages.',
    ],
  }],
  ['AR', {
    ...meta('AR', {
      sourceName: '2025 Arkansas Indexed Tax Brackets, with the 2025 Tax Tables and the AR1000F instructions',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    /*
     * Arkansas publishes its schedule as "rate times income, minus an
     * adjustment" rather than as marginal bands, and the two are not quite the
     * same curve — its constants are rounded. Carrying the state's own figure
     * at each band floor as `baseTax` reproduces the published formula to the
     * cent: 2% less $111.98, 3% less $223.97, 3.4% less $287.97, 3.9% less
     * $419.96, each of which is `baseTax` plus the rate times the band.
     *
     * The 2025 table is midpoint-based over $100 bands, so the figure Arkansas
     * prints for a given income can sit up to about two dollars either side of
     * the exact arithmetic here.
     */
    bracketsByFilingStatus: {
      single: brackets3(AR_REGULAR),
      marriedFilingJointly: brackets3(AR_REGULAR),
      marriedFilingSeparately: brackets3(AR_REGULAR),
      headOfHousehold: brackets3(AR_REGULAR),
    },
    standardDeductionByFilingStatus: filingAmounts(2_470, 4_940, 2_470, 2_470),
    exemptionCredit: {
      // $29 a credit. One for the taxpayer, one for a spouse on a joint
      // return, and one more for head of household or surviving spouse.
      perFilerByFilingStatus: filingAmounts(29, 58, 29, 58),
      perDependent: 29,
    },
    alternativeLowIncomeSchedule: {
      // Separate filers cannot use the low income tables at all: Arkansas
      // requires a joint return to qualify.
      appliesAtOrBelowByFilingStatus: filingAmounts(17_500, 29_000, 0, 25_300),
      bracketsByFilingStatus: {
        single: brackets3([[14_643, 0, undefined], [14_700, 0, 29], [null, 0.07, 29.50]]),
        marriedFilingJointly: brackets3([[24_695, 0, undefined], [24_700, 0, 77], [null, 0.104, 81.80]]),
        marriedFilingSeparately: brackets3([[null, 0, undefined]]),
        headOfHousehold: brackets3([[20_820, 0, undefined], [20_900, 0, 67], [null, 0.094, 72.30]]),
      },
    },
    notes: [
      'Arkansas taxes net taxable income at 0%, 2%, 3%, 3.4% and 3.9% for tax year 2025 (2025 Arkansas Indexed Tax Brackets; Act 1 of the Second Extraordinary Session of 2024).',
      'The department publishes the schedule as a rate times income less an adjustment. This row carries those adjustments as the tax owed at each band floor, so it reproduces the published formula rather than approximating it.',
      'Standard deduction for 2025 is $2,470, or $4,940 on a joint return. Each personal tax credit is $29 against tax: one for the taxpayer, one for a spouse filing jointly, and one more for head of household.',
      'Below $17,500 single, $25,300 head of household and $29,000 filing jointly, a qualifying filer uses the Low Income Tax Table instead, which is modeled here. Under that table a single filer owes nothing up to $14,643 of income, and a couple filing jointly nothing up to $24,695.',
      'Above $94,700 Arkansas takes its bracket adjustment back $10 at a time for every $100 of income, until it settles at $89.30. Those bands are carried as published; they raise tax by up to about $330 across that stretch.',
      'The published schedule does not quite meet itself at $100,000: continuing the band below gives $3,810.70 where the state states $3,809 plus 3.9% of the excess. The state\u2019s figure is used and the $1.70 step is its own.',
      'Arkansas rounds its own tables to the midpoint of $100 income bands, so its printed figure can differ from this by up to about two dollars.',
      'The additional credit for net income up to $27,600, the child care credit and itemized deductions are not modeled. The starting point is gross wages.',
    ],
  }],
  ['DE', {
    ...meta('DE', {
      sourceName: '2025 Delaware Income Tax Table and State Income Tax Schedule, with the PIT-RES instructions for the standard deduction and personal credits',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    /*
     * One schedule for every filing status; Delaware's table has a single tax
     * column. The bands reproduce the state's own $2,943.50 at $60,000 exactly,
     * which is the figure its schedule prints for everything above that.
     */
    bracketsByFilingStatus: {
      single: brackets([
        [2_000, 0], [5_000, 0.022], [10_000, 0.039], [20_000, 0.048], [25_000, 0.052], [60_000, 0.0555], [null, 0.066],
      ]),
      marriedFilingSeparately: brackets([
        [2_000, 0], [5_000, 0.022], [10_000, 0.039], [20_000, 0.048], [25_000, 0.052], [60_000, 0.0555], [null, 0.066],
      ]),
      marriedFilingJointly: brackets([
        [2_000, 0], [5_000, 0.022], [10_000, 0.039], [20_000, 0.048], [25_000, 0.052], [60_000, 0.0555], [null, 0.066],
      ]),
      headOfHousehold: brackets([
        [2_000, 0], [5_000, 0.022], [10_000, 0.039], [20_000, 0.048], [25_000, 0.052], [60_000, 0.0555], [null, 0.066],
      ]),
    },
    standardDeductionByFilingStatus: filingAmounts(3_250, 6_500, 3_250, 3_250),
    exemptionCredit: {
      // $110 a person, and the instructions' own example says a joint return
      // with no dependents enters $220.
      perFilerByFilingStatus: filingAmounts(110, 220, 110, 110),
      perDependent: 110,
    },
    localAddOn: {
      label: 'City of Wilmington wage tax',
      basis: 'municipality',
      appliesTo: 'taxable-income',
      omissionNote: 'Wilmington residents, and people who work in the city, pay 1.25% of wages (City of Wilmington Earned Income Tax Regulations). No other Delaware municipality levies an income tax. It is not included because this estimate does not know a city — if you live or work in Wilmington, real take-home is lower.',
    },
    notes: [
      'Delaware taxes taxable income in seven bands from 0% to 6.60% (2025 Delaware Income Tax Table and State Income Tax Schedule; 30 Del. C. 1102).',
      'The same bands apply to every filing status. Above $60,000 the state prints the tax as $2,943.50 plus 6.60% of the excess, which is exactly what these bands sum to.',
      'Standard deduction for 2025 is $3,250, or $6,500 on a joint return. Head of household uses $3,250, the same as single.',
      'Delaware gives $110 per person as a credit against tax rather than a deduction from income \u2014 $110 filing single, $220 filing jointly, and $110 for each dependent.',
      'The City of Wilmington levies a 1.25% earned income tax on residents and on wages earned in the city (City of Wilmington Earned Income Tax Regulations). It is named as an omission rather than estimated for the rest of Delaware.',
      'The additional deductions for age and blindness, the $110 credit for filers 60 and over, the child care credit and the earned income credit are not modeled. The starting point is gross wages.',
    ],
  }],
  ['OH', {
    ...meta('OH', {
      sourceName: 'R.C. 5747.02(A)(3)(c) and 5747.025 as amended by H.B. 96 (136th G.A.), tax year 2026',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    /*
     * 2026 collapses the 2025 $100,000 / 3.125% band. The statute still jumps
     * from $0 at $26,050 to $332 plus 2.75% of the excess, which is not 2.75%
     * of all income above the floor. `baseTax` carries that $332.
     */
    bracketsByFilingStatus: {
      single: brackets3([
        [26_050, 0, undefined], [null, 0.0275, 332],
      ]),
      marriedFilingSeparately: brackets3([
        [26_050, 0, undefined], [null, 0.0275, 332],
      ]),
      marriedFilingJointly: brackets3([
        [26_050, 0, undefined], [null, 0.0275, 332],
      ]),
      headOfHousehold: brackets3([
        [26_050, 0, undefined], [null, 0.0275, 332],
      ]),
    },
    // Ohio has no standard deduction. The exemption does all of the work.
    standardDeductionByFilingStatus: filingAmounts(0, 0, 0, 0),
    steppedPersonalExemption: {
      // Ohio uses one staircase for every filing status.
      amountStepsByFilingStatus: sameStepsForEveryStatus([
        { notOver: 40_000, amount: 2_400 },
        { notOver: 80_000, amount: 2_150 },
        { notOver: 499_999, amount: 1_900 },
        { notOver: null, amount: 0 },
      ]),
      countByFilingStatus: filingAmounts(1, 2, 1, 1),
    },
    localAddOn: {
      label: 'Ohio municipal and school district income tax',
      basis: 'municipality',
      appliesTo: 'taxable-income',
      // Two separate levies set by hundreds of municipalities and school
      // districts, with no statewide figure published, so the size is left
      // unstated rather than invented.
    },
    notes: [
      'Ohio taxes nonbusiness income for 2026 at 0% on a balance of $26,050 or less, then $332 plus 2.75% of the excess (R.C. 5747.02(A)(3)(c) as amended by H.B. 96, effective 30 September 2025). The 2025 $100,000 / 3.125% band is gone. The department’s annual-rate page still listed only 2025 at verification; the enacted statute is the 2026 annual computation.',
      'H.B. 96 suspends inflation indexing of the $26,050 floor and the personal-exemption dollar amounts for 2025 and 2026, so those stay at the 2025 figures: $2,400 / $2,150 / $1,900 by MAGI band (R.C. 5747.025; 2025 IT 1040). Eligibility for the exemption ends below $500,000 of MAGI in 2026, down from $750,000 in 2025. The exemption is per person, including dependents.',
      'The same schedule applies to every filing status. Ohio gives no standard deduction.',
      'Ohio municipalities and school districts levy their own income taxes on top of this, set locally and not included here.',
      'The exemption credit, joint filing credit, retirement and senior credits, and the separate 3% rate on business income are not modeled. The starting point is gross wages.',
    ],
  }],
  ['DC', {
    ...meta('DC', {
      sourceName: 'DC Individual and Fiduciary Income Tax Rates (tax years after 12/31/2021), with the 2025 D-40 booklet for the District\u2019s own standard deduction',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    // The rate schedule is open-ended from 2022; the deduction is stamped 2025,
    // and the row declares the older of the two.
    scheduleTaxYear: 2025,
    /*
     * One schedule for every filing status — the District does not widen its
     * brackets for joint filers, which is unusual enough to be worth stating
     * rather than looking like four copies of a mistake.
     */
    bracketsByFilingStatus: {
      single: brackets([
        [10_000, 0.04], [40_000, 0.06], [60_000, 0.065], [250_000, 0.085], [500_000, 0.0925], [1_000_000, 0.0975], [null, 0.1075],
      ]),
      marriedFilingSeparately: brackets([
        [10_000, 0.04], [40_000, 0.06], [60_000, 0.065], [250_000, 0.085], [500_000, 0.0925], [1_000_000, 0.0975], [null, 0.1075],
      ]),
      marriedFilingJointly: brackets([
        [10_000, 0.04], [40_000, 0.06], [60_000, 0.065], [250_000, 0.085], [500_000, 0.0925], [1_000_000, 0.0975], [null, 0.1075],
      ]),
      headOfHousehold: brackets([
        [10_000, 0.04], [40_000, 0.06], [60_000, 0.065], [250_000, 0.085], [500_000, 0.0925], [1_000_000, 0.0975], [null, 0.1075],
      ]),
    },
    standardDeductionByFilingStatus: filingAmounts(15_000, 30_000, 15_000, 22_500),
    exemptionCredit: {
      perFilerByFilingStatus: filingAmounts(0, 0, 0, 0),
      perDependent: 1_000,
      steppedPhaseOut: {
        // D.C. Code § 47-1806.17: $50 off the credit as a whole for each $1,000
        // or fraction thereof of AGI over the threshold. Maine's shape, not
        // California's per-exemption one — three children and one child lose
        // the same $50 per increment.
        startIncomeByFilingStatus: filingAmounts(55_000, 70_000, 35_000, 55_000),
        incrementByFilingStatus: filingAmounts(1_000, 1_000, 1_000, 1_000),
        reductionPerIncrement: 50,
        appliesTo: 'total',
      },
    },
    dependentAllowanceStatus: {
      kind: 'assumption',
      reason: 'The District’s child tax credit is $1,000 per qualifying child under 18. This estimate counts every dependent, so a filer whose dependents are not qualifying children is shown less tax than they owe. The credit is refundable and this estimate never takes state tax below zero, so a filer whose credit exceeds their tax is shown more tax than they owe.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'The District taxes taxable income in seven brackets from 4% to 10.75% for tax years beginning after December 31, 2021 (DC Office of Tax and Revenue, DC Individual and Fiduciary Income Tax Rates; D.C. Code 47-1806.03).',
      'The same brackets apply to every filing status. Only the standard deduction differs.',
      'Starting with tax year 2025 the District set its own basic standard deduction rather than following the federal one: $15,000 single, dependent filers and married filing separately, $22,500 head of household, $30,000 married filing jointly (2025 D-40 booklet).',
      'The District repealed its personal exemption, so the standard deduction is the whole of what comes off income here.',
      'The child tax credit is modeled at $1,000 for each dependent, reduced by $50 for each $1,000, or fraction thereof, of adjusted gross income above $55,000 single or head of household, $70,000 filing jointly and $35,000 filing separately (D.C. Code § 47-1806.17 as amended by temporary Law 26-89, in force at verification). Those figures are for tax year 2026, applied alongside the 2025 rate schedule and standard deduction. The credit is for a qualifying child under 18 claimed as a dependent; this estimate counts every dependent. It is refundable; this estimate never lets a credit take state tax below zero.',
      'The additional standard deduction for age or blindness, the DC EITC, itemized deductions and the Health Care Shared Responsibility payment are not modeled. The starting point is gross wages.',
    ],
  }],
  ['HI', {
    ...meta('HI', {
      sourceName: 'DOT Announcement 2024-03 (Act 46, SLH 2024) for the 2026 standard deduction, with 2025 N-11 Schedules I–III for the 2026 brackets',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    /*
     * Act 46 prints a rounded constant at each band floor ($859 at $24,000
     * single, $5,078 at $96,000 joint). Those are the figures the department
     * charges, so they are carried rather than the running product of the rates.
     */
    bracketsByFilingStatus: {
      single: brackets3([
        [9_600, 0.014, undefined], [14_400, 0.032, 134], [19_200, 0.055, 288], [24_000, 0.064, 552],
        [36_000, 0.068, 859], [48_000, 0.072, 1_675], [125_000, 0.076, 2_539], [175_000, 0.079, 8_391],
        [225_000, 0.0825, 12_341], [275_000, 0.09, 16_466], [325_000, 0.10, 20_966], [null, 0.11, 25_966],
      ]),
      marriedFilingSeparately: brackets3([
        [9_600, 0.014, undefined], [14_400, 0.032, 134], [19_200, 0.055, 288], [24_000, 0.064, 552],
        [36_000, 0.068, 859], [48_000, 0.072, 1_675], [125_000, 0.076, 2_539], [175_000, 0.079, 8_391],
        [225_000, 0.0825, 12_341], [275_000, 0.09, 16_466], [325_000, 0.10, 20_966], [null, 0.11, 25_966],
      ]),
      marriedFilingJointly: brackets3([
        [19_200, 0.014, undefined], [28_800, 0.032, 269], [38_400, 0.055, 576], [48_000, 0.064, 1_104],
        [72_000, 0.068, 1_718], [96_000, 0.072, 3_350], [250_000, 0.076, 5_078], [350_000, 0.079, 16_782],
        [450_000, 0.0825, 24_682], [550_000, 0.09, 32_932], [650_000, 0.10, 41_932], [null, 0.11, 51_932],
      ]),
      headOfHousehold: brackets3([
        [14_400, 0.014, undefined], [21_600, 0.032, 202], [28_800, 0.055, 432], [36_000, 0.064, 828],
        [54_000, 0.068, 1_289], [72_000, 0.072, 2_513], [187_500, 0.076, 3_809], [262_500, 0.079, 12_587],
        [337_500, 0.0825, 18_512], [412_500, 0.09, 24_699], [487_500, 0.10, 31_449], [null, 0.11, 38_949],
      ]),
    },
    standardDeductionByFilingStatus: filingAmounts(8_000, 16_000, 8_000, 12_000),
    // $1,144 an exemption. Hawaii never adopted the federal suspension of the
    // personal exemption, so it still has one.
    personalExemptionByFilingStatus: filingAmounts(1_144, 2_288, 1_144, 1_144),
    perDependentExemption: 1_144,
    notes: [
      'Hawaii taxes taxable income in twelve brackets from 1.40% to 11.00%. Act 46, SLH 2024 (DOT Announcement 2024-03) keeps the 2025 brackets for tax year 2026 and raises the standard deduction to $8,000 single or married filing separately, $16,000 married filing jointly, $12,000 head of household. The department’s FAQ restated those 2026 amounts on 27 August 2026.',
      'Each personal exemption remains $1,144 as a deduction from income (2025 N-11; HRS 235-54). Hawaii did not adopt the federal suspension of personal exemptions.',
      'Act 24, SLH 2026 (S.B. 3125) adds a 13% top bracket beginning in tax year 2027, not 2026. 2026 Form N-11 was not published at verification; the 2026 standard deduction is the enacted Act 46 amount and the brackets are the 2025 schedules that Act 46 continues into 2026.',
      'The alternative tax on capital gains, the additional exemption for taxpayers 65 and older, Hawaii credits and itemized deductions are not modeled. The starting point is gross wages.',
    ],
  }],
  ['OK', {
    ...meta('OK', {
      sourceName: 'Enrolled H.B. 2764 (approved 28 May 2025), amending 68 O.S. 2355(D) for tax year 2026, with 68 O.S. 2358 standard deduction amounts',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    /*
     * Statute writes "0% on the first $3,750, 2.5% on the next $1,150, 3.5% on
     * the next $2,300, 4.5% on the remainder." Inclusive not-over caps are
     * $3,750 / $4,900 / $7,200. Joint and head of household are doubled.
     */
    bracketsByFilingStatus: {
      single: brackets([
        [3_750, 0], [4_900, 0.025], [7_200, 0.035], [null, 0.045],
      ]),
      marriedFilingSeparately: brackets([
        [3_750, 0], [4_900, 0.025], [7_200, 0.035], [null, 0.045],
      ]),
      marriedFilingJointly: brackets([
        [7_500, 0], [9_800, 0.025], [14_400, 0.035], [null, 0.045],
      ]),
      headOfHousehold: brackets([
        [7_500, 0], [9_800, 0.025], [14_400, 0.035], [null, 0.045],
      ]),
    },
    standardDeductionByFilingStatus: filingAmounts(6_350, 12_700, 6_350, 9_350),
    // $1,000 an exemption: one filing single, two on a joint return.
    personalExemptionByFilingStatus: filingAmounts(1_000, 2_000, 1_000, 1_000),
    perDependentExemption: 1_000,
    notes: [
      'Oklahoma taxes Oklahoma taxable income for tax year 2026 at 0% on the first $3,750 single or married filing separately ($7,500 joint or head of household), 2.5% on the next $1,150 ($2,300), 3.5% on the next $2,300 ($4,600), and 4.5% on the remainder (enrolled H.B. 2764, approved 28 May 2025, amending 68 O.S. 2355(D)).',
      'The standard deduction is statutory and unindexed (68 O.S. 2358): $6,350 single or married filing separately, $12,700 married filing jointly, $9,350 head of household. Each exemption is $1,000 as a deduction from income.',
      'Married filing jointly and head of household use the same doubled bands. Form 511 for 2026 was not published at verification; these are the enacted 2026 annual rates, not withholding tables.',
      'Oklahoma additions, subtractions, the capital gain deduction and credits are not modeled. The starting point is gross wages.',
    ],
  }],
  ['IA', {
    ...meta('IA', {
      sourceName: 'Iowa IA 1040 Expanded Instructions (instruction year 2025), lines 2, 5, 8 and 19, and the exemption credit instructions',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    // IA 1040 line 2 is federal taxable income from Form 1040 line 15.
    taxableIncomeBasis: 'federal-taxable-income',
    rate: 0.038,
    exemptionByFilingStatus: filingAmounts(0, 0, 0, 0),
    exemptionCredit: {
      // One $40 personal credit, or two filing jointly or as head of household.
      perFilerByFilingStatus: filingAmounts(40, 80, 40, 80),
      perDependent: 40,
    },
    localAddOn: {
      label: 'Iowa school district surtax',
      basis: 'school-district',
      appliesTo: 'state-tax-liability',
      // The department's own 2025 table (41-027) runs from 0% to 20%, and a
      // few counties add an emergency medical services surtax on top.
      typicalRateRange: { low: 0, high: 0.20 },
    },
    notes: [
      'Iowa taxes income at a flat 3.8% (Iowa DOR, IA 1040 Expanded Instructions, line 5).',
      'IA 1040 line 2 starts from federal taxable income, so the federal standard deduction is already out of the base and Iowa adds none of its own.',
      'The exemption credit is $40 per personal credit \u2014 one filing single or separately, two filing jointly or as head of household \u2014 plus $40 per dependent. It is a credit against tax, not a deduction, and cannot take the bill below zero.',
      'Iowa school districts levy a surtax as a percentage of state tax after credits, from 0% to 20% in the department\u2019s 2025 table, and six counties add an emergency medical services surtax. It depends on where you live and is not included here.',
      'The Iowa alternate tax computation, available to filers other than single, is not modeled. The additional $20 credits for age and blindness are not modeled either.',
    ],
  }],
  ['MT', {
    ...meta('MT', {
      sourceName: '2026 Montana Publication 1 tax tables (HB 337), ordinary income rates for tax year 2026',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    /*
     * Form 2 starts from federal taxable income: line 1 is federal AGI, line 2
     * the federal deduction, line 3 the difference. Montana's own deduction of
     * federal income tax was repealed with the 2024 restructure, so despite
     * what older summaries say there is nothing here to deduct.
     */
    taxableIncomeBasis: 'federal-taxable-income',
    bracketsByFilingStatus: {
      single: brackets([[47_500, 0.047], [null, 0.0565]]),
      marriedFilingSeparately: brackets([[47_500, 0.047], [null, 0.0565]]),
      marriedFilingJointly: brackets([[95_000, 0.047], [null, 0.0565]]),
      headOfHousehold: brackets([[71_250, 0.047], [null, 0.0565]]),
    },
    standardDeductionByFilingStatus: filingAmounts(0, 0, 0, 0),
    dependentAllowanceStatus: {
      kind: 'none',
      reason: 'Montana does not give a per-dependent allowance: the personal and dependent exemptions were repealed with the 2024 rewrite of its income tax, which starts from federal taxable income.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'Montana taxes ordinary income at 4.7% on the first $47,500 single or married filing separately, $95,000 married filing jointly and $71,250 head of household, and 5.65% above that (2026 Montana Publication 1 tax tables; HB 337 of 2025).',
      'Montana Form 2 starts from federal taxable income, so the federal standard deduction is already out of the base and Montana adds no deduction of its own.',
      '2026 Form 2 was not published at verification. Publication 1 is the department\'s 2026 estimated-tax guide and prints the 2026 ordinary-income tables used here. 2027 tables in the same PDF are not used.',
      'Montana taxes net long-term capital gains at separate 3.0% and 4.1% rates. Those do not apply to wages and are not modeled.',
      'The volunteer-firefighter subtraction, the subtraction for taxpayers 65 and older, Montana additions and credits are not modeled. The starting point is gross wages.',
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
    dependentAllowanceStatus: {
      kind: 'none',
      reason: 'North Dakota does not give a per-dependent allowance: it starts from federal taxable income, which already carries the federal treatment of dependents, and adds no exemption of its own.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
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
    perDependentExemption: 4_930,
    dependentAllowanceStatus: {
      kind: 'assumption',
      reason: 'South Carolina allows a second deduction of the same amount for each dependent under six. This estimate has no age input, so it leaves that out and shows more tax than a filer with young children owes.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'South Carolina has two brackets for tax year 2026: 1.99% below $30,000 of taxable income and 5.21% above it, which the state writes as 5.21% minus $966 (SCDOR Information Letter #26-20; S.C. Code 12-6-510).',
      'For 2026 South Carolina decoupled from the federal deductions in IRC 63(b)-(g), so its starting point is federal adjusted gross income rather than federal taxable income. For a wage-only filer that is gross pay.',
      'The South Carolina Income Adjusted Deduction replaces the federal standard deduction: $15,000 single and married filing separately, $22,500 head of household, $30,000 married filing jointly. It falls to zero across AGI of $40,000-$95,000, $60,000-$142,500 and $80,000-$190,000 respectively, and the reduction is rounded down to the next lowest $10.',
      'The dependent exemption is $4,930 for each dependent claimed on the federal return, subtracted from South Carolina taxable income with no phase-out (2025 SC1040 instructions, worksheet for line w; S.C. Code 12-6-1140(13)). That is the 2025 indexed figure, the latest South Carolina has published; the amount is indexed annually and the 2026 one was not available at verification.',
      'South Carolina allows a second deduction of the same amount for each dependent who had not reached age six (S.C. Code 12-6-1160). This estimate has no age input, so it does not apply that doubling and understates the deduction for a filer with young children.',
      'The 125% earned income credit capped at $200 and other South Carolina credits are not modeled. The starting point is gross wages.',
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
    exemptionCredit: {
      // Maine's personal exemption is a deduction and is modelled separately;
      // nothing here is per filer.
      perFilerByFilingStatus: filingAmounts(0, 0, 0, 0),
      perDependent: 305,
      steppedPhaseOut: {
        startIncomeByFilingStatus: filingAmounts(100_000, 150_000, 75_000, 125_000),
        incrementByFilingStatus: filingAmounts(500, 500, 500, 500),
        reductionPerIncrement: 20,
        appliesTo: 'total',
      },
    },
    dependentAllowanceStatus: {
      kind: 'assumption',
      reason: 'Maine doubles this credit for a dependent under six, and refunds it to residents even when it exceeds their tax. This estimate has no age input and never takes state tax below zero, so it shows more tax than such a filer owes.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'Maine income tax rates for tax year 2026 are 5.8%, 6.75% and 7.15% (36 M.R.S. 5111 as inflation-adjusted under 36 M.R.S. 5403; Maine Revenue Services, 2026 Individual Income Tax Rates, revised May 20, 2026).',
      'Standard deduction for 2026: $15,700 single and married filing separately, $31,400 married filing jointly, $23,550 head of household. Personal exemption is $5,300 for the taxpayer, doubled on a joint return.',
      'Both are phased out in proportion to income above $102,250 single, $153,400 head of household and $204,550 filing jointly, reaching zero $75,000, $112,500 and $150,000 further up. That band starts inside ordinary salaries, so it is modeled rather than noted.',
      'A 2% surcharge applies to Maine taxable income above $1,000,000 single, $750,000 married filing separately and $1,500,000 filing jointly or head of household, for tax years beginning on or after January 1, 2026.',
      'The rate schedule states that it must not be used to compute withholding from wages; this model estimates annual liability, not withholding.',
      'Maine credits, itemized deductions and the additional deduction for age or blindness are not modeled. The dependent exemption tax credit (36 M.R.S. 5219-SS) is modeled at $305 for each dependent, reduced by $20 for each $500, or fraction thereof, of Maine adjusted gross income above $100,000 single, $125,000 head of household, $150,000 filing jointly and $75,000 filing separately (2025 Form 1040ME instructions). Those are the 2025 figures, the latest Maine has published for the credit, applied alongside the 2026 rate schedule.',
      'Maine doubles that credit for a dependent under six and makes it refundable for residents. This estimate has no age input and never lets a credit take state tax below zero, so it understates the benefit for a filer with young children or with little Maine tax to offset. The starting point is gross wages.',
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
    familySizeTaxCredit: {
      // 2026 HHS poverty guidelines for the 48 contiguous states, FR 2026-00755,
      // which are the guidelines available on 30 June 2026 (KRS 141.066).
      povertyByFamilySize: { 1: 15_960, 2: 21_640, 3: 27_320, 4: 33_000 },
      filerCountByFilingStatus: filingAmounts(1, 2, 1, 1),
      maxFamilySize: 4,
      shareSteps: KY_FAMILY_SIZE_SHARE_STEPS,
    },
    localAddOn: {
      label: 'Kentucky local occupational license tax',
      basis: 'county',
      appliesTo: 'taxable-income',
      // Deliberately unsized. Hundreds of Kentucky cities and counties set
      // their own occupational rates and no state agency publishes a statewide
      // band, so the page names the omission without inventing its size.
    },
    dependentAllowanceStatus: {
      kind: 'assumption',
      reason: 'Kentucky’s family size tax credit counts qualifying children toward family size and is read on modified gross income. This estimate counts every dependent and treats wages as that income, so a filer whose dependents are not qualifying children, or who has other modified gross income, is shown less tax than they owe.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'Kentucky taxes individual income at a flat 3.5% for 2026, on wages less a $3,360 standard deduction (Kentucky DOR, 2026 Kentucky Withholding Tax Formula, form 42A003 (TCF)(10-2025); KRS 141.020 as amended by H.B. 1 of 2025; KRS 141.081(2)(a)).',
      'That document computes gross annual Kentucky tax, not a withholding approximation: its own example takes $39,240 of annual wages to $35,880 of Kentucky taxable wages and $1,255.80 of tax.',
      'The standard deduction is one figure for every filing status. On a Kentucky combined return each spouse claims it separately; this model has one income and claims it once.',
      'The family size tax credit (KRS 141.066) is modeled: family size is the filer, plus a spouse on a joint return, plus dependents, capped at four. 100% of the tax is credited at or below the 2026 HHS poverty guideline for that size ($15,960 / $21,640 / $27,320 / $33,000; FR 2026-00755), then a published share down to 10% at 133% of that guideline. Qualifying dependents are qualifying children under IRC 152(c); this estimate counts every dependent. Modified gross income is treated as wages. The dependent-care credit is not modeled.',
      'Kentucky cities and counties levy occupational license taxes on wages, which are not included and are not estimated because no state agency publishes a statewide rate.',
      'Kentucky itemized deductions and the pension income exclusion are not modeled.',
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
      // Utah's personal exemption is per dependent only. The salary and
      // paycheck calculators pass dependents, so that credit is applied.
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
      'The Utah personal exemption is $2,111 per dependent for 2025. That amount is credited at 6% when dependents are supplied.',
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
      'The additional $1,500 exemptions for age and blindness are not modeled. Each dependent is another $1,500, which is. The starting point is gross wages.',
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
    federalStandardDeductionAddBack: {
      appliesAboveIncomeByFilingStatus: filingAmounts(300_000, 300_000, 300_000, 300_000),
      keepAmountByFilingStatus: filingAmounts(12_000, 16_000, 12_000, 12_000),
    },
    exemptionCredit: {
      perFilerByFilingStatus: filingAmounts(0, 0, 0, 0),
      perDependent: 0,
      // Looked up on federal AGI (gross wages here), not on Colorado taxable
      // income. Single, head of household and married filing separately share
      // the single table (CRS 39-22-129; ITT Child Tax Credit, January 2026).
      perDependentAmountStepsByFilingStatus: {
        single: CO_CTC_SINGLE,
        marriedFilingSeparately: CO_CTC_SINGLE,
        headOfHousehold: CO_CTC_SINGLE,
        marriedFilingJointly: CO_CTC_JOINT,
      },
    },
    dependentAllowanceStatus: {
      kind: 'assumption',
      reason: 'Colorado’s child tax credit is $1,200 / $600 / $200 per eligible child under six, by federal AGI. This estimate has no age input and applies that credit to every dependent, so a filer whose children are older is shown less tax than they owe. The credit is refundable and this estimate never takes state tax below zero, so a filer whose credit exceeds their tax is shown more tax than they owe.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'Colorado taxes federal taxable income at a flat 4.40% (2025 Colorado Individual Income Tax Filing Guide, DR 0104 Book, line 13).',
      'Colorado has no standard deduction or personal exemption of its own. The federal standard deduction is already inside its starting figure, which is why this row reads it from the federal snapshot rather than restating it.',
      'The rate moves with TABOR refund mechanisms rather than staying fixed, so this row is declared as the 2025 schedule. It had not been republished for 2026 at verification.',
      'Above $300,000 of federal adjusted gross income Colorado adds back the part of the federal standard deduction over $12,000 ($16,000 filing jointly). That addback is modeled.',
      'The child tax credit is modeled at the 2025 amounts, the latest Colorado has published: $1,200 / $600 / $200 per eligible child under six, by federal AGI band, with a wider staircase for joint filers (CRS 39-22-129; Colorado DOR, Income Tax Topics: Child Tax Credit, January 2026). This estimate has no age input and applies that credit to every dependent. The credit is refundable; this estimate never lets a credit take state tax below zero. The Family Affordability Tax Credit is paused for tax year 2026 and is not included.',
      'Colorado additions, subtractions, the alternative minimum tax and other credits are not modeled.',
    ],
  }],
  ['MA', {
    ...meta('MA', {
      sourceName: 'Massachusetts DOR tax rates page (5% + 4% surtax) and Personal Income Tax Exemptions / Form 1 line 11',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flatWithSurtax',
    sourceStatus: 'verified',
    scheduleTaxYear: TAX_YEAR,
    rate: 0.05,
    surtaxRate: 0.04,
    surtaxThreshold: 1_107_750,
    exemptionByFilingStatus: filingAmounts(4_400, 8_800, 4_400, 6_800),
    perDependentExemption: 1_000,
    ficaDeductionCap: 2_000,
    notes: [
      'Massachusetts Part B income (including wages) is taxed at 5% for tax year 2026 (Massachusetts DOR tax rates page, updated December 30, 2025). Income exceeding $1,107,750 of Massachusetts taxable income is subject to an additional 4% surtax.',
      'The personal exemption is $4,400 single or married filing separately, $8,800 married filing jointly, $6,800 head of household, plus $1,000 per dependent (Mass.gov, Personal Income Tax Exemptions, updated 6 January 2026; 2025 Form 1). 2026 Form 1 was not published at verification; the department has not restated these amounts as changing for 2026.',
      'Form 1 line 11 deducts Social Security and Medicare withheld, capped at $2,000 per earner (2025 Form 1). This model has one wage income, so the cap is $2,000. Age, blindness and rental deductions are not modeled.',
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
    exemptionCredit: {
      // Form 540 line 7: $153 an exemption, two of them on a joint return.
      perFilerByFilingStatus: filingAmounts(153, 306, 153, 153),
      // Line 10.
      perDependent: 475,
      steppedPhaseOut: {
        startIncomeByFilingStatus: filingAmounts(252_203, 504_411, 252_203, 378_310),
        incrementByFilingStatus: filingAmounts(2_500, 2_500, 1_250, 2_500),
        reductionPerIncrement: 6,
        appliesTo: 'each-exemption',
        filerExemptionCountByFilingStatus: filingAmounts(1, 2, 1, 1),
      },
    },
    notes: [
      'California 2026 Form 540 rate schedules were not published at verification. This snapshot uses the official 2025 FTB indexed tax rate schedules and 2025 standard deduction.',
      'Mental Health Services Tax is 1% of taxable income over $1,000,000 (Cal. Rev. & Tax. Code § 17043).',
      'The exemption credits are the 2025 Form 540 amounts: $153 for each personal exemption (line 7, two on a joint return) and $475 for each dependent (line 10). They are credits against tax, not deductions from income.',
      'Above $252,203 of AGI single, $504,411 joint or $378,310 head of household, the AGI Limitation Worksheet cuts $6 from every exemption credit for each whole $2,500 over the threshold ($1,250 filing separately), rounded up. The filer credits and the dependent credits are floored at zero separately, as worksheet lines i and m do it.',
      'Senior and blind exemption credits, the renter credit, other California credits and itemized deductions are not modeled. California levies no local wage income tax.',
    ],
  }],
  ['NJ', {
    ...meta('NJ', {
      sourceName: 'New Jersey Division of Taxation GIT overview and 2025 NJ-1040 instructions (exemptions and filing threshold)',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    standardDeductionByFilingStatus: filingAmounts(0, 0, 0, 0),
    personalExemptionByFilingStatus: filingAmounts(1_000, 2_000, 1_000, 1_000),
    perDependentExemption: 1_500,
    alternativeLowIncomeSchedule: {
      appliesAtOrBelowByFilingStatus: filingAmounts(10_000, 20_000, 10_000, 20_000),
      bracketsByFilingStatus: {
        single: brackets([[null, 0]]),
        marriedFilingJointly: brackets([[null, 0]]),
        marriedFilingSeparately: brackets([[null, 0]]),
        headOfHousehold: brackets([[null, 0]]),
      },
    },
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
      'A filer with New Jersey gross income of $10,000 or less (single or married filing separately) or $20,000 or less (joint or head of household) pays no tax (GIT overview). Above that, the regular exemption is $1,000 for the filer, $1,000 for a spouse on a joint return, and $1,500 per dependent (2025 NJ-1040 instructions, lines 6 and 10).',
      'Age, blindness, veteran and college-dependent extras, retirement exclusions and credits are not modeled. The starting point is gross wages.',
    ],
  }],
  ['MO', {
    ...meta('MO', {
      sourceName: '2025 Form MO-1040 instructions: Line 12 federal tax percentage, Line 13 cap, tax rate chart and worksheet examples',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    /*
     * Missouri publishes each band as "$X plus Y% of the excess". The lump
     * amounts round the tax at each threshold ($26.26 of 2% on $1,313 becomes
     * $26), so they are carried as `baseTax` rather than summed from below.
     * Combined filers compute tax separately on each spouse's column; a
     * one-income joint return is the Y column alone.
     */
    bracketsByFilingStatus: {
      single: brackets3([
        [1_313, 0, undefined], [2_626, 0.02, 0], [3_939, 0.025, 26], [5_252, 0.03, 59],
        [6_565, 0.035, 98], [7_878, 0.04, 144], [9_191, 0.045, 197], [null, 0.047, 256],
      ]),
      marriedFilingSeparately: brackets3([
        [1_313, 0, undefined], [2_626, 0.02, 0], [3_939, 0.025, 26], [5_252, 0.03, 59],
        [6_565, 0.035, 98], [7_878, 0.04, 144], [9_191, 0.045, 197], [null, 0.047, 256],
      ]),
      marriedFilingJointly: brackets3([
        [1_313, 0, undefined], [2_626, 0.02, 0], [3_939, 0.025, 26], [5_252, 0.03, 59],
        [6_565, 0.035, 98], [7_878, 0.04, 144], [9_191, 0.045, 197], [null, 0.047, 256],
      ]),
      headOfHousehold: brackets3([
        [1_313, 0, undefined], [2_626, 0.02, 0], [3_939, 0.025, 26], [5_252, 0.03, 59],
        [6_565, 0.035, 98], [7_878, 0.04, 144], [9_191, 0.045, 197], [null, 0.047, 256],
      ]),
    },
    // 2025 federal standard deduction amounts, which Missouri uses as its own.
    standardDeductionByFilingStatus: filingAmounts(15_750, 31_500, 15_750, 23_625),
    // Line 15 additional exemption for head of household / qualifying widow(er).
    personalExemptionByFilingStatus: filingAmounts(0, 0, 0, 1_400),
    federalDeduction: {
      capByFilingStatus: filingAmounts(5_000, 10_000, 5_000, 5_000),
      federalTaxBase: 'income-tax',
      shareOfFederalTax: {
        rateStepsByFilingStatus: sameRateStepsForEveryStatus(MO_FEDERAL_TAX_SHARE),
      },
    },
    localAddOn: {
      label: 'Kansas City and St. Louis earnings tax',
      basis: 'municipality',
      appliesTo: 'taxable-income',
    },
    dependentAllowanceStatus: {
      kind: 'none',
      reason: 'Missouri does not give a per-dependent allowance: its dependent exemption ended when the federal personal exemption it was tied to went to zero.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'Missouri taxes Missouri taxable income on the 2025 MO-1040 tax rate chart, the same schedule for every filing status: $0 through $1,313, then 2.0% to 4.7% of the excess over each $1,313 band, with published lumps at each threshold (2025 Form MO-1040 instructions). 2026 MO-1040 was not published at verification.',
      'The standard deduction is the 2025 federal amount: $15,750 single or married filing separately, $31,500 married filing combined, $23,625 head of household. Head of household and qualifying widow(er) also take a $1,400 additional exemption on Line 15.',
      'Missouri subtracts a percentage of federal income tax (MO-1040 Line 11, federal Form 1040 total tax, not withholding) based on Missouri AGI on Line 6: 35% at or below $25,000, 25% to $50,000, 15% to $100,000, 5% to $125,000, and 0% above. That product is capped at $5,000, or $10,000 on a combined return. The percentage is looked up on AGI, not on income after the deduction.',
      'A combined return computes tax separately on each spouse\'s Missouri taxable income. This model has one wage income and treats a joint filer as the Y column of a one-income combined return.',
      'Kansas City and St. Louis levy an earnings tax that is not included. No statewide rate is published, so the page names the omission without inventing its size.',
      'Missouri itemized deductions, the property tax credit, and other MO-A adjustments are not modeled. The starting point is gross wages.',
    ],
  }],
  ['AL', {
    ...meta('AL', {
      sourceName: '2025 Form 40 booklet: standard deduction chart, personal exemption, tax tables and Form 40A Brown example',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    bracketsByFilingStatus: {
      single: brackets([
        [500, 0.02], [3_000, 0.04], [null, 0.05],
      ]),
      marriedFilingSeparately: brackets([
        [500, 0.02], [3_000, 0.04], [null, 0.05],
      ]),
      headOfHousehold: brackets([
        [500, 0.02], [3_000, 0.04], [null, 0.05],
      ]),
      marriedFilingJointly: brackets([
        [1_000, 0.02], [6_000, 0.04], [null, 0.05],
      ]),
    },
    steppedStandardDeduction: {
      amountStepsByFilingStatus: {
        single: AL_SD_SINGLE,
        marriedFilingJointly: AL_SD_JOINT,
        marriedFilingSeparately: AL_SD_SEPARATE,
        headOfHousehold: AL_SD_HEAD,
      },
    },
    personalExemptionByFilingStatus: filingAmounts(1_500, 3_000, 1_500, 3_000),
    steppedDependentExemption: {
      amountStepsByFilingStatus: {
        single: AL_DEPENDENT_STEPS,
        marriedFilingJointly: AL_DEPENDENT_STEPS,
        marriedFilingSeparately: AL_DEPENDENT_STEPS,
        headOfHousehold: AL_DEPENDENT_STEPS,
      },
      countedAs: 'dependent',
    },
    federalDeduction: {
      capByFilingStatus: null,
      federalTaxBase: 'income-tax-plus-niit-minus-refundable-credits',
    },
    localAddOn: {
      label: 'Alabama municipal occupational tax',
      basis: 'municipality',
      appliesTo: 'taxable-income',
    },
    notes: [
      'Alabama taxes taxable income at 2%, 4% and 5% (Alabama Department of Revenue FAQ; 2025 Form 40 booklet tax tables). Single, head of family and married filing separately: 2% of the first $500, 4% of the next $2,500, 5% over $3,000. Married filing jointly: 2% of the first $1,000, 4% of the next $5,000, 5% over $6,000. 2026 Form 40 was not published at verification.',
      'The standard deduction is the 21-row chart on pages 8–9 of the 2025 Form 40 booklet, looked up on Alabama AGI (line 10), not a single figure and not a linear phase-out. Married filing jointly: $8,500 at or below $25,999, then $175 less in each $500 band to $5,000 at $35,500 and above. Head of family: $5,200 down $135 per $500 to $2,500. Single: $3,000 down $25 per $500 to $2,500, on the same $26,000–$35,500 income bands. Married filing separately: $4,250 at or below $12,999, then $88 less in each $250 band to $2,500 at $17,750 and above.',
      'The personal exemption is $1,500 single or married filing separately and $3,000 married filing jointly or head of family (Form 40 lines 1–4). The dependent exemption is $1,000 per dependent where Alabama AGI is $50,000 or less, $500 to $100,000 and $300 above that (Form 40 booklet page 8), read on line 10 like the standard deduction chart rather than after the federal tax subtraction on line 12.',
      'Alabama subtracts federal income tax in full (Form 40 line 12 worksheet: Form 1040 line 22 plus NIIT, minus refundable credits, not below zero). For a wage-only filer with none of those extras, that is the federal income tax this engine computes.',
      'Alabama cities levy occupational taxes that are not included. No statewide rate is published, so the page names the omission without inventing its size.',
      'Alabama itemized deductions, credits and other Form 40 adjustments are not modeled. The starting point is gross wages.',
    ],
  }],
  ['KS', {
    ...meta('KS', {
      sourceName: '2025 Kansas Individual Income Tax Booklet (K-40), tax tables and computation worksheet, with K.S.A. 79-32,110b',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    bracketsByFilingStatus: {
      single: brackets([[23_000, 0.052], [null, 0.0558]]),
      headOfHousehold: brackets([[23_000, 0.052], [null, 0.0558]]),
      marriedFilingSeparately: brackets([[23_000, 0.052], [null, 0.0558]]),
      marriedFilingJointly: brackets([[46_000, 0.052], [null, 0.0558]]),
    },
    standardDeductionByFilingStatus: filingAmounts(3_605, 8_240, 4_120, 6_180),
    personalExemptionByFilingStatus: filingAmounts(9_160, 18_320, 9_160, 11_480),
    perDependentExemption: 2_320,
    notes: [
      'Kansas taxes Kansas taxable income at 5.2% then 5.58% for tax year 2024 and thereafter (K.S.A. 79-32,110b; 2025 K-40 booklet tax computation worksheet). Married filing jointly: 5.2% of the first $46,000, then 5.58%. All other individuals: 5.2% of the first $23,000, then 5.58%. The worksheet\'s $175 / $87 subtraction is the same arithmetic. 2026 K-40 was not published at verification; the statute is "all tax years thereafter."',
      'The 2025 standard deduction is $3,605 single, $8,240 married filing jointly, $6,180 head of household, $4,120 married filing separately (2025 K-40 booklet).',
      'The personal exemption allowance is $9,160 single or married filing separately, $18,320 married filing jointly, and $11,480 head of household ($9,160 plus the additional $2,320 head-of-household exemption). Each dependent is another $2,320. Age, birth and disabled-veteran extras are not modeled.',
      'Kansas credits and Schedule S adjustments are not modeled. The starting point is gross wages.',
    ],
  }],
  ['VA', {
    ...meta('VA', {
      sourceName: '2025 Form 760 Resident Individual Income Tax Instructions: standard deduction, exemptions, tax rate schedule example',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    bracketsByFilingStatus: {
      single: brackets([[3_000, 0.02], [5_000, 0.03], [17_000, 0.05], [null, 0.0575]]),
      marriedFilingSeparately: brackets([[3_000, 0.02], [5_000, 0.03], [17_000, 0.05], [null, 0.0575]]),
      headOfHousehold: brackets([[3_000, 0.02], [5_000, 0.03], [17_000, 0.05], [null, 0.0575]]),
      marriedFilingJointly: brackets([[3_000, 0.02], [5_000, 0.03], [17_000, 0.05], [null, 0.0575]]),
    },
    standardDeductionByFilingStatus: filingAmounts(8_750, 17_500, 8_750, 8_750),
    personalExemptionByFilingStatus: filingAmounts(930, 1_860, 930, 930),
    perDependentExemption: 930,
    /*
     * Form 760: if VAGI is less than $11,950 single / $23,900 joint, enter $0
     * of tax even though the schedule would charge a few dollars. The
     * alternative-schedule shape already means "this table instead of
     * deductions," and a 0% table is exactly that instruction.
     */
    alternativeLowIncomeSchedule: {
      appliesAtOrBelowByFilingStatus: filingAmounts(11_949, 23_899, 11_949, 11_949),
      bracketsByFilingStatus: {
        single: brackets([[null, 0]]),
        marriedFilingJointly: brackets([[null, 0]]),
        marriedFilingSeparately: brackets([[null, 0]]),
        headOfHousehold: brackets([[null, 0]]),
      },
    },
    notes: [
      'Virginia taxes Virginia taxable income at 2% of the first $3,000, $60 plus 3% of the excess over $3,000 through $5,000, $120 plus 5% through $17,000, and $720 plus 5.75% above that (2025 Form 760 instructions, tax rate schedule). The same schedule is used for every filing status. Head of household files as single with an oval and uses the single deduction.',
      'The 2025–2026 standard deduction is $8,750 filing status 1 or 3 and $17,500 filing status 2 (2025 General Assembly increase). Personal and dependent exemptions are $930 each.',
      'If Virginia AGI is less than $11,950 single or married filing separately, or $23,900 married filing jointly, Form 760 says to enter $0 of tax. That floor is modeled; it is not the standard deduction plus exemption, which is a smaller figure.',
      'The spouse tax adjustment (up to $259) applies only when both spouses have Virginia AGI. This model has one wage income, so a joint filer does not qualify — matching the worksheet instruction to stop if either spouse\'s amount is zero.',
      'Virginia credits, itemized deductions, the age deduction and locality taxes are not modeled. The starting point is gross wages.',
    ],
  }],
  ['WV', {
    ...meta('WV', {
      sourceName: 'W.Va. Code §11-21-4j (2026 rates) and §11-21-16 (personal exemption)',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    bracketsByFilingStatus: {
      single: brackets([[10_000, 0.0211], [25_000, 0.0281], [40_000, 0.0316], [60_000, 0.0422], [null, 0.0458]]),
      headOfHousehold: brackets([[10_000, 0.0211], [25_000, 0.0281], [40_000, 0.0316], [60_000, 0.0422], [null, 0.0458]]),
      marriedFilingJointly: brackets([[10_000, 0.0211], [25_000, 0.0281], [40_000, 0.0316], [60_000, 0.0422], [null, 0.0458]]),
      marriedFilingSeparately: brackets([[5_000, 0.0211], [12_500, 0.0281], [20_000, 0.0316], [30_000, 0.0422], [null, 0.0458]]),
    },
    standardDeductionByFilingStatus: filingAmounts(0, 0, 0, 0),
    personalExemptionByFilingStatus: filingAmounts(2_000, 4_000, 2_000, 2_000),
    perDependentExemption: 2_000,
    notes: [
      'West Virginia taxes West Virginia taxable income for tax years beginning on or after January 1, 2026 at 2.11%, 2.81%, 3.16%, 4.22% and 4.58% (W.Va. Code §11-21-4j). Married filing separately uses half the bracket widths. The same full table applies to single, joint, head of household and surviving-spouse filers.',
      'The personal exemption is $2,000 for each federal exemption (W.Va. Code §11-21-16), so $2,000 single and $4,000 joint in this model. There is no West Virginia standard deduction. A dependent claimed as a federal exemption is another $2,000. The $500 exemption for a filer who cannot claim a federal exemption is not modeled.',
      'West Virginia credits, the low-income exclusion and other modifications in §11-21-12 are not modeled. The starting point is gross wages.',
    ],
  }],
  ['WI', {
    ...meta('WI', {
      sourceName: '2026 Form 1-ES instructions, standard deduction schedules and tax rate schedules',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    bracketsByFilingStatus: {
      single: brackets([[15_110, 0.035], [51_950, 0.044], [332_720, 0.053], [null, 0.0765]]),
      headOfHousehold: brackets([[15_110, 0.035], [51_950, 0.044], [332_720, 0.053], [null, 0.0765]]),
      marriedFilingJointly: brackets([[20_150, 0.035], [69_260, 0.044], [443_630, 0.053], [null, 0.0765]]),
      /*
       * Schedule C prints $1,433.00 at the $34,630 floor; summing the bands
       * beneath it gives $1,432.00. The published constant is carried as
       * baseTax from that point, the same way Ohio and Vermont are.
       */
      marriedFilingSeparately: brackets3([
        [10_080, 0.035, undefined],
        [34_630, 0.044, undefined],
        [221_820, 0.053, 1_433],
        [null, 0.0765, 11_354.07],
      ]),
    },
    standardDeductionRatePhaseOut: {
      stagesByFilingStatus: {
        single: WI_SD_SINGLE,
        headOfHousehold: WI_SD_HEAD,
        marriedFilingJointly: WI_SD_JOINT,
        marriedFilingSeparately: WI_SD_SEPARATE,
      },
    },
    personalExemptionByFilingStatus: filingAmounts(700, 1_400, 700, 700),
    perDependentExemption: 700,
    notes: [
      'Wisconsin taxes Wisconsin taxable income at 3.5%, 4.4%, 5.3% and 7.65% for 2026 (2026 Form 1-ES instructions, tax rate schedules A–C). Single and head of household share Schedule A. Married filing separately uses Schedule C, whose published $1,433 lump at $34,630 does not reconcile with summing the bands beneath it and is stored as published.',
      'The 2026 standard deduction is income-dependent: $13,960 single until Wisconsin income $20,119, then $13,960 less 12% of the amount over $20,120, to zero above $136,453. Joint: $25,840 until $29,039, then less 19.778% over $29,040. Separate: $12,280 until $13,779, then less 19.778% over $13,780. Head of household: $18,030 until $20,119, then $18,030 less 22.515% over $20,120 until $58,827, then the single 12% formula. That two-stage switch is modeled as published; a single phase-out would miss it.',
      'The personal exemption is $700 for the filer, $700 for a spouse on a joint return, and $700 for each dependent. The extra $250 for age 65 or over is not modeled. A filer claimed as a dependent on someone else\'s return takes no exemption.',
      'Wisconsin credits, itemized deductions and the married-couple credit are not modeled. The starting point is gross wages treated as Wisconsin income.',
    ],
  }],
  ['ID', {
    ...meta('ID', {
      sourceName: '2025 Form 40 packet (EIN00046), tax worksheet and standard deduction worksheet',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    rate: 0.053,
    standardDeductionByFilingStatus: filingAmounts(15_750, 31_500, 15_750, 23_625),
    exemptionByFilingStatus: filingAmounts(4_811, 9_622, 4_811, 9_622),
    dependentAllowanceStatus: {
      kind: 'none',
      reason: 'Idaho does not give a per-dependent allowance for 2026: its $205 child tax credit applied only to tax years beginning before 1 January 2026 and sunset by its own terms (Idaho Code 63-3029L).',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'The $205 child tax credit in Idaho Code 63-3029L applied to tax years beginning on or after 1 January 2018 and before 1 January 2026, so it does not apply to this tax year. The 2025 Parental Choice Tax Credit that followed it is for qualifying education expenses, not a per-dependent allowance, and is not modeled.',
      'Idaho taxes Idaho taxable income at 5.3% of the amount over an indexed zero band (2025 Form 40 packet tax worksheet; I.C. 63-3024). Single and married filing separately: 5.3% of taxable income over $4,811. Married filing jointly, head of household and qualifying surviving spouse: 5.3% over $9,622. Those 2025 worksheet amounts are the inflation-adjusted thresholds for 2025. 2026 Form 40 was not published at verification, so this row is the 2025 schedule — the 2025 threshold is not forwarded as if it were 2026.',
      'The standard deduction on the 2025 Form 40 worksheet is the 2025 federal amount: $15,750 single or married filing separately, $31,500 married filing jointly, $23,625 head of household. Those printed 2025 figures are stored here rather than reading the 2026 federal snapshot, which would mix years.',
      'Idaho credits, the grocery credit, itemized-deduction addbacks and other Form 39R adjustments are not modeled. The starting point is gross wages.',
    ],
  }],
  ['NE', {
    ...meta('NE', {
      sourceName: '2026 Form 1040N-ES, estimated income tax rate schedule and standard deduction',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    bracketsByFilingStatus: {
      single: brackets([[4_130, 0.0246], [24_760, 0.0351], [null, 0.0455]]),
      marriedFilingSeparately: brackets([[4_130, 0.0246], [24_760, 0.0351], [null, 0.0455]]),
      headOfHousehold: brackets([[7_700, 0.0246], [39_620, 0.0351], [null, 0.0455]]),
      marriedFilingJointly: brackets([[8_250, 0.0246], [49_530, 0.0351], [null, 0.0455]]),
    },
    standardDeductionByFilingStatus: filingAmounts(8_850, 17_700, 8_850, 12_950),
    exemptionCredit: {
      perFilerByFilingStatus: filingAmounts(176, 352, 176, 176),
      perDependent: 176,
    },
    notes: [
      'Nebraska taxes Nebraska taxable income at 2.46%, 3.51% and 4.55% for 2026 (2026 Form 1040N-ES rate schedule; Neb. Rev. Stat. § 77-2715.03(2)(c)(v) equalises the third and fourth brackets at 4.55%). Single and married filing separately share one schedule; head of household and joint have their own widths. 2026 Form 1040N was not published at verification; these are the Department of Revenue\'s 2026 estimated-tax rates.',
      'The 2026 Nebraska standard deduction is $8,850 single or married filing separately, $17,700 married filing jointly, $12,950 head of household. Additional amounts for age or blindness are not modeled.',
      'The personal exemption is a $176 credit per allowed exemption, not a deduction from income, so it is subtracted after tax. This model grants one exemption single, two filing jointly, and none for dependents unless they are supplied.',
      'Nebraska credits other than the personal exemption credit, and Nebraska adjustments to federal AGI, are not modeled. The starting point is gross wages.',
    ],
  }],
  ['GA', {
    ...meta('GA', {
      sourceName: '2026 Employer\'s Tax Guide (updated June 2026): 4.99% rate and standard deduction amounts',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    rate: 0.0499,
    standardDeductionByFilingStatus: filingAmounts(15_000, 30_000, 15_000, 15_000),
    exemptionByFilingStatus: filingAmounts(0, 0, 0, 0),
    perDependentExemption: 5_000,
    notes: [
      'Georgia taxes Georgia taxable income at a flat 4.99% for 2026 (Georgia Department of Revenue, 2026 Employer\'s Tax Guide, updated June 2026). The same guide states that the income tax rate fell from 5.19% to 4.99%. 2026 Form 500 was not published at verification.',
      'The 2026 standard deduction is $15,000 single, head of household or married filing separately, and $30,000 married filing jointly. There is no separate personal exemption for the filer. The dependent deduction is $5,000.',
      'Georgia credits and other Form 500 adjustments are not modeled. The starting point is gross wages.',
    ],
  }],
  ['AZ', {
    ...meta('AZ', {
      sourceName: 'A.R.S. 43-1011 (2.5% rate) and Arizona DOR 2025 Individual Income Tax Highlights (standard deduction)',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    rate: 0.025,
    standardDeductionByFilingStatus: filingAmounts(15_750, 31_500, 15_750, 23_625),
    exemptionByFilingStatus: filingAmounts(0, 0, 0, 0),
    exemptionCredit: {
      perFilerByFilingStatus: filingAmounts(0, 0, 0, 0),
      perDependent: 125,
      proportionalPhaseOut: {
        startIncomeByFilingStatus: filingAmounts(200_000, 400_000, 200_000, 200_000),
        incrementByFilingStatus: filingAmounts(1_000, 1_000, 1_000, 1_000),
        rateOfCreditPerIncrement: 0.05,
      },
    },
    dependentAllowanceStatus: {
      kind: 'assumption',
      reason: 'Arizona pays $125 for a dependent under 17 and $25 for an older one. This estimate has no age input and uses the higher figure for every dependent, so a filer whose dependents are grown is shown less tax than they owe.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'Arizona taxes Arizona taxable income at a flat 2.5% (A.R.S. 43-1011(A)(9); Arizona DOR 2025 Individual Income Tax Highlights). 2026 Form 140 was not published at verification.',
      'The 2025 standard deduction is $15,750 single or married filing separately, $31,500 married filing jointly, $23,625 head of household (DOR 2025 Highlights; A.R.S. 43-1041 inflation-adjusted). The extra standard-deduction increase for charitable contributions (34% for 2025) is not modeled.',
      'The dependent tax credit is modeled at $125 for each dependent, with 5% of it removed for each $1,000, or fraction thereof, of federal adjusted gross income above $200,000 single or $400,000 filing jointly, so it reaches zero at $220,000 and $420,000 (A.R.S. 43-1073.01 as amended by Laws 2026, Ch. 140 / HB 4168). A candidate $125 was first seen in PolicyEngine-US citing the bill; production cites the enacted session law.',
      'Arizona pays $125 only for a dependent under 17 and $25 for an older one. This estimate has no age input and applies the higher figure to every dependent, so it understates tax for a filer whose dependents are grown.',
      'Other Arizona credits and Form 140 adjustments are not modeled. The starting point is gross wages.',
    ],
  }],
  ['CT', {
    ...meta('CT', {
      sourceName: '2025 Form CT-1040 TCS, Tables A–E (personal exemption, initial tax, 2% phase-out add-back, recapture, personal tax credits)',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2025,
    bracketsByFilingStatus: {
      single: brackets([
        [10_000, 0.02], [50_000, 0.045], [100_000, 0.055], [200_000, 0.06],
        [250_000, 0.065], [500_000, 0.069], [null, 0.0699],
      ]),
      marriedFilingSeparately: brackets([
        [10_000, 0.02], [50_000, 0.045], [100_000, 0.055], [200_000, 0.06],
        [250_000, 0.065], [500_000, 0.069], [null, 0.0699],
      ]),
      marriedFilingJointly: brackets([
        [20_000, 0.02], [100_000, 0.045], [200_000, 0.055], [400_000, 0.06],
        [500_000, 0.065], [1_000_000, 0.069], [null, 0.0699],
      ]),
      headOfHousehold: brackets([
        [16_000, 0.02], [80_000, 0.045], [160_000, 0.055], [320_000, 0.06],
        [400_000, 0.065], [800_000, 0.069], [null, 0.0699],
      ]),
    },
    steppedPersonalExemption: {
      amountStepsByFilingStatus: {
        single: alabamaDeductionChart({
          firstBandNotOver: 30_000, stepWidth: 1_000, startAmount: 15_000, decrement: 1_000, floorAmount: 0,
        }),
        marriedFilingJointly: alabamaDeductionChart({
          firstBandNotOver: 48_000, stepWidth: 1_000, startAmount: 24_000, decrement: 1_000, floorAmount: 0,
        }),
        marriedFilingSeparately: alabamaDeductionChart({
          firstBandNotOver: 24_000, stepWidth: 1_000, startAmount: 12_000, decrement: 1_000, floorAmount: 0,
        }),
        headOfHousehold: alabamaDeductionChart({
          firstBandNotOver: 38_000, stepWidth: 1_000, startAmount: 19_000, decrement: 1_000, floorAmount: 0,
        }),
      },
      countByFilingStatus: filingAmounts(1, 1, 1, 1),
      includeDependents: false,
    },
    taxAddOnSteps: [
      {
        name: 'Connecticut 2% tax rate phase-out add-back',
        amountStepsByFilingStatus: {
          single: ctAddBack(56_500, 5_000, 25, 250),
          marriedFilingJointly: ctAddBack(100_500, 5_000, 50, 500),
          marriedFilingSeparately: ctAddBack(50_250, 2_500, 25, 250),
          headOfHousehold: ctAddBack(78_500, 4_000, 40, 400),
        },
      },
      {
        name: 'Connecticut tax recapture',
        amountStepsByFilingStatus: {
          single: CT_RECAPTURE_SINGLE,
          marriedFilingSeparately: CT_RECAPTURE_SINGLE,
          marriedFilingJointly: CT_RECAPTURE_JOINT,
          headOfHousehold: CT_RECAPTURE_HEAD,
        },
      },
    ],
    exemptionCredit: {
      perFilerByFilingStatus: filingAmounts(0, 0, 0, 0),
      perDependent: 0,
      rateStepsByFilingStatus: {
        single: CT_CREDIT_SINGLE,
        marriedFilingJointly: CT_CREDIT_JOINT,
        marriedFilingSeparately: CT_CREDIT_SEPARATE,
        headOfHousehold: CT_CREDIT_HEAD,
      },
    },
    dependentAllowanceStatus: {
      kind: 'none',
      reason: 'Connecticut does not give a per-dependent allowance: its personal exemption is one return-level amount looked up on adjusted gross income, with no addition for dependents.',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    },
    notes: [
      'Connecticut computes 2025 income tax from Connecticut AGI on Form CT-1040 TCS: a personal exemption (Table A), initial tax on taxable income (Table B), a 2% rate phase-out add-back (Table C), tax recapture (Table D), then a personal tax credit that is a percentage of that tax (Table E). 2026 CT-1040 was not published at verification. Table A is one amount for the return, looked up on filing status and Connecticut AGI; dependents do not multiply it.',
      'Table B rates are 2%, 4.5%, 5.5%, 6%, 6.5%, 6.9% and 6.99%. Single and married filing separately share one width; joint and head of household have their own. The TCS worked examples ($13,000 taxable → $335; $22,500 joint → $513; $20,000 head of household → $500) are the initial tax only, before add-backs and the credit.',
      'Table C and Table D are dollar staircases looked up on Connecticut AGI, not a single surcharge rate. Recapture begins above $105,000 single / $210,000 joint / $168,000 head of household and caps at $3,400 / $6,800 / $5,320.',
      'The personal tax credit is a published decimal of the tax itself, 75% at low AGI stepping to zero, not a dollar exemption. Connecticut has no standard deduction.',
      'The property tax credit, credit for taxes paid to other jurisdictions, and other CT-1040 adjustments are not modeled. The starting point is gross wages treated as Connecticut AGI.',
    ],
  }],
  ['IN', {
    ...meta('IN', {
      sourceName: 'SEA 451 (2025) amending IC 6-3-2-1 (2.95% for 2026) and DOR Information Bulletin #117 (personal exemptions)',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'flat',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    rate: 0.0295,
    exemptionByFilingStatus: filingAmounts(1_000, 2_000, 1_000, 1_000),
    perDependentExemption: 1_000,
    localAddOn: {
      label: 'Indiana county income tax',
      basis: 'county',
      appliesTo: 'taxable-income',
    },
    notes: [
      'Indiana taxes Indiana adjusted gross income at 2.95% for taxable years beginning after December 31, 2025 and before January 1, 2027 (SEA 451, amending IC 6-3-2-1). There is no Indiana standard deduction; the starting point for a wage-only filer is gross wages.',
      'The personal exemption is $1,000 for the filer and $1,000 for a spouse on a joint return (DOR Information Bulletin #117; IC 6-3-1-3.5). Each dependent is another $1,000. The extra $1,500 qualifying-child exemption, the $3,000 first-year and adopted-child exemptions, and the age/blind extras are not modeled.',
      'Indiana counties levy a local income tax that is not included. No single statewide rate is published, so the page names the omission without inventing its size. County rates are not stored in this engine.',
      'Indiana add-backs, Schedule 2 deductions and credits are not modeled.',
    ],
  }],
  ['NY', {
    ...meta('NY', {
      sourceName: '2026 Form IT-2105-I, New York State tax rates, standard deduction table, dependent exemption, and tax computation worksheets 1–16',
      verifiedAt: '2026-09-07T00:00:00.000Z',
    }),
    status: 'supported',
    kind: 'progressive',
    sourceStatus: 'verified',
    scheduleTaxYear: 2026,
    /*
     * IT-2105-I prints a rounded constant at each band floor ($332 at $8,500
     * single, $4,191 at $80,650). Those do not equal the running product of
     * the rates beneath them, and the worksheets look up the published figure.
     */
    bracketsByFilingStatus: {
      single: brackets3([
        [8_500, 0.039, undefined], [11_700, 0.044, 332], [13_900, 0.0515, 473], [80_650, 0.054, 586],
        [215_400, 0.059, 4_191], [1_077_550, 0.0685, 12_141], [5_000_000, 0.0965, 71_198],
        [25_000_000, 0.103, 449_714], [null, 0.109, 2_509_714],
      ]),
      marriedFilingSeparately: brackets3([
        [8_500, 0.039, undefined], [11_700, 0.044, 332], [13_900, 0.0515, 473], [80_650, 0.054, 586],
        [215_400, 0.059, 4_191], [1_077_550, 0.0685, 12_141], [5_000_000, 0.0965, 71_198],
        [25_000_000, 0.103, 449_714], [null, 0.109, 2_509_714],
      ]),
      marriedFilingJointly: brackets3([
        [17_150, 0.039, undefined], [23_600, 0.044, 669], [27_900, 0.0515, 953], [161_550, 0.054, 1_174],
        [323_200, 0.059, 8_391], [2_155_350, 0.0685, 17_928], [5_000_000, 0.0965, 143_430],
        [25_000_000, 0.103, 417_939], [null, 0.109, 2_477_939],
      ]),
      headOfHousehold: brackets3([
        [12_800, 0.039, undefined], [17_650, 0.044, 499], [20_900, 0.0515, 712], [107_650, 0.054, 879],
        [269_300, 0.059, 5_564], [1_616_450, 0.0685, 15_101], [5_000_000, 0.0965, 107_381],
        [25_000_000, 0.103, 433_894], [null, 0.109, 2_493_894],
      ]),
    },
    standardDeductionByFilingStatus: filingAmounts(8_000, 16_050, 8_000, 11_200),
    personalExemptionByFilingStatus: filingAmounts(0, 0, 0, 0),
    perDependentExemption: 1_000,
    nySupplementalTax: {
      minAgi: 107_650,
      phaseInLength: 50_000,
      topRateAgi: 25_000_000,
      topRate: 0.109,
      firstBandNotOverByFilingStatus: filingAmounts(215_400, 161_550, 215_400, 269_300),
      firstBandRateByFilingStatus: {
        single: 0.059,
        marriedFilingJointly: 0.054,
        marriedFilingSeparately: 0.059,
        headOfHousehold: 0.059,
      },
      recaptureStepsByFilingStatus: {
        single: [
          { notOver: 1_077_550, recaptureBase: 567, incrementalBenefit: 2_047, agiThreshold: 215_400 },
          { notOver: 5_000_000, recaptureBase: 2_614, incrementalBenefit: 30_172, agiThreshold: 1_077_550 },
          { notOver: null, recaptureBase: 32_786, incrementalBenefit: 32_500, agiThreshold: 5_000_000 },
        ],
        marriedFilingSeparately: [
          { notOver: 1_077_550, recaptureBase: 567, incrementalBenefit: 2_047, agiThreshold: 215_400 },
          { notOver: 5_000_000, recaptureBase: 2_614, incrementalBenefit: 30_172, agiThreshold: 1_077_550 },
          { notOver: null, recaptureBase: 32_786, incrementalBenefit: 32_500, agiThreshold: 5_000_000 },
        ],
        marriedFilingJointly: [
          { notOver: 323_200, recaptureBase: 333, incrementalBenefit: 807, agiThreshold: 161_550 },
          { notOver: 2_155_350, recaptureBase: 1_140, incrementalBenefit: 3_071, agiThreshold: 323_200 },
          { notOver: 5_000_000, recaptureBase: 4_211, incrementalBenefit: 60_350, agiThreshold: 2_155_350 },
          { notOver: null, recaptureBase: 64_561, incrementalBenefit: 32_500, agiThreshold: 5_000_000 },
        ],
        headOfHousehold: [
          { notOver: 1_616_450, recaptureBase: 787, incrementalBenefit: 2_559, agiThreshold: 269_300 },
          { notOver: 5_000_000, recaptureBase: 3_346, incrementalBenefit: 45_260, agiThreshold: 1_616_450 },
          { notOver: null, recaptureBase: 48_606, incrementalBenefit: 32_500, agiThreshold: 5_000_000 },
        ],
      },
    },
    localAddOn: {
      label: 'New York City resident income tax and Yonkers surcharge',
      basis: 'municipality',
      appliesTo: 'taxable-income',
      omissionNote: 'New York City residents pay a separate city income tax (2026 IT-2105-I NYC rate schedule, 3.078%–3.876%). Yonkers residents pay 16.75% of New York State tax. Location is unknown here, so neither is included — if you live in NYC or Yonkers, real take-home is lower.',
    },
    notes: [
      'New York taxes New York taxable income at 3.90% to 10.90% (2026 Form IT-2105-I, New York State tax rates). Chapter 59 of the Laws of 2025 reduced several middle rates from the 2025 IT-201 schedule; IT-2105-I is the department’s 2026 annual computation, not a withholding substitute.',
      'The 2026 standard deduction is $8,000 single or married filing separately, $16,050 married filing jointly or qualifying surviving spouse, and $11,200 head of household. There is no personal exemption for the taxpayer or spouse; each dependent is a $1,000 exemption.',
      'When NYAGI exceeds $107,650 the tax computation worksheets recapture the benefit of the lower brackets, and above $25 million the tax is 10.90% of taxable income. Those worksheets are modeled.',
      'The New York household credit (a small stepped credit below $28,000 / $32,000 of federal AGI), itemized deductions and their high-income limitation, and New York additions and subtractions from federal AGI are not modeled. The starting point for a wage-only filer is gross wages treated as NYAGI.',
      'New York City resident tax and the Yonkers 16.75% surcharge of state tax are named as omitted local tax. The MCTMT applies to self-employment in the MCTD and is not a wage tax here.',
    ],
  }],
];

const supported = new Map<StateCode, StateTaxPolicy>(supportedEntries);

function buildStates(): StateTaxPolicy[] {
  return STATE_CODES.map((stateCode) => {
    const policy = supported.get(stateCode);
    if (policy) return policy;
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
      selfEmploymentNetEarningsFactor: 0.9235,
      selfEmploymentMinimumNetEarnings: 400,
      selfEmploymentSourceName: '2026 Schedule SE (Form 1040) draft and 2026 Instructions for Schedule SE (Form 1040)',
      selfEmploymentSourceUrl: 'https://www.irs.gov/pub/irs-dft/f1040sse--dft.pdf',
      selfEmploymentInstructionsUrl: 'https://www.irs.gov/pub/irs-dft/i1040sse--dft.pdf',
      selfEmploymentPublishedAt: '2026-08-05T00:00:00.000Z',
    },
    federalCredits: {
      taxYear: TAX_YEAR,
      provider: 'Internal Revenue Service' as const,
      sourceName: 'Revenue Procedure 2025-32',
      sourceUrl: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf',
      publishedAt: '2025-10-09T00:00:00.000Z',
      verifiedAt: CREDITS_VERIFIED_AT,
      sourceStatus: 'verified' as const,
      version: VERSION,
      childTaxCredit: {
        maxPerQualifyingChild: 2_200,
        otherDependentCredit: 500,
        refundablePerQualifyingChild: 1_700,
        phaseOutThresholdMarriedFilingJointly: 400_000,
        phaseOutThresholdOtherStatuses: 200_000,
        phaseOutRate: 0.05,
        phaseOutRoundUpTo: 1_000,
        additionalChildTaxCreditEarnedIncomeFloor: 2_500,
        additionalChildTaxCreditEarnedIncomeRate: 0.15,
        schedule8812SourceUrl: 'https://www.irs.gov/pub/irs-dft/f1040s8--dft.pdf',
      },
      earnedIncomeCredit: {
        investmentIncomeLimit: 12_200,
        byQualifyingChildren: {
          one: {
            earnedIncomeAmount: 13_020,
            maximumCredit: 4_427,
            thresholdPhaseoutMarriedFilingJointly: 31_160,
            completedPhaseoutMarriedFilingJointly: 58_863,
            thresholdPhaseoutOtherStatuses: 23_890,
            completedPhaseoutOtherStatuses: 51_593,
          },
          two: {
            earnedIncomeAmount: 18_290,
            maximumCredit: 7_316,
            thresholdPhaseoutMarriedFilingJointly: 31_160,
            completedPhaseoutMarriedFilingJointly: 65_899,
            thresholdPhaseoutOtherStatuses: 23_890,
            completedPhaseoutOtherStatuses: 58_629,
          },
          threeOrMore: {
            earnedIncomeAmount: 18_290,
            maximumCredit: 8_231,
            thresholdPhaseoutMarriedFilingJointly: 31_160,
            completedPhaseoutMarriedFilingJointly: 70_244,
            thresholdPhaseoutOtherStatuses: 23_890,
            completedPhaseoutOtherStatuses: 62_974,
          },
          none: {
            earnedIncomeAmount: 8_680,
            maximumCredit: 664,
            thresholdPhaseoutMarriedFilingJointly: 18_140,
            completedPhaseoutMarriedFilingJointly: 26_820,
            thresholdPhaseoutOtherStatuses: 10_860,
            completedPhaseoutOtherStatuses: 19_540,
          },
        },
      },
      longTermCapitalGains: {
        zeroRate: 0,
        fifteenRate: 0.15,
        twentyRate: 0.20,
        zeroRateMaxByFilingStatus: filingAmounts(49_450, 98_900, 49_450, 66_200),
        fifteenRateMaxByFilingStatus: filingAmounts(545_500, 613_700, 306_850, 579_600),
      },
      netInvestmentIncomeTax: {
        rate: 0.038,
        thresholdByFilingStatus: filingAmounts(200_000, 250_000, 125_000, 200_000),
        sourceName: 'IRS Questions and Answers on the Net Investment Income Tax',
        sourceUrl: 'https://www.irs.gov/newsroom/questions-and-answers-on-the-net-investment-income-tax',
      },
      notes: [
        'Rev. Proc. 2025-32 §4.05: 2026 child tax credit maximum $2,200; refundable portion used in §24(d)(1)(A) is $1,700.',
        'Rev. Proc. 2025-32 §4.06: 2026 EITC earned-income amounts, maximum credits, phase-out thresholds and completed amounts, and the $12,200 investment-income limit under §32(i).',
        'Rev. Proc. 2025-32 §4.03: 2026 maximum zero rate and maximum 15% rate amounts under §1(j)(5)(B). Amounts above the 15% ceiling are taxed at 20%. Estates and trusts are not modelled.',
        '2026 Schedule 8812 (Form 1040) draft: other dependent credit $500; MAGI phase-out $400,000 married filing jointly / $200,000 other statuses, rounded up to the next $1,000, times 5%; additional child tax credit earned-income floor $2,500 times 15%. Created 4/24/26. Marked DRAFT—NOT FOR FILING.',
        'NIIT is 3.8% of the lesser of net investment income or MAGI over $200,000 single / $250,000 joint / $125,000 married filing separately / $200,000 head of household. Thresholds are statutory under IRC 1411 and are not inflation-indexed.',
      ],
    },
    estimatedTax: {
      taxYear: TAX_YEAR,
      provider: 'Internal Revenue Service' as const,
      sourceName: '2026 Form 1040-ES, Estimated Tax for Individuals',
      sourceUrl: 'https://www.irs.gov/pub/irs-pdf/f1040es.pdf',
      publishedAt: '2026-02-12T00:00:00.000Z',
      verifiedAt: CREDITS_VERIFIED_AT,
      sourceStatus: 'verified' as const,
      version: VERSION,
      minimumTaxToOwe: 1_000,
      currentYearSafeHarborRate: 0.90,
      priorYearSafeHarborRate: 1.00,
      highIncomePriorYearSafeHarborRate: 1.10,
      highIncomePriorYearAgi: 150_000,
      highIncomePriorYearAgiMarriedFilingSeparately: 75_000,
      installmentCount: 4,
      dueDates: [
        { installment: 1, dueOn: '2026-04-15' },
        { installment: 2, dueOn: '2026-06-15' },
        { installment: 3, dueOn: '2026-09-15' },
        { installment: 4, dueOn: '2027-01-15' },
      ],
      notes: [
        'Form 1040-ES (2026) Catalog Number 11340T, February 12, 2026. Calendar-year due dates: April 15, June 15, September 15, 2026, and January 15, 2027.',
        'You must pay estimated tax if you expect to owe at least $1,000 after withholding and refundable credits, and withholding plus refundable credits will be less than the smaller of 90% of 2026 tax or 100% of 2025 tax (110% if 2025 AGI was more than $150,000, or $75,000 if married filing separately for 2026).',
        'The January 15, 2027 payment is not required if the 2026 return is filed by February 1, 2027 and the entire balance is paid with the return.',
        'Farming and fishing (substitute 66⅔% for 90%), household employment taxes, the annualized income installment method, and the Form 2210 underpayment penalty amount are not modelled.',
      ],
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
