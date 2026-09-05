import { describe, expect, it } from 'vitest';
import snapshotJson from '@/data/aca-subsidy/2026.json';
import { ACA_SUBSIDY_VERSION, calculateAcaSubsidy } from '@/lib/calculations/aca-subsidy';
import { acaSubsidySnapshot, acaSubsidySnapshotSchema } from '@/lib/data/aca-subsidy';
import { validateAcaSubsidySnapshot } from '@/lib/data/verify';

const base = {
  coverageYear: 2026 as const,
  stateCode: 'TX',
  householdSize: 1,
  annualHouseholdMagi: 30_000,
  monthlyBenchmarkPremium: 500,
  monthlyPlanPremium: 450,
  eligibility: 'assumed-eligible' as const,
};

/**
 * The applicable percentage is interpolated inside a band, so the arithmetic is
 * spelled out here rather than re-imported from the engine. A test that calls
 * the same helper it is checking only proves the helper is self-consistent.
 */
function expectedContribution(magi: number, guideline: number): number {
  const percentFpl = (magi / guideline) * 100;
  const band = acaSubsidySnapshot.contributionBands.find((entry, index) => percentFpl >= entry.lowerIncomePercentFpl
    && (percentFpl < entry.upperIncomePercentFpl || index === acaSubsidySnapshot.contributionBands.length - 1))!;
  const fraction = (percentFpl - band.lowerIncomePercentFpl) / (band.upperIncomePercentFpl - band.lowerIncomePercentFpl);
  const applicable = band.initialContributionPercent + fraction * (band.finalContributionPercent - band.initialContributionPercent);
  return (magi * applicable) / 100 / 12;
}

describe('2026 premium tax credit rules', () => {
  it('carries the published 2026 table and the 2025 guidelines it is applied against', () => {
    expect(acaSubsidySnapshot.coverageYear).toBe(2026);
    // 2026 Marketplace coverage uses the poverty guidelines in effect at open enrollment.
    expect(acaSubsidySnapshot.povertyGuidelineYear).toBe(2025);
    expect(acaSubsidySnapshot.povertyGuidelines.contiguous).toEqual({ firstPerson: 15_650, additionalPerson: 5_500 });
    expect(acaSubsidySnapshot.povertyGuidelines.alaska).toEqual({ firstPerson: 19_550, additionalPerson: 6_880 });
    expect(acaSubsidySnapshot.povertyGuidelines.hawaii).toEqual({ firstPerson: 17_990, additionalPerson: 6_330 });
    expect(acaSubsidySnapshot.contributionBands.map((band) => [
      band.lowerIncomePercentFpl, band.upperIncomePercentFpl, band.initialContributionPercent, band.finalContributionPercent,
    ])).toEqual([
      [100, 133, 2.1, 2.1],
      [133, 150, 3.14, 4.19],
      [150, 200, 4.19, 6.6],
      [200, 250, 6.6, 8.44],
      [250, 300, 8.44, 9.96],
      [300, 400, 9.96, 9.96],
    ]);
    // The temporary expansion above 400% FPL lapsed after 2025, and with it the
    // capped repayment of excess advance credits.
    expect(acaSubsidySnapshot.maximumIncomePercentFpl).toBe(400);
    expect(acaSubsidySnapshot.excessAdvanceCreditRepaymentCap).toBeNull();
    expect(acaSubsidySnapshot.employerAffordabilityPercent).toBe(9.96);
  });

  it('fails the build on an edited digit the schema alone would accept', () => {
    expect(() => validateAcaSubsidySnapshot(snapshotJson)).not.toThrow();

    // $15,660 is a perfectly ordinary positive guideline and $4.20 is a
    // perfectly ordered band edge. The schema has no way to know either is not
    // what HHS and the Revenue Procedure printed; the hash is what does.
    const movedGuideline = structuredClone(snapshotJson);
    movedGuideline.povertyGuidelines.contiguous.firstPerson = 15_660;
    expect(() => acaSubsidySnapshotSchema.parse(movedGuideline)).not.toThrow();
    expect(() => validateAcaSubsidySnapshot(movedGuideline)).toThrow(/integrity check/);

    const nudgedBand = structuredClone(snapshotJson);
    nudgedBand.contributionBands[2].initialContributionPercent = 4.2;
    expect(() => acaSubsidySnapshotSchema.parse(nudgedBand)).not.toThrow();
    expect(() => validateAcaSubsidySnapshot(nudgedBand)).toThrow(/integrity check/);

    // An out-of-order table is caught earlier, by the schema, and never reaches the hash.
    const disordered = structuredClone(snapshotJson);
    disordered.contributionBands[5].finalContributionPercent = 9.69;
    expect(() => acaSubsidySnapshotSchema.parse(disordered)).toThrow(/ordered, adjacent, and nondecreasing/);

    const strippedHash = structuredClone(snapshotJson) as Record<string, unknown>;
    delete strippedHash.normalizedSha256;
    expect(() => validateAcaSubsidySnapshot(strippedHash)).toThrow(/missing its normalized hash/);
  });
});

