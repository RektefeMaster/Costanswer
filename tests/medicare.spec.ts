import { describe, expect, it } from 'vitest';
import snapshotJson from '@/data/medicare/2026.json';
import { MEDICARE_ENGINE_ID, calculateMedicareCost } from '@/lib/calculations/medicare';
import { medicareIrmaaBracketFor, medicareSnapshot, medicareSnapshotSchema } from '@/lib/data/medicare';
import { validateMedicareSnapshot } from '@/lib/data/verify';

const base = {
  coverageYear: 2026 as const,
  filingStatus: 'single' as const,
  annualMagi: 60_000,
  partAQuarters: '40-or-more' as const,
};

describe('2026 Medicare published rates', () => {
  it('carries the CMS figures exactly as printed', () => {
    expect(medicareSnapshot.coverageYear).toBe(2026);
    // 2026 premiums are set from the 2024 return, two years back.
    expect(medicareSnapshot.irmaaIncomeTaxYear).toBe(2024);
    expect(medicareSnapshot.partB.standardMonthlyPremium).toBe(202.9);
    expect(medicareSnapshot.partB.annualDeductible).toBe(283);
    expect(medicareSnapshot.partA).toMatchObject({
      inpatientDeductiblePerBenefitPeriod: 1_736,
      coinsuranceDays61To90: 434,
      coinsuranceLifetimeReserveDay: 868,
      skilledNursingCoinsuranceDays21To100: 217,
      monthlyPremium30To39Quarters: 311,
      monthlyPremiumUnder30Quarters: 565,
    });
    expect(medicareSnapshot.irmaaBrackets.single.map((entry) => entry.threshold))
      .toEqual([null, 109_000, 137_000, 171_000, 205_000, 500_000]);
    expect(medicareSnapshot.irmaaBrackets['married-joint'].map((entry) => entry.threshold))
      .toEqual([null, 218_000, 274_000, 342_000, 410_000, 750_000]);
    // Married filing separately skips the middle rungs entirely.
    expect(medicareSnapshot.irmaaBrackets['married-separate'].map((entry) => entry.threshold))
      .toEqual([null, 109_000, 391_000]);
    expect(medicareSnapshot.irmaaBrackets.single.map((entry) => entry.partBMonthlyAdjustment))
      .toEqual([0, 81.2, 202.9, 324.6, 446.3, 487]);
    expect(medicareSnapshot.irmaaBrackets.single.map((entry) => entry.partDMonthlyAdjustment))
      .toEqual([0, 14.5, 37.5, 60.4, 83.3, 91]);
  });

  it('fails the build on an edited digit the schema alone would accept', () => {
    expect(() => validateMedicareSnapshot(snapshotJson)).not.toThrow();
    // $209.20 is a perfectly ordinary premium; only the hash knows it is wrong.
    const mistyped = structuredClone(snapshotJson);
    mistyped.partB.standardMonthlyPremium = 209.2;
    expect(() => medicareSnapshotSchema.parse(mistyped)).not.toThrow();
    expect(() => validateMedicareSnapshot(mistyped)).toThrow(/integrity check/);
    // An out-of-order ladder is caught earlier, by the schema.
    const disordered = structuredClone(snapshotJson);
    disordered.irmaaBrackets.single[3].partBMonthlyAdjustment = 10;
    expect(() => medicareSnapshotSchema.parse(disordered)).toThrow(/never fall in adjustment/);
  });
});

