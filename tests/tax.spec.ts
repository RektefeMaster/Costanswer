import { round } from '@/lib/calculations/contracts';
import { calculateProgressiveTax } from '@/lib/calculations/tax/brackets';
import { calculateFederalIncomeTax } from '@/lib/calculations/tax/federal';
import { calculateFica } from '@/lib/calculations/tax/fica';
import { calculateStateIncomeTax } from '@/lib/calculations/tax/state';
import { calculateSalaryAfterTax, estimateAnnualTaxLiability } from '@/lib/calculations/salary-after-tax';
import { calculatePaycheck } from '@/lib/calculations/paycheck';
import { calculateHourlySalary } from '@/lib/calculations/hourly-salary';
import { PAYCHECK_ENGINE_ID, SALARY_AFTER_TAX_ENGINE_ID } from '@/lib/calculations/tax/version';
import { getTaxYearSnapshot, taxSnapshot } from '@/lib/data/tax/snapshot';
import { calculateBonusTax } from '@/lib/calculations/tax/bonus';
import { validateTaxYearSnapshot } from '@/lib/data/verify';
import { taxYearSnapshotSchema } from '@/lib/data/tax/schema';
import type { TaxBracket } from '@/lib/calculations/tax/types';
import { describe, expect, it } from 'vitest';

/** IRS Rev. Proc. 2025-32, tax year 2026, single taxable-income schedule. */
const IRS_2026_SINGLE: TaxBracket[] = [
  { notOver: 12_400, rate: 0.10 },
  { notOver: 50_400, rate: 0.12 },
  { notOver: 105_700, rate: 0.22 },
  { notOver: 201_775, rate: 0.24 },
  { notOver: 256_225, rate: 0.32 },
  { notOver: 640_600, rate: 0.35 },
  { notOver: null, rate: 0.37 },
];

const snapshot = getTaxYearSnapshot(2026);

describe('progressive bracket primitive', () => {
  it('returns zero at or below zero taxable income', () => {
    expect(calculateProgressiveTax(0, IRS_2026_SINGLE)).toBe(0);
    expect(calculateProgressiveTax(-1, IRS_2026_SINGLE)).toBe(0);
  });

  it('matches IRS cumulative tax exactly at each 2026 single threshold', () => {
    expect(calculateProgressiveTax(12_400, IRS_2026_SINGLE)).toBe(1_240);
    expect(calculateProgressiveTax(50_400, IRS_2026_SINGLE)).toBe(5_800);
    expect(calculateProgressiveTax(105_700, IRS_2026_SINGLE)).toBe(17_966);
    expect(calculateProgressiveTax(201_775, IRS_2026_SINGLE)).toBe(41_024);
    expect(calculateProgressiveTax(256_225, IRS_2026_SINGLE)).toBe(58_448);
    expect(calculateProgressiveTax(640_600, IRS_2026_SINGLE)).toBe(192_979.25);
  });

  it('adds $1 of the next rate just above a threshold', () => {
    expect(calculateProgressiveTax(12_401, IRS_2026_SINGLE)).toBe(1_240 + 0.12);
  });

  it('taxes a large income through the top 37% bracket', () => {
    expect(calculateProgressiveTax(1_000_000, IRS_2026_SINGLE)).toBe(192_979.25 + (1_000_000 - 640_600) * 0.37);
  });
});

describe('federal income tax 2026', () => {
  it('keeps the bundled snapshot on the IRS 2026 single brackets and standard deduction', () => {
    expect(snapshot.federal.standardDeductionByFilingStatus.single).toBe(16_100);
    expect(snapshot.federal.standardDeductionByFilingStatus.marriedFilingJointly).toBe(32_200);
    expect(snapshot.federal.standardDeductionByFilingStatus.headOfHousehold).toBe(24_150);
    expect(snapshot.federal.bracketsByFilingStatus.single).toEqual(IRS_2026_SINGLE);
  });

  it('uses the standard deduction before the IRS single schedule', () => {
    const result = calculateFederalIncomeTax({
      taxYear: 2026,
      filingStatus: 'single',
      grossIncome: 12_400 + 16_100,
      federal: snapshot.federal,
    });
    expect(result.taxableIncome).toBe(12_400);
    expect(result.tax).toBe(1_240);
  });

  it('matches independent MFJ math at the 12% threshold', () => {
    const result = calculateFederalIncomeTax({
      taxYear: 2026,
      filingStatus: 'marriedFilingJointly',
      grossIncome: 100_800 + 32_200,
      federal: snapshot.federal,
    });
    expect(result.taxableIncome).toBe(100_800);
    expect(result.tax).toBe(11_600);
  });

  it('matches independent head-of-household math at the 10% threshold', () => {
    const result = calculateFederalIncomeTax({
      taxYear: 2026,
      filingStatus: 'headOfHousehold',
      grossIncome: 17_700 + 24_150,
      federal: snapshot.federal,
    });
    expect(result.tax).toBe(1_770);
  });

  it('uses the MFS 35% cap of $384,350 from RP 2025-32', () => {
    const result = calculateFederalIncomeTax({
      taxYear: 2026,
      filingStatus: 'marriedFilingSeparately',
      grossIncome: 384_350 + 16_100,
      federal: snapshot.federal,
    });
    expect(result.taxableIncome).toBe(384_350);
    expect(result.tax).toBe(103_291.75);
  });

  it('returns zero tax on zero income', () => {
    expect(calculateFederalIncomeTax({
      taxYear: 2026,
      filingStatus: 'single',
      grossIncome: 0,
      federal: snapshot.federal,
    }).tax).toBe(0);
  });
});

