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
import type { StateCode } from '@/lib/location/states';
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
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'PA', filingStatus: 'single', taxableIncome: 100_000 }).tax).toBe(3_070);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'PA', filingStatus: 'single', taxableIncome: 0 }).tax).toBe(0);
  });

  it('applies the 2026 Massachusetts 5% wage tax and 4% surtax over $1,107,750', () => {
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'MA', filingStatus: 'single', taxableIncome: 80_000 }).tax).toBe(4_000);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'MA', filingStatus: 'single', taxableIncome: 2_000_000 }).tax).toBe(2_000_000 * 0.05 + (2_000_000 - 1_107_750) * 0.04);
  });

  it('uses official 2025 FTB Schedule X amounts for California', () => {
    const atFirstBound = calculateStateIncomeTax({ taxYear: 2026, state: 'CA', filingStatus: 'single', taxableIncome: 11_079 + 5_706 });
    expect(atFirstBound.tax).toBeCloseTo(110.79, 10);
    const high = calculateStateIncomeTax({ taxYear: 2026, state: 'CA', filingStatus: 'single', taxableIncome: 0 });
    expect(high.tax).toBe(0);
  });

  it('uses 2025 New Jersey Table A at the $20,000 single bound', () => {
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'NJ', filingStatus: 'single', taxableIncome: 20_000 }).tax).toBe(280);
    expect(calculateStateIncomeTax({ taxYear: 2026, state: 'NJ', filingStatus: 'single', taxableIncome: 100_000 }).tax).toBe(2_651.25 + 25_000 * 0.0637);
  });

  it('omits unsupported states instead of inventing a rate', () => {
    const ny = calculateStateIncomeTax({ taxYear: 2026, state: 'NY', filingStatus: 'single', taxableIncome: 100_000 });
    expect(ny.status).toBe('unsupported');
    expect(ny.tax).toBe(0);
    expect(ny.reason).toMatch(/IT-201/i);

    /*
     * Read the example out of the snapshot rather than naming a state.
     * Transcription work keeps promoting states to supported, and a hard-coded
     * name turns that progress into a test failure that says nothing useful.
     */
    const stillMissing = getTaxYearSnapshot(2026).states.find((row) => row.status === 'unsupported' && row.stateCode !== 'NY');
    expect(stillMissing).toBeDefined();
    const omitted = calculateStateIncomeTax({
      taxYear: 2026,
      state: stillMissing!.stateCode as StateCode,
      filingStatus: 'single',
      taxableIncome: 90_000,
    });
    expect(omitted.status).toBe('unsupported');
    expect(omitted.tax).toBe(0);
    expect(omitted.reason).toBeTruthy();
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

  it('marks New York as federal-only', () => {
    const result = calculateSalaryAfterTax({ annualGrossSalary: 120_000, state: 'NY', filingStatus: 'single', taxYear: 2026 });
    expect(result.value.stateTaxStatus).toBe('unsupported');
    expect(result.value.stateIncomeTax).toBe(0);
    expect(result.assumptions.some((line) => /omitted/i.test(line))).toBe(true);
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
    expect(nyPaycheck.value.stateTaxStatus).toBe('unsupported');
    expect(nyPaycheck.value.stateTax).toBe(0);
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

  it('says so instead of silently dropping an unmodelled state', () => {
    const modelled = calculateBonusTax({
      bonusAmount: 10_000, priorSupplementalWagesThisYear: 0, regularWagesToDate: 60_000,
      state: 'CA', filingStatus: 'single',
    }).value;
    expect(modelled.stateTaxStatus).toBe('supported');
    expect(modelled.stateWithholding).toBeGreaterThan(0);

    const notModelled = calculateBonusTax({
      bonusAmount: 10_000, priorSupplementalWagesThisYear: 0, regularWagesToDate: 60_000,
      state: 'NY', filingStatus: 'single',
    }).value;
    expect(notModelled.stateTaxStatus).toBe('unsupported');
    expect(notModelled.stateWithholding).toBe(0);
    expect(notModelled.stateNote).toMatch(/not modeled/i);
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