describe('Medicare premium cost', () => {
  it('charges the standard premium below the first threshold', () => {
    const result = calculateMedicareCost(base);
    expect(result.value.irmaaApplies).toBe(false);
    expect(result.value.partAMonthlyPremium).toBe(0);
    expect(result.value.partBMonthlyPremium).toBe(202.9);
    expect(result.value.partBIrmaa).toBe(0);
    expect(result.value.monthlyTotal).toBe(202.9);
    expect(result.value.annualPremiumTotal).toBeCloseTo(2_434.8, 2);
    expect(result.value.nextIrmaaThreshold).toBe(109_000);
    expect(result.value.distanceToNextThreshold).toBe(49_000);
    expect(result.calculationVersion).toBe(MEDICARE_ENGINE_ID);
    expect(result.datasetSnapshotIds).toEqual([medicareSnapshot.snapshotId]);
  });

  it('applies the whole step one dollar over a threshold, not a taper', () => {
    const under = calculateMedicareCost({ ...base, annualMagi: 109_000 });
    const over = calculateMedicareCost({ ...base, annualMagi: 109_001 });
    // "More than $109,000": at exactly the threshold the standard premium stands.
    expect(under.value.irmaaApplies).toBe(false);
    expect(under.value.partBMonthlyPremium).toBe(202.9);
    expect(over.value.irmaaApplies).toBe(true);
    expect(over.value.partBIrmaa).toBe(81.2);
    expect(over.value.partBMonthlyPremium).toBeCloseTo(284.1, 2);
    // One dollar of income costs (81.20 + 14.50) x 12 for the year when a drug plan is enrolled.
    expect(calculateMedicareCost({ ...base, annualMagi: 109_000, hasDrugCoverage: true }).value.annualCostOfNextThreshold)
      .toBeCloseTo((81.2 + 14.5) * 12, 2);
    // Without a drug plan the Part D step is not in the total they would pay.
    expect(calculateMedicareCost({ ...base, annualMagi: 109_000 }).value.annualCostOfNextThreshold)
      .toBeCloseTo(81.2 * 12, 2);
  });

  it('reads the top rung as at-or-above, unlike every rung below it', () => {
    // CMS prints ">= $500,000" for the top bracket and "more than" for the rest.
    const at = calculateMedicareCost({ ...base, annualMagi: 500_000, hasDrugCoverage: true });
    expect(at.value.irmaaBracketIndex).toBe(5);
    expect(at.value.partBIrmaa).toBe(487);
    expect(at.value.partDIrmaa).toBe(91);
    expect(at.value.nextIrmaaThreshold).toBeNull();
    expect(at.value.nextIrmaaThresholdIsInclusive).toBeNull();
    expect(at.value.annualCostOfNextThreshold).toBeNull();
    const justUnder = calculateMedicareCost({ ...base, annualMagi: 499_999, hasDrugCoverage: true });
    expect(justUnder.value.irmaaBracketIndex).toBe(4);
    expect(justUnder.value.partBIrmaa).toBe(446.3);
    expect(justUnder.value.nextIrmaaThreshold).toBe(500_000);
    expect(justUnder.value.nextIrmaaThresholdIsInclusive).toBe(true);
    expect(calculateMedicareCost(base).assumptions[0]).toMatch(/starts above/);
  });

  it('uses a different ladder for each filing status', () => {
    const magi = 250_000;
    expect(calculateMedicareCost({ ...base, annualMagi: magi }).value.partBIrmaa).toBe(446.3);
    expect(calculateMedicareCost({ ...base, filingStatus: 'married-joint', annualMagi: magi }).value.partBIrmaa).toBe(81.2);
    // Filing separately jumps straight from nothing to the second-highest rung.
    const separate = calculateMedicareCost({ ...base, filingStatus: 'married-separate', annualMagi: magi });
    expect(separate.value.partBIrmaa).toBe(446.3);
    expect(separate.value.irmaaBracketIndex).toBe(1);
    expect(calculateMedicareCost({ ...base, filingStatus: 'married-separate', annualMagi: 391_000 }).value.partBIrmaa).toBe(487);
  });

  it('prices Part A by quarters of Medicare-taxed work', () => {
    expect(calculateMedicareCost({ ...base, partAQuarters: '30-to-39' }).value.partAMonthlyPremium).toBe(311);
    expect(calculateMedicareCost({ ...base, partAQuarters: 'under-30' }).value.partAMonthlyPremium).toBe(565);
    expect(calculateMedicareCost({ ...base, partAQuarters: 'under-30' }).value.monthlyTotal).toBeCloseTo(565 + 202.9, 2);
  });

  it('adds a drug-plan adjustment to the plan premium rather than replacing it', () => {
    const result = calculateMedicareCost({
      ...base, annualMagi: 150_000, monthlyDrugPlanPremium: 40, monthlyMedigapPremium: 180,
    });
    expect(result.value.hasDrugCoverage).toBe(true);
    expect(result.value.partDIrmaa).toBe(37.5);
    expect(result.value.drugPlanMonthlyTotal).toBeCloseTo(77.5, 2);
    expect(result.value.medigapMonthlyPremium).toBe(180);
    expect(result.value.monthlyTotal).toBeCloseTo(405.8 + 77.5 + 180, 2);
    expect(result.assumptions.join(' ')).toContain('paid separately');
  });

  it('does not charge Part D IRMAA when there is no drug plan, even at a high income', () => {
    const none = calculateMedicareCost({ ...base, annualMagi: 150_000 });
    expect(none.value.hasDrugCoverage).toBe(false);
    expect(none.value.partBMonthlyPremium).toBeCloseTo(405.8, 2);
    expect(none.value.partDIrmaa).toBe(37.5);
    expect(none.value.drugPlanMonthlyTotal).toBe(0);
    expect(none.value.monthlyTotal).toBeCloseTo(405.8, 2);
    expect(none.assumptions.join(' ')).toContain('not in the total');

    // A $0-premium plan is still enrolled coverage and still owes the adjustment.
    const zeroPremium = calculateMedicareCost({ ...base, annualMagi: 150_000, monthlyDrugPlanPremium: 0, hasDrugCoverage: true });
    expect(zeroPremium.value.drugPlanMonthlyTotal).toBe(37.5);
    expect(zeroPremium.value.monthlyTotal).toBeCloseTo(405.8 + 37.5, 2);
  });

  it('totals a partial year of premiums without prorating a deductible', () => {
    const partial = calculateMedicareCost({ ...base, coverageMonths: 5 });
    expect(partial.value.coveragePeriodTotal).toBeCloseTo(202.9 * 5, 2);
    expect(partial.value.annualPremiumTotal).toBeCloseTo(202.9 * 12, 2);
    // Deductibles are per year or per benefit period and do not shrink with it.
    expect(partial.value.partBDeductible).toBe(283);
    expect(partial.value.partADeductible).toBe(1_736);
  });

  it('rejects inputs that would silently become free coverage', () => {
    for (const magi of [null, true, '', [], undefined, NaN, Infinity, -1]) {
      expect(() => calculateMedicareCost({ ...base, annualMagi: magi })).toThrow();
    }
    expect(() => calculateMedicareCost({ ...base, coverageYear: 2025 })).toThrow();
    expect(() => calculateMedicareCost({ ...base, filingStatus: 'head-of-household' })).toThrow();
    expect(() => calculateMedicareCost({ ...base, partAQuarters: '20' })).toThrow();
    expect(() => calculateMedicareCost({ ...base, coverageMonths: 0 })).toThrow();
    expect(() => calculateMedicareCost({ ...base, monthlyDrugPlanPremium: -1 })).toThrow();
  });

  it('keeps the disclosures a premium estimate needs', () => {
    const text = calculateMedicareCost(base).assumptions.join(' ');
    expect(text).toContain('2024 return');
    expect(text).toContain('cliff, not a taper');
    expect(text).toContain('SSA-44');
    expect(text).toContain('per benefit period, not per year');
    expect(text).toContain('remaining 20% has no cap');
  });

  it('finds the bracket directly, for any income on any ladder', () => {
    expect(medicareIrmaaBracketFor(0, 'single').index).toBe(0);
    expect(medicareIrmaaBracketFor(137_000, 'single').index).toBe(1);
    expect(medicareIrmaaBracketFor(137_000.01, 'single').index).toBe(2);
    expect(medicareIrmaaBracketFor(10_000_000, 'married-joint').index).toBe(5);
    expect(medicareIrmaaBracketFor(50_000, 'married-separate').index).toBe(0);
  });
});