describe('FICA 2026', () => {
  it('uses the SSA 2026 wage base and statutory employee rates', () => {
    expect(snapshot.fica.socialSecurityWageBase).toBe(184_500);
    expect(snapshot.fica.socialSecurityRate).toBe(0.062);
    expect(snapshot.fica.medicareRate).toBe(0.0145);
  });

  it('charges Social Security below, at, and above the wage base', () => {
    const below = calculateFica({ taxYear: 2026, filingStatus: 'single', grossIncome: 50_000, fica: snapshot.fica });
    expect(below.socialSecurity).toBe(3_100);
    const atBase = calculateFica({ taxYear: 2026, filingStatus: 'single', grossIncome: 184_500, fica: snapshot.fica });
    expect(atBase.socialSecurity).toBe(11_439);
    const above = calculateFica({ taxYear: 2026, filingStatus: 'single', grossIncome: 200_000, fica: snapshot.fica });
    expect(above.socialSecurity).toBe(11_439);
  });

  it('charges Medicare on all wages and Additional Medicare only above the filing-status threshold', () => {
    const atSingleThreshold = calculateFica({ taxYear: 2026, filingStatus: 'single', grossIncome: 200_000, fica: snapshot.fica });
    expect(atSingleThreshold.medicare).toBe(2_900);
    expect(atSingleThreshold.additionalMedicare).toBe(0);
    const overSingle = calculateFica({ taxYear: 2026, filingStatus: 'single', grossIncome: 250_000, fica: snapshot.fica });
    expect(overSingle.additionalMedicare).toBeCloseTo(450, 6);
    const jointAtThreshold = calculateFica({ taxYear: 2026, filingStatus: 'marriedFilingJointly', grossIncome: 250_000, fica: snapshot.fica });
    expect(jointAtThreshold.additionalMedicare).toBe(0);
    const separate = calculateFica({ taxYear: 2026, filingStatus: 'marriedFilingSeparately', grossIncome: 125_001, fica: snapshot.fica });
    expect(separate.additionalMedicare).toBeCloseTo(0.009, 10);
  });
});