describe('premium tax credit estimates', () => {
  it('interpolates inside a band and caps the credit at the benchmark less the contribution', () => {
    const result = calculateAcaSubsidy(base);
    const contribution = expectedContribution(30_000, 15_650);
    expect(result.value.povertyGuideline).toBe(15_650);
    expect(result.value.incomePercentFpl).toBeCloseTo(191.6933, 4);
    expect(result.value.applicableContributionPercent).toBeCloseTo(6.1996, 4);
    expect(result.value.expectedMonthlyContribution).toBeCloseTo(contribution, 2);
    expect(result.value.expectedMonthlyContribution).toBeCloseTo(154.99, 2);
    expect(result.value.monthlyPremiumTaxCredit).toBeCloseTo(500 - contribution, 2);
    expect(result.value.monthlyPremiumTaxCredit).toBeCloseTo(345.01, 2);
    expect(result.value.monthlyNetPremium).toBeCloseTo(450 - (500 - contribution), 2);
    expect(result.value.monthlyNetPremium).toBeCloseTo(104.99, 2);
    expect(result.value.status).toBe('estimated');
    expect(result.calculationVersion).toBe(ACA_SUBSIDY_VERSION);
    expect(result.datasetSnapshotIds).toEqual([acaSubsidySnapshot.snapshotId]);
  });

  it('adds one poverty-guideline increment per extra household member', () => {
    const household4 = calculateAcaSubsidy({ ...base, householdSize: 4, annualHouseholdMagi: 60_000 });
    expect(household4.value.povertyGuideline).toBe(15_650 + 3 * 5_500);
    expect(household4.value.minimumAnnualIncome).toBe(32_150);
    expect(household4.value.maximumAnnualIncome).toBe(128_600);
  });

  it('uses the separate Alaska and Hawaii guidelines instead of the contiguous one', () => {
    const alaska = calculateAcaSubsidy({ ...base, stateCode: 'AK', annualHouseholdMagi: 25_000 });
    expect(alaska.value.povertyGuideline).toBe(19_550);
    // 127.9% of the Alaska guideline sits in the flat 2.10% band.
    expect(alaska.value.applicableContributionPercent).toBe(2.1);
    expect(alaska.value.expectedMonthlyContribution).toBeCloseTo(43.75, 2);
    expect(calculateAcaSubsidy({ ...base, stateCode: 'HI' }).value.povertyGuideline).toBe(17_990);
    expect(calculateAcaSubsidy({ ...base, stateCode: 'TX' }).value.povertyGuideline).toBe(15_650);
  });

  it('holds the 9.96% contribution flat from 300% to exactly 400% FPL', () => {
    const atCeiling = calculateAcaSubsidy({
      ...base, householdSize: 2, annualHouseholdMagi: 84_600, monthlyBenchmarkPremium: 900, monthlyPlanPremium: 900,
    });
    expect(atCeiling.value.povertyGuideline).toBe(21_150);
    expect(atCeiling.value.incomePercentFpl).toBe(400);
    expect(atCeiling.value.applicableContributionPercent).toBe(9.96);
    expect(atCeiling.value.expectedMonthlyContribution).toBeCloseTo(702.18, 2);
    expect(atCeiling.value.monthlyPremiumTaxCredit).toBeCloseTo(197.82, 2);
    expect(atCeiling.value.status).toBe('estimated');
  });

  it('drops the credit to zero one dollar above the 400% ceiling', () => {
    const overCeiling = calculateAcaSubsidy({
      ...base, householdSize: 2, annualHouseholdMagi: 84_601, monthlyBenchmarkPremium: 900, monthlyPlanPremium: 900,
    });
    expect(overCeiling.value.status).toBe('above-income-range');
    expect(overCeiling.value.monthlyPremiumTaxCredit).toBe(0);
    expect(overCeiling.value.monthlyNetPremium).toBe(900);
    expect(overCeiling.value.applicableContributionPercent).toBeNull();
    expect(overCeiling.value.reasons.join(' ')).toContain('400% FPL ceiling');
  });

  it('refuses to price coverage below the income range instead of showing a zero credit', () => {
    const belowRange = calculateAcaSubsidy({ ...base, annualHouseholdMagi: 12_000 });
    expect(belowRange.value.status).toBe('below-income-range');
    expect(belowRange.value.monthlyPremiumTaxCredit).toBeNull();
    expect(belowRange.value.monthlyNetPremium).toBeNull();
    expect(belowRange.value.annualPremiumTaxCredit).toBeNull();
    expect(belowRange.value.reasons.join(' ')).toContain('Medicaid');
  });

  it('never turns an unconfirmed eligibility into a dollar amount', () => {
    const unconfirmed = calculateAcaSubsidy({ ...base, eligibility: 'unknown' });
    expect(unconfirmed.value.status).toBe('eligibility-unconfirmed');
    expect(unconfirmed.value.monthlyPremiumTaxCredit).toBeNull();
    expect(unconfirmed.value.monthlyNetPremium).toBeNull();
    // The income arithmetic still runs; only the credit is withheld.
    expect(unconfirmed.value.expectedMonthlyContribution).toBeCloseTo(154.99, 2);

    const ineligible = calculateAcaSubsidy({ ...base, eligibility: 'ineligible' });
    expect(ineligible.value.status).toBe('ineligible');
    expect(ineligible.value.monthlyPremiumTaxCredit).toBe(0);
    expect(ineligible.value.monthlyNetPremium).toBe(450);
  });

  it('caps the credit at the eligible enrollment premium, never below zero net cost', () => {
    const capped = calculateAcaSubsidy({
      ...base, annualHouseholdMagi: 16_000, monthlyBenchmarkPremium: 700, monthlyPlanPremium: 300,
    });
    expect(capped.value.expectedMonthlyContribution).toBeCloseTo(28, 2);
    // 700 - 28 = 672 of headroom, but the credit cannot exceed the $300 enrolled premium.
    expect(capped.value.monthlyPremiumTaxCredit).toBe(300);
    expect(capped.value.monthlyNetPremium).toBe(0);
  });

  it('leaves a non-eligible add-on in the net premium when one is declared', () => {
    const withAddOn = calculateAcaSubsidy({
      ...base, annualHouseholdMagi: 16_000, monthlyBenchmarkPremium: 700, monthlyPlanPremium: 300, monthlyEligiblePlanPremium: 260,
    });
    expect(withAddOn.value.monthlyPremiumTaxCredit).toBe(260);
    expect(withAddOn.value.monthlyNetPremium).toBe(40);
    expect(withAddOn.assumptions.join(' ')).toContain('capped at the eligible enrollment premium');
    expect(() => calculateAcaSubsidy({ ...base, monthlyEligiblePlanPremium: 999 })).toThrow(/cannot exceed/);
  });

  it('gives a benchmark below the expected contribution no credit rather than a negative one', () => {
    const cheapBenchmark = calculateAcaSubsidy({ ...base, monthlyBenchmarkPremium: 100, monthlyPlanPremium: 120 });
    expect(cheapBenchmark.value.monthlyPremiumTaxCredit).toBe(0);
    expect(cheapBenchmark.value.monthlyNetPremium).toBe(120);
    expect(cheapBenchmark.value.reasons.join(' ')).toContain('does not exceed the expected contribution');
  });

  it('annualizes at twelve months and reports a partial year separately', () => {
    const partial = calculateAcaSubsidy({ ...base, coverageMonths: 7 });
    expect(partial.value.annualPremiumTaxCredit).toBeCloseTo(partial.value.monthlyPremiumTaxCredit! * 12, 2);
    expect(partial.value.coveragePeriodPremiumTaxCredit).toBeCloseTo(partial.value.monthlyPremiumTaxCredit! * 7, 2);
    expect(partial.value.coveragePeriodNetPremium).toBeCloseTo(partial.value.monthlyNetPremium! * 7, 2);
    expect(partial.value.coverageMonths).toBe(7);
    // Annual MAGI is not prorated with the coverage period.
    expect(partial.value.incomePercentFpl).toBe(calculateAcaSubsidy(base).value.incomePercentFpl);
    expect(partial.assumptions.join(' ')).toContain('7 month(s)');
  });

  it('rejects inputs that would silently become zero dollars or an unsupported year', () => {
    for (const magi of [null, true, '', [], undefined, NaN, Infinity, -1]) {
      expect(() => calculateAcaSubsidy({ ...base, annualHouseholdMagi: magi })).toThrow();
    }
    expect(() => calculateAcaSubsidy({ ...base, coverageYear: 2025 })).toThrow();
    expect(() => calculateAcaSubsidy({ ...base, stateCode: 'PR' })).toThrow();
    expect(() => calculateAcaSubsidy({ ...base, householdSize: 0 })).toThrow();
    expect(() => calculateAcaSubsidy({ ...base, householdSize: 2.5 })).toThrow();
    expect(() => calculateAcaSubsidy({ ...base, coverageMonths: 13 })).toThrow();
    expect(() => calculateAcaSubsidy({ ...base, eligibility: 'probably' })).toThrow();
  });

  it('keeps the disclosures a premium estimate needs beside every result', () => {
    const text = calculateAcaSubsidy(base).assumptions.join(' ');
    expect(text).toContain('does not approve coverage');
    expect(text).toContain('second-lowest-cost Silver');
    expect(text).toContain('2025 poverty guidelines');
    expect(text).toContain('no repayment cap');
    expect(text).toContain('Deductibles, copays, coinsurance');
  });
});