describe('state income tax', () => {
  it('returns exactly $0 for no-income-tax states, including zero and high income', () => {
    for (const state of ['TX', 'FL', 'WA', 'NV', 'AK', 'SD', 'TN', 'WY', 'NH'] as const) {
      expect(calculateStateIncomeTax({ taxYear: 2026, state, filingStatus: 'single', taxableIncome: 0 }).tax).toBe(0);
      expect(calculateStateIncomeTax({ taxYear: 2026, state, filingStatus: 'single', taxableIncome: 250_000 }).tax).toBe(0);
      expect(calculateStateIncomeTax({ taxYear: 2026, state, filingStatus: 'single', taxableIncome: 250_000 }).status).toBe('supported');
    }
  });

  it('applies the 2026 Illinois 4.95% rate after the $2,925 personal exemption', () => {
    const low = calculateStateIncomeTax({ taxYear: 2026, state: 'IL', filingStatus: 'single', taxableIncome: 20_000 });
    expect(low.tax).toBe((20_000 - 2_925) * 0.0495);
    const joint = calculateStateIncomeTax({ taxYear: 2026, state: 'IL', filingStatus: 'marriedFilingJointly', taxableIncome: 80_000 });
    expect(joint.tax).toBe((80_000 - 5_850) * 0.0495);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'IL', filingStatus: 'single', taxableIncome: 0 }).tax).toBe(0);
  });

  it('applies Pennsylvania’s statutory 3.07% flat compensation tax', () => {
    const pa = calculateStateIncomeTax({ taxYear: 2026, state: 'PA', filingStatus: 'single', taxableIncome: 100_000 });
    expect(pa.tax).toBe(3_070);
    expect(pa.omittedLocalTax?.typicalRateRange).toEqual({ low: 0.01, high: 0.03735 });
    expect(pa.omittedLocalTax?.omissionNote).toMatch(/3\.735%/);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'PA', filingStatus: 'single', taxableIncome: 0 }).tax).toBe(0);
  });

  it('forgives Pennsylvania tax on the Schedule SP staircase, including the last 10% column', () => {
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'PA', filingStatus: 'single', taxableIncome: 6_500,
    }).tax).toBe(0);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'PA', filingStatus: 'single', taxableIncome: 16_000, dependents: 1,
    }).tax).toBe(0);
    // Table 1, 10% column: $8,750 unmarried, $18,250 with one child.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'PA', filingStatus: 'single', taxableIncome: 8_750,
    }).tax).toBeCloseTo(8_750 * 0.0307 * 0.9, 10);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'PA', filingStatus: 'single', taxableIncome: 8_751,
    }).tax).toBeCloseTo(8_751 * 0.0307, 10);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'PA', filingStatus: 'single', taxableIncome: 18_250, dependents: 1,
    }).tax).toBeCloseTo(18_250 * 0.0307 * 0.9, 10);
  });

  it('applies the 2026 Massachusetts 5% wage tax after the exemption and FICA cap, and the 4% surtax over $1,107,750', () => {
    const snapshot = getTaxYearSnapshot(2026);
    const fica80k = calculateFica({
      taxYear: 2026, filingStatus: 'single', grossIncome: 80_000, fica: snapshot.fica,
    });
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'MA', filingStatus: 'single', taxableIncome: 80_000,
      employeeFica: fica80k.socialSecurity + fica80k.medicare + fica80k.additionalMedicare,
    }).tax).toBe((80_000 - 2_000 - 4_400) * 0.05);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'MA', filingStatus: 'single', taxableIncome: 80_000, dependents: 1,
      employeeFica: fica80k.socialSecurity + fica80k.medicare + fica80k.additionalMedicare,
    }).tax).toBe((80_000 - 2_000 - 5_400) * 0.05);
    const fica2m = calculateFica({
      taxYear: 2026, filingStatus: 'single', grossIncome: 2_000_000, fica: snapshot.fica,
    });
    const taxable = 2_000_000 - 2_000 - 4_400;
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'MA', filingStatus: 'single', taxableIncome: 2_000_000,
      employeeFica: fica2m.socialSecurity + fica2m.medicare + fica2m.additionalMedicare,
    }).tax).toBe(taxable * 0.05 + (taxable - 1_107_750) * 0.04);
    expect(() => calculateStateIncomeTax({
      taxYear: 2026, state: 'MA', filingStatus: 'single', taxableIncome: 80_000,
    })).toThrow(/employeeFica/);
  });

  it('uses official 2025 FTB Schedule X amounts for California', () => {
    const atFirstBound = calculateStateIncomeTax({ taxYear: 2026, state: 'CA', filingStatus: 'single', taxableIncome: 11_079 + 5_706 });
    // Schedule X charges 1% to $11,079, which is Form 540 line 31.
    expect(atFirstBound.taxBeforeCredits).toBeCloseTo(110.79, 10);
    // The $153 exemption credit is more than that, and it is not refundable,
    // so line 33 is zero rather than a refund of the difference.
    expect(atFirstBound.exemptionCredit).toBeCloseTo(110.79, 10);
    expect(atFirstBound.tax).toBe(0);
    const high = calculateStateIncomeTax({ taxYear: 2026, state: 'CA', filingStatus: 'single', taxableIncome: 0 });
    expect(high.tax).toBe(0);
  });

  it('uses 2025 New Jersey Table A after the regular exemption, and charges nothing at the filing threshold', () => {
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'NJ', filingStatus: 'single', taxableIncome: 10_000 }).tax).toBe(0);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'NJ', filingStatus: 'single', taxableIncome: 20_000 }).tax).toBe(266);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'NJ', filingStatus: 'single', taxableIncome: 100_000 }).tax).toBe(2_651.25 + 24_000 * 0.0637);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'NJ', filingStatus: 'single', taxableIncome: 60_000, dependents: 1,
    }).tax).toBe(1_684.375);
  });

  it('names Wilmington as Delaware’s only local wage tax rather than claiming the state has none', () => {
    const de = calculateStateIncomeTax({ taxYear: 2026, state: 'DE', filingStatus: 'single', taxableIncome: 50_000 });
    expect(de.omittedLocalTax?.label).toMatch(/Wilmington/i);
    expect(de.omittedLocalTax?.omissionNote).toMatch(/1\.25%/);
  });

  it('uses North Carolina’s 2026 3.99% rate with the G.S. 105-153.5 standard deduction', () => {
    const nc = calculateStateIncomeTax({ taxYear: 2026, state: 'NC', filingStatus: 'single', taxableIncome: 60_000 });
    expect(nc.scheduleTaxYear).toBe(2026);
    expect(nc.tax).toBeCloseTo((60_000 - 12_750) * 0.0399, 2);
  });

  it('reduces Minnesota’s standard deduction above the 2026 limitation thresholds, never by more than 80%', () => {
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'MN', filingStatus: 'single', taxableIncome: 150_000 }).tax)
      .toBeCloseTo(8_941.94, 2);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'MN', filingStatus: 'single', taxableIncome: 250_000 }).tax)
      .toBeCloseTo(17_439.488, 2);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'MN', filingStatus: 'single', taxableIncome: 1_200_000 }).tax)
      .toBeCloseTo(112_203.58, 2);
  });

  it('uses Ohio’s 2026 H.B. 96 flat 2.75% schedule and the $500,000 MAGI exemption cutoff', () => {
    const base = { taxYear: 2026, state: 'OH' as const, filingStatus: 'single' as const };
    expect(calculateStateIncomeTax({ ...base, taxableIncome: 70_200 }).scheduleTaxYear).toBe(2026);
    expect(calculateStateIncomeTax({ ...base, taxableIncome: 70_200 }).tax).toBeCloseTo(1_487, 2);
    expect(calculateStateIncomeTax({ ...base, taxableIncome: 28_450 }).tax).toBe(0);
    expect(calculateStateIncomeTax({ ...base, taxableIncome: 28_451 }).tax).toBeCloseTo(332.0275, 4);
    expect(calculateStateIncomeTax({ ...base, taxableIncome: 500_000 }).tax)
      .toBeCloseTo(13_365.625, 2);
    expect(calculateStateIncomeTax({ ...base, taxableIncome: 499_999 }).tax)
      .toBeLessThan(calculateStateIncomeTax({ ...base, taxableIncome: 500_000 }).tax);
  });

  it('computes New York from the 2026 IT-2105-I schedules, including recapture', () => {
    const ny = calculateStateIncomeTax({ taxYear: 2026, state: 'NY', filingStatus: 'single', taxableIncome: 100_000 });
    expect(ny.status).toBe('supported');
    expect(ny.scheduleTaxYear).toBe(2026);
    expect(ny.tax).toBeCloseTo(4_860.65, 2);
    expect(ny.omittedLocalTax?.label).toMatch(/New York City|Yonkers/i);

    const recapture = calculateStateIncomeTax({ taxYear: 2026, state: 'NY', filingStatus: 'single', taxableIncome: 150_000 });
    expect(recapture.tax).toBeCloseTo(8_291.20, 2);

    // Worksheet 8: taxable income above $215,400, recapture base $567 + fraction of $2,047.
    const secondBand = calculateStateIncomeTax({ taxYear: 2026, state: 'NY', filingStatus: 'single', taxableIncome: 250_000 });
    const secondTi = 250_000 - 8_000;
    const secondMain = 12_141 + (secondTi - 215_400) * 0.0685;
    const secondFraction = Math.round(((250_000 - 215_400) / 50_000) * 10_000) / 10_000;
    expect(secondBand.tax).toBeCloseTo(secondMain + 567 + secondFraction * 2_047, 4);

    const justUnderRecapture = calculateStateIncomeTax({ taxYear: 2026, state: 'NY', filingStatus: 'single', taxableIncome: 107_650 });
    const justOverRecapture = calculateStateIncomeTax({ taxYear: 2026, state: 'NY', filingStatus: 'single', taxableIncome: 107_651 });
    expect(justOverRecapture.tax).toBeGreaterThan(justUnderRecapture.tax);

    const withDependent = calculateStateIncomeTax({
      taxYear: 2026, state: 'NY', filingStatus: 'single', taxableIncome: 100_000, dependents: 2,
    });
    expect(withDependent.tax).toBeLessThan(
      calculateStateIncomeTax({ taxYear: 2026, state: 'NY', filingStatus: 'single', taxableIncome: 100_000 }).tax,
    );

    const mfs = calculateStateIncomeTax({ taxYear: 2026, state: 'NY', filingStatus: 'marriedFilingSeparately', taxableIncome: 100_000 });
    expect(mfs.tax).toBeCloseTo(4_860.65, 2);

    const top = calculateStateIncomeTax({ taxYear: 2026, state: 'NY', filingStatus: 'single', taxableIncome: 26_000_000 });
    expect(top.tax).toBeCloseTo((26_000_000 - 8_000) * 0.109, 2);

    const unsupported = getTaxYearSnapshot(2026).states.filter((row) => row.status === 'unsupported');
    expect(unsupported).toEqual([]);
  });

  it('uses Hawaii’s 2026 Act 46 standard deduction with the 2025 N-11 brackets', () => {
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'HI', filingStatus: 'single', taxableIncome: 9_144 }).tax).toBe(0);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'HI', filingStatus: 'single', taxableIncome: 33_144 }).tax)
      .toBeCloseTo(859.2, 4);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'HI', filingStatus: 'single', taxableIncome: 134_144 }).tax)
      .toBe(8_391);
  });

  it('uses Montana’s 2026 Publication 1 ordinary-income rates', () => {
    const mt = calculateStateIncomeTax({
      taxYear: 2026, state: 'MT', filingStatus: 'single', taxableIncome: 66_100, federalStandardDeduction: 16_100,
    });
    expect(mt.scheduleTaxYear).toBe(2026);
    expect(mt.tax).toBeCloseTo(2_373.75, 2);
  });

  it('uses Oklahoma’s 2026 68 O.S. 2355(D) rates, including the 0% first band', () => {
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'OK', filingStatus: 'single', taxableIncome: 11_100 }).tax).toBe(0);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'OK', filingStatus: 'single', taxableIncome: 22_125 }).tax)
      .toBeCloseTo(450.125, 3);
  });

  it('taxes Colorado on federal taxable income, not on gross wages', () => {
    // The 2025 DR 0104 table gives $1,014 for Colorado taxable income in the
    // $23,000-$23,100 band; $39,150 of wages less the $16,100 federal standard
    // deduction lands at $23,050.
    const co = calculateStateIncomeTax({
      taxYear: 2026, state: 'CO', filingStatus: 'single', taxableIncome: 39_150, federalStandardDeduction: 16_100,
    });
    expect(co.status).toBe('supported');
    expect(co.tax).toBeCloseTo(1_014.20, 2);

    // Without the federal figure the answer would silently tax the standard
    // deduction a second time, so the engine refuses instead.
    expect(() => calculateStateIncomeTax({
      taxYear: 2026, state: 'CO', filingStatus: 'single', taxableIncome: 39_150,
    })).toThrow(/federalStandardDeduction/);

    // Above $300,000 AGI Colorado adds back federal standard deduction over $12,000.
    const addBack = calculateStateIncomeTax({
      taxYear: 2026, state: 'CO', filingStatus: 'single', taxableIncome: 350_000, federalStandardDeduction: 16_100,
    });
    expect(addBack.tax).toBeCloseTo(14_872, 2);
    const justUnder = calculateStateIncomeTax({
      taxYear: 2026, state: 'CO', filingStatus: 'single', taxableIncome: 300_000, federalStandardDeduction: 16_100,
    });
    expect(justUnder.tax).toBeCloseTo((300_000 - 16_100) * 0.044, 2);
  });

  it('looks Colorado’s child tax credit up on federal AGI, not on Colorado taxable income', () => {
    // $40,000 of wages is in the $600 band. Federal taxable income is $23,900,
    // which would have been the $1,200 band and taken the tax to zero.
    const mid = calculateStateIncomeTax({
      taxYear: 2026, state: 'CO', filingStatus: 'single', taxableIncome: 40_000,
      federalStandardDeduction: 16_100, dependents: 1,
    });
    expect(mid.tax).toBeCloseTo((40_000 - 16_100) * 0.044 - 600, 10);
    const low = calculateStateIncomeTax({
      taxYear: 2026, state: 'CO', filingStatus: 'single', taxableIncome: 21_250,
      federalStandardDeduction: 16_100, dependents: 1,
    });
    expect(low.tax).toBe(0);
  });

  it('credits Kentucky tax on the family-size poverty staircase, including the last 10% band', () => {
    const before = (wages: number) => Math.max(0, wages - 3_360) * 0.035;
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'KY', filingStatus: 'single', taxableIncome: 15_960,
    }).tax).toBe(0);
    // $21,000 / $15,960 is 131.6% — 10% credit. A uniform 4% step would be 20%.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'KY', filingStatus: 'single', taxableIncome: 21_000,
    }).tax).toBeCloseTo(before(21_000) * 0.90, 10);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'KY', filingStatus: 'single', taxableIncome: 25_000, dependents: 2,
    }).tax).toBe(0);
  });

  it('phases the District child tax credit out of the total, not off each child', () => {
    const one = calculateStateIncomeTax({
      taxYear: 2026, state: 'DC', filingStatus: 'single', taxableIncome: 75_000, dependents: 1,
    });
    const three = calculateStateIncomeTax({
      taxYear: 2026, state: 'DC', filingStatus: 'single', taxableIncome: 75_000, dependents: 3,
    });
    // $75,000 is $20,000 over $55,000 → $1,000 off the credit as a whole.
    expect(one.tax).toBeCloseTo(3_500, 10);
    expect(three.tax).toBeCloseTo(1_500, 10);
  });

  it('gives Mississippi its zero band and charges nothing at the state filing threshold', () => {
    // MS DOR publishes the filing threshold as $8,300 single, which is exactly
    // the $2,300 standard deduction plus the $6,000 exemption.
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'MS', filingStatus: 'single', taxableIncome: 8_300 }).tax).toBe(0);
    // $60,000 less $8,300 is $51,700; the first $10,000 is free and the rest is at 4%.
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'MS', filingStatus: 'single', taxableIncome: 60_000 }).tax)
      .toBeCloseTo(41_700 * 0.04, 2);
  });

  it('phases out the Utah taxpayer credit and never turns it into a refund', () => {
    const base = { taxYear: 2026, state: 'UT' as const, filingStatus: 'single' as const, federalStandardDeduction: 16_100 };
    // 6% of the federal standard deduction, less 1.3% of income over $18,213.
    expect(calculateStateIncomeTax({ ...base, taxableIncome: 90_000 }).tax).toBeCloseTo(4_017.23, 2);
    // Below the phase-out base the credit is larger than the tax, and Utah's
    // TC-40 line 22 says enter zero rather than pay the difference out.
    expect(calculateStateIncomeTax({ ...base, taxableIncome: 20_000 }).tax).toBe(0);
  });

  it('gives New Mexico the 2025 brackets and phases the low-income exemption on AGI', () => {
    // 7-2-7 prints $2,716.50 of tax at $66,500 of taxable income, single.
    // $82,250 of wages less the 2025 federal standard deduction of $15,750
    // lands exactly there, with the exemption already gone.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'NM', filingStatus: 'single', taxableIncome: 82_250,
    }).tax).toBeCloseTo(2_716.50, 2);
    // $30,000 of AGI is inside the exemption phase-out: $2,500 less 15¢ on
    // each of the $10,000 over $20,000 leaves $1,000, so taxable income is
    // $13,250 and tax is $82.50 + 3.2% of $7,750.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'NM', filingStatus: 'single', taxableIncome: 30_000,
    }).tax).toBeCloseTo(330.50, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'NM', filingStatus: 'single', taxableIncome: 15_750,
    }).tax).toBe(0);
    // PIT packet table: $25,300–$25,400 MFJ is $679.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'NM', filingStatus: 'marriedFilingJointly', taxableIncome: 56_850,
    }).tax).toBeCloseTo(679, 0);
  });

  it('reproduces Vermont\'s published joint example and Rhode Island\'s tax table', () => {
    // IN-111 works $85,000 of Vermont taxable income, married filing jointly,
    // to $2,929. $110,900 of wages less the deduction and two exemptions lands
    // there.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'VT', filingStatus: 'marriedFilingJointly', taxableIncome: 110_900,
    }).tax).toBeCloseTo(2_929, 2);
    // IN-111 table: $50,000–$50,100 of Vermont taxable income, single, is $1,698.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'VT', filingStatus: 'single', taxableIncome: 63_000,
    }).tax).toBeCloseTo(1_698, 0);
    // RI-1040 example: $25,300–$25,350 of taxable income is $950 of tax.
    // $41,325 of wages less the $10,900 deduction and $5,100 exemption is the
    // $25,325 midpoint of that row.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'RI', filingStatus: 'single', taxableIncome: 41_325,
    }).tax).toBeCloseTo(950, 0);
    // Table row $50,000–$50,050 prints $1,876.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'RI', filingStatus: 'single', taxableIncome: 66_025,
    }).tax).toBeCloseTo(1_876, 0);
  });

  it('uses Michigan’s 2026 $5,900 exemption and Louisiana’s 2026 withholding deduction', () => {
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'MI', filingStatus: 'single', taxableIncome: 60_000,
    }).tax).toBeCloseTo(2_299.25, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'LA', filingStatus: 'single', taxableIncome: 60_000,
    }).tax).toBeCloseTo(1_413.75, 2);
  });

  it('reproduces Missouri\'s published tax-chart examples and Alabama\'s Brown table row', () => {
    // MO-1040 worksheet example A: $3,090 of Missouri taxable income → $38.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'MO', filingStatus: 'single', taxableIncome: 18_840, federalIncomeTax: 0,
    }).tax).toBeCloseTo(38, 0);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'MO', filingStatus: 'single', taxableIncome: 27_750, federalIncomeTax: 0,
    }).tax).toBeCloseTo(388, 0);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'MO', filingStatus: 'marriedFilingJointly', taxableIncome: 120_000, federalIncomeTax: 0,
    }).tax).toBeCloseTo(3_984, 0);
    // Line 12 example 1: $22,450 of Missouri AGI takes 35% of a $2,000 federal tax.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'MO', filingStatus: 'single', taxableIncome: 22_450, federalIncomeTax: 2_000,
    }).federalTaxDeducted).toBe(700);

    // Form 40A Brown example: $23,360 of taxable income, married filing jointly, is $1,088.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'AL', filingStatus: 'marriedFilingJointly', taxableIncome: 40_000, federalIncomeTax: 8_640,
    }).tax).toBeCloseTo(1_088, 0);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'AL', filingStatus: 'single', taxableIncome: 40_000, federalIncomeTax: 12_640,
    }).tax).toBeCloseTo(1_128, 0);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'AL', filingStatus: 'headOfHousehold', taxableIncome: 40_000, federalIncomeTax: 11_140,
    }).tax).toBeCloseTo(1_128, 0);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'AL', filingStatus: 'marriedFilingSeparately', taxableIncome: 13_500, federalIncomeTax: 0,
    }).tax).toBeCloseTo(360.70, 2);
  });

  it('reproduces Kansas tax-table rows and Virginia\'s published $90,000 example', () => {
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'KS', filingStatus: 'single', taxableIncome: 72_740,
    }).tax).toBeCloseTo(3_259, 0);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'KS', filingStatus: 'marriedFilingJointly', taxableIncome: 86_535,
    }).tax).toBeCloseTo(3_172, 0);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'KS', filingStatus: 'headOfHousehold', taxableIncome: 40_000,
    }).tax).toBeCloseTo(1_161.68, 2);

    // Form 760: $90,000 of Virginia taxable income → $4,917.50, printed as $4,918.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'VA', filingStatus: 'single', taxableIncome: 99_680,
    }).tax).toBeCloseTo(4_917.50, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'VA', filingStatus: 'single', taxableIncome: 11_949,
    }).tax).toBe(0);
  });

  it('reproduces Wisconsin two-stage head-of-household deduction and Idaho, Nebraska, Georgia and Arizona official floors', () => {
    // Form 1-ES: $15,110 of Wisconsin taxable income is $528.85.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'WI', filingStatus: 'single', taxableIncome: 28_736.07,
    }).tax).toBeCloseTo(528.85, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'WI', filingStatus: 'marriedFilingJointly', taxableIncome: 44_360.18,
    }).tax).toBeCloseTo(705.25, 1);
    // HOH at the top of the $18,030 band, not the single $13,960 band.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'WI', filingStatus: 'headOfHousehold', taxableIncome: 20_119,
    }).tax).toBeCloseTo(48.615, 2);
    // Inside the 22.515% stage, head of household keeps a larger deduction.
    const hohMid = calculateStateIncomeTax({
      taxYear: 2026, state: 'WI', filingStatus: 'headOfHousehold', taxableIncome: 40_000,
    }).tax;
    const singleMid = calculateStateIncomeTax({
      taxYear: 2026, state: 'WI', filingStatus: 'single', taxableIncome: 40_000,
    }).tax;
    expect(hohMid).toBeLessThan(singleMid);
    // Second stage reuses the single 12% formula, so the two statuses meet.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'WI', filingStatus: 'headOfHousehold', taxableIncome: 80_000,
    }).tax).toBeCloseTo(3_240.32, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'WI', filingStatus: 'single', taxableIncome: 80_000,
    }).tax).toBeCloseTo(3_240.32, 2);

    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'ID', filingStatus: 'single', taxableIncome: 20_561,
    }).tax).toBe(0);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'ID', filingStatus: 'single', taxableIncome: 30_561,
    }).tax).toBeCloseTo(530, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'ID', filingStatus: 'headOfHousehold', taxableIncome: 33_247,
    }).tax).toBe(0);

    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'NE', filingStatus: 'single', taxableIncome: 33_610,
    }).tax).toBeCloseTo(649.71, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'GA', filingStatus: 'single', taxableIncome: 50_000,
    }).tax).toBeCloseTo(1_746.50, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'GA', filingStatus: 'marriedFilingJointly', taxableIncome: 50_000,
    }).tax).toBeCloseTo(998, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'AZ', filingStatus: 'single', taxableIncome: 40_000,
    }).tax).toBeCloseTo(606.25, 2);

    // Connecticut: $13,000 taxable is $335 on Table B; at $28,000 AGI the
    // 15% personal credit leaves $284.75. Recapture is $0 at $105,000 and $25
    // the next dollar.
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'CT', filingStatus: 'single', taxableIncome: 28_000,
    }).tax).toBeCloseTo(284.75, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'CT', filingStatus: 'single', taxableIncome: 105_000,
    }).tax).toBe(5_300);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'CT', filingStatus: 'single', taxableIncome: 105_001,
    }).tax).toBeCloseTo(5_325.06, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'CT', filingStatus: 'marriedFilingJointly', taxableIncome: 46_500,
    }).tax).toBeCloseTo(435.63, 2);

    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'CT', filingStatus: 'single', taxableIncome: 28_000, dependents: 2,
    }).tax).toBeCloseTo(284.75, 2);

    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'IL', filingStatus: 'single', taxableIncome: 60_000, dependents: 1,
    }).tax).toBeCloseTo(2_680.425, 3);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'MI', filingStatus: 'single', taxableIncome: 60_000, dependents: 1,
    }).tax).toBeCloseTo(2_048.50, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'OH', filingStatus: 'single', taxableIncome: 40_000, dependents: 1,
    }).tax).toBeCloseTo(583.625, 3);

    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'IN', filingStatus: 'single', taxableIncome: 101_000,
    }).tax).toBeCloseTo(2_950, 2);
    expect(calculateStateIncomeTax({
      taxYear: 2026, state: 'IN', filingStatus: 'single', taxableIncome: 1_000,
    }).tax).toBe(0);
  });

  it('refuses to invent a federal figure the state calculation depends on', () => {
    expect(() => calculateStateIncomeTax({
      taxYear: 2026, state: 'MO', filingStatus: 'single', taxableIncome: 40_000,
    })).toThrow(/federalIncomeTax/);
  });
});

describe('salary after tax', () => {
  it('matches independent $100,000 single Texas math', () => {
    const result = calculateSalaryAfterTax({
      annualGrossSalary: 100_000,
      state: 'TX',
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(result.calculationVersion).toBe(SALARY_AFTER_TAX_ENGINE_ID);
    expect(result.value.federalIncomeTax).toBe(13_170);
    expect(result.value.socialSecurity).toBe(6_200);
    expect(result.value.medicare).toBe(1_450);
    expect(result.value.stateIncomeTax).toBe(0);
    expect(result.value.totalTax).toBe(20_820);
    expect(result.value.annualTakeHome).toBe(79_180);
    expect(result.value.stateTaxStatus).toBe('supported');
    expect(result.datasetSnapshotIds).toEqual(['us-tax-2026-v1']);
    expect(result.assumptions.some((line) => line.includes('tax year 2026'))).toBe(true);
    expect(result.assumptions.some((line) => /standard deduction/i.test(line))).toBe(true);
    expect(result.assumptions.some((line) => /credits/i.test(line))).toBe(true);
  });

  it('computes Massachusetts take-home after the exemption and FICA cap, and lowers it for a dependent', () => {
    const none = calculateSalaryAfterTax({ annualGrossSalary: 80_000, state: 'MA', filingStatus: 'single', taxYear: 2026 });
    const one = calculateSalaryAfterTax({
      annualGrossSalary: 80_000, state: 'MA', filingStatus: 'single', taxYear: 2026, dependents: 1,
    });
    expect(none.value.stateIncomeTax).toBe((80_000 - 2_000 - 4_400) * 0.05);
    expect(one.value.stateIncomeTax).toBe((80_000 - 2_000 - 5_400) * 0.05);
  });

  it('does not multiply Connecticut Table A by dependents, and does apply Illinois and Michigan dependent exemptions', () => {
    const ctNone = calculateSalaryAfterTax({ annualGrossSalary: 28_000, state: 'CT', filingStatus: 'single', taxYear: 2026 });
    const ctTwo = calculateSalaryAfterTax({
      annualGrossSalary: 28_000, state: 'CT', filingStatus: 'single', taxYear: 2026, dependents: 2,
    });
    expect(ctTwo.value.stateIncomeTax).toBe(ctNone.value.stateIncomeTax);

    const ilNone = calculateSalaryAfterTax({ annualGrossSalary: 60_000, state: 'IL', filingStatus: 'single', taxYear: 2026 });
    const ilOne = calculateSalaryAfterTax({
      annualGrossSalary: 60_000, state: 'IL', filingStatus: 'single', taxYear: 2026, dependents: 1,
    });
    expect(ilNone.value.stateIncomeTax).toBeCloseTo(2_825.21, 2);
    expect(ilOne.value.stateIncomeTax).toBeCloseTo(2_680.43, 2);
  });

  it('does not tell a Delaware reader there is no local income tax', () => {
    const de = calculateSalaryAfterTax({ annualGrossSalary: 80_000, state: 'DE', filingStatus: 'single', taxYear: 2026 });
    expect(de.assumptions.some((line) => /Wilmington/i.test(line))).toBe(true);
    expect(de.assumptions.some((line) => /no local income tax/i.test(line))).toBe(false);
  });

  it('changes with filing status and progressive state tax', () => {
    const singleCa = calculateSalaryAfterTax({ annualGrossSalary: 100_000, state: 'CA', filingStatus: 'single', taxYear: 2026 });
    const jointCa = calculateSalaryAfterTax({ annualGrossSalary: 100_000, state: 'CA', filingStatus: 'marriedFilingJointly', taxYear: 2026 });
    const texas = calculateSalaryAfterTax({ annualGrossSalary: 100_000, state: 'TX', filingStatus: 'single', taxYear: 2026 });
    expect(singleCa.value.stateIncomeTax).toBeGreaterThan(0);
    expect(jointCa.value.federalIncomeTax).toBeLessThan(singleCa.value.federalIncomeTax);
    expect(singleCa.value.totalTax).toBeGreaterThan(texas.value.totalTax);
  });

  it('returns zero tax on zero income and still estimates high incomes', () => {
    const zero = calculateSalaryAfterTax({ annualGrossSalary: 0, state: 'IL', filingStatus: 'single', taxYear: 2026 });
    expect(zero.value.totalTax).toBe(0);
    expect(zero.value.annualTakeHome).toBe(0);
    const high = calculateSalaryAfterTax({ annualGrossSalary: 1_000_000, state: 'TX', filingStatus: 'single', taxYear: 2026 });
    expect(high.value.federalIncomeTax).toBe(320_000.25);
    expect(high.value.socialSecurity).toBe(11_439);
  });

  it('computes New York state tax from the 2026 estimated-tax schedules', () => {
    const result = calculateSalaryAfterTax({ annualGrossSalary: 120_000, state: 'NY', filingStatus: 'single', taxYear: 2026 });
    expect(result.value.stateTaxStatus).toBe('supported');
    expect(result.value.stateIncomeTax).toBeGreaterThan(0);
    expect(result.assumptions.some((line) => /Schedule year 2026/i.test(line))).toBe(true);
  });
});

describe('paycheck', () => {
  it('splits the same annual liability across documented pay frequencies', () => {
    const annual = calculateSalaryAfterTax({ annualGrossSalary: 104_000, state: 'TX', filingStatus: 'single', taxYear: 2026 });
    const monthly = calculatePaycheck({ payFrequency: 'monthly', amount: 104_000 / 12, state: 'TX', filingStatus: 'single', taxYear: 2026 });
    const semi = calculatePaycheck({ payFrequency: 'semimonthly', amount: 104_000 / 24, state: 'TX', filingStatus: 'single', taxYear: 2026 });
    const biweekly = calculatePaycheck({ payFrequency: 'biweekly', amount: 104_000 / 26, state: 'TX', filingStatus: 'single', taxYear: 2026 });
    const weekly = calculatePaycheck({ payFrequency: 'weekly', amount: 104_000 / 52, state: 'TX', filingStatus: 'single', taxYear: 2026 });
    expect(monthly.calculationVersion).toBe(PAYCHECK_ENGINE_ID);
    expect(monthly.value.netPaycheck * 12).toBeCloseTo(annual.value.annualTakeHome, 0);
    expect(semi.value.netPaycheck * 24).toBeCloseTo(annual.value.annualTakeHome, 0);
    expect(biweekly.value.netPaycheck * 26).toBeCloseTo(annual.value.annualTakeHome, 0);
    expect(weekly.value.netPaycheck * 52).toBeCloseTo(annual.value.annualTakeHome, 0);
    expect(monthly.assumptions[0]).toMatch(/not employer payroll withholding/i);
  });

  it('reuses hourly-to-salary gross pay', () => {
    const hourlyGross = calculateHourlySalary({
      hourlyRate: 28,
      regularHoursPerWeek: 40,
      overtimeHoursPerWeek: 0,
      overtimeMultiplier: 1.5,
      weeksPerYear: 52,
    });
    const paycheck = calculatePaycheck({
      payFrequency: 'hourly',
      hourlyRate: 28,
      hoursPerWeek: 40,
      weeksPerYear: 52,
      state: 'TX',
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(paycheck.value.annualGross).toBe(hourlyGross.value.annual);
    expect(paycheck.value.grossPaycheck).toBe(hourlyGross.value.weekly);

    const overtimePaycheck = calculatePaycheck({
      payFrequency: 'hourly',
      hourlyRate: 28,
      hoursPerWeek: 45,
      weeksPerYear: 52,
      state: 'TX',
      filingStatus: 'single',
      taxYear: 2026,
    });
    // 40h * $28 = $1,120; 5h * ($28 * 1.5) = $210 -> $1,330/week -> $69,160/year
    expect(overtimePaycheck.value.grossPaycheck).toBe(1330);
    expect(overtimePaycheck.value.annualGross).toBe(69160);

    const nyPaycheck = calculatePaycheck({
      payFrequency: 'monthly',
      amount: 10_000,
      state: 'NY',
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(nyPaycheck.value.stateTaxStatus).toBe('supported');
    expect(nyPaycheck.value.stateTax).toBeGreaterThan(0);
  });
});

describe('bonus withholding', () => {
  it('applies the IRS flat supplemental rate and splits at the yearly threshold', () => {
    const { supplemental, fica } = taxSnapshot;
    // Pub. 15 section 7: a separately paid bonus may be withheld at a flat 22%.
    const simple = calculateBonusTax({
      bonusAmount: 10_000, priorSupplementalWagesThisYear: 0, regularWagesToDate: 60_000,
      state: 'TX', filingStatus: 'single',
    }).value;
    expect(simple.federalWithholding).toBe(round(10_000 * supplemental.optionalFlatRate));
    expect(simple.socialSecurity).toBe(round(10_000 * fica.socialSecurityRate));
    expect(simple.medicare).toBe(round(10_000 * fica.medicareRate));
    expect(simple.crossesMandatoryThreshold).toBe(false);
    expect(simple.takeHome).toBe(round(10_000 - simple.totalWithheld));

    // Only the part above the yearly threshold takes the mandatory rate, and
    // bonuses paid earlier in the same year count towards it.
    const crossing = calculateBonusTax({
      bonusAmount: 500_000, priorSupplementalWagesThisYear: 800_000, regularWagesToDate: 300_000,
      state: 'TX', filingStatus: 'single',
    }).value;
    expect(crossing.amountAtOptionalRate).toBe(200_000);
    expect(crossing.amountAtMandatoryRate).toBe(300_000);
    expect(crossing.federalWithholding).toBe(round(
      200_000 * supplemental.optionalFlatRate + 300_000 * supplemental.mandatoryFlatRate,
    ));
    expect(crossing.crossesMandatoryThreshold).toBe(true);
  });

  it('continues FICA from wages already paid rather than flat-rating it', () => {
    const { fica } = taxSnapshot;
    // Past the Social Security wage base there is nothing left to withhold,
    // while Medicare has no cap and the additional Medicare tax has started.
    const capped = calculateBonusTax({
      bonusAmount: 10_000, priorSupplementalWagesThisYear: 0, regularWagesToDate: 250_000,
      state: 'TX', filingStatus: 'single',
    }).value;
    expect(capped.socialSecurity).toBe(0);
    expect(capped.socialSecurityCapped).toBe(true);
    expect(capped.additionalMedicare).toBe(round(10_000 * fica.additionalMedicareRate));

    // Straddling the wage base only charges the room that was left.
    const straddling = calculateBonusTax({
      bonusAmount: 10_000, priorSupplementalWagesThisYear: 0,
      regularWagesToDate: fica.socialSecurityWageBase - 4_000,
      state: 'TX', filingStatus: 'single',
    }).value;
    expect(straddling.socialSecurity).toBe(round(4_000 * fica.socialSecurityRate));
  });

  it('applies New York state withholding now that the 2026 schedule is modeled', () => {
    const modelled = calculateBonusTax({
      bonusAmount: 10_000, priorSupplementalWagesThisYear: 0, regularWagesToDate: 60_000,
      state: 'CA', filingStatus: 'single',
    }).value;
    expect(modelled.stateTaxStatus).toBe('supported');
    expect(modelled.stateWithholding).toBeGreaterThan(0);

    const ny = calculateBonusTax({
      bonusAmount: 10_000, priorSupplementalWagesThisYear: 0, regularWagesToDate: 60_000,
      state: 'NY', filingStatus: 'single',
    }).value;
    expect(ny.stateTaxStatus).toBe('supported');
    expect(ny.stateWithholding).toBeGreaterThan(0);
  });

  it('cites the tax snapshot and calls the result withholding, not tax', () => {
    const result = calculateBonusTax({
      bonusAmount: 5_000, priorSupplementalWagesThisYear: 0, regularWagesToDate: 60_000,
      state: 'TX', filingStatus: 'single',
    });
    expect(result.datasetSnapshotIds).toEqual([taxSnapshot.snapshotId]);
    expect(result.calculationVersion).toBe('bonus-tax-v1.0.0');
    expect(result.assumptions.join(' ')).toMatch(/withholding, not tax/i);
    expect(result.assumptions.join(' ')).toMatch(/Publication 15/);
  });
});

describe('tax dataset validation', () => {
  it('rejects decreasing brackets', () => {
    const broken = structuredClone(snapshot);
    broken.federal.bracketsByFilingStatus.single[1].notOver = 1_000;
    expect(() => taxYearSnapshotSchema.parse(broken)).toThrow();
  });

  it('fails closed when the hash is wrong', () => {
    const stale = structuredClone(snapshot);
    stale.federal.standardDeductionByFilingStatus.single = 1;
    expect(() => validateTaxYearSnapshot(stale)).toThrow(/SHA-256/);
  });

  it('does not invent tax for a year that is not published', () => {
    expect(() => estimateAnnualTaxLiability({
      annualGrossSalary: 50_000,
      state: 'TX',
      filingStatus: 'single',
      taxYear: 2027,
    })).toThrow(/2027/);
  });
});
