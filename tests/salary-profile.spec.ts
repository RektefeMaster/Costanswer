import { describe, expect, it } from 'vitest';
import { round } from '@/lib/calculations/contracts';
import { occupationWageProfile, taxesOnWagesLabel, WAGE_PROFILE_FILING_STATUS } from '@/lib/calculations/salary';
import { OCCUPATION_WAGE_ENGINE_ID } from '@/lib/calculations/salary/version';
import { estimateAnnualTaxLiability } from '@/lib/calculations/tax';
import { DEFAULT_TAX_YEAR } from '@/lib/calculations/tax/version';
import { getOewsEstimate, oewsIndex, oewsPageWorthyPairs } from '@/lib/data/bls-oews-snapshot';

describe('occupation wage profile', () => {
  it('pins the composed answer for registered nurses in Texas', () => {
    const result = occupationWageProfile({ area: 'TX', occupationCode: '29-1141' });
    expect(result).not.toBeNull();
    const profile = result!.value;

    expect(result!.calculationVersion).toBe(OCCUPATION_WAGE_ENGINE_ID);
    expect(profile.wage.annualMedian).toBe(95_970);
    expect(profile.wage.hourlyMedian).toBe(46.14);
    expect(profile.employment.total).toBe(271_380);
    expect(profile.employment.locationQuotient).toBe(0.89);
    expect(profile.employment.concentrationVsNationPercent).toBe(-11);
    expect(profile.takeHome?.effectiveTaxRate).toBe(0.2045);
    expect(profile.takeHome?.stateIncomeTax).toBe(0);
    expect(profile.costAdjusted?.adjustedAnnualMedian).toBe(98_880);
    expect(profile.versusNation?.nationalAnnualMedian).toBe(97_550);
    expect(profile.versusHousehold?.medianHouseholdIncome).toBe(78_476);
  });

  it('cites every snapshot the answer was composed from', () => {
    const result = occupationWageProfile({ area: 'CA', occupationCode: '15-1252' })!;
    expect(result.datasetSnapshotIds).toEqual([
      'bls-oews-2025-05-v1',
      'us-tax-2026-v1',
      'bea-rpp-2024-v1',
      'census-acs5-2024-v1',
    ]);
  });

  it('agrees with the tax engine it composes', () => {
    const profile = occupationWageProfile({ area: 'CA', occupationCode: '15-1252' })!.value;
    const liability = estimateAnnualTaxLiability({
      annualGrossSalary: profile.wage.annualMedian,
      state: 'CA',
      filingStatus: WAGE_PROFILE_FILING_STATUS,
      taxYear: DEFAULT_TAX_YEAR,
    });
    expect(profile.takeHome?.annual).toBe(round(liability.takeHome, 2));
    expect(profile.takeHome?.stateIncomeTax).toBe(round(liability.stateTax.tax, 2));
  });

  it('leaves the national page without a state-only comparison', () => {
    const profile = occupationWageProfile({ area: 'US', occupationCode: '29-1141' })!.value;
    expect(profile.wage.annualMedian).toBe(97_550);
    expect(profile.takeHome).toBeNull();
    expect(profile.costAdjusted).toBeNull();
    expect(profile.versusNation).toBeNull();
    expect(profile.versusHousehold).toBeNull();
  });

  it('will not annualize an occupation BLS publishes only by the hour', () => {
    const pair = oewsPageWorthyPairs().find(({ state, occupation }) =>
      getOewsEstimate(state, occupation.code)?.wageBasis === 'hourly-only');
    expect(pair, 'the release should contain an hourly-only occupation').toBeDefined();
    const hourlyOnly = occupationWageProfile({ area: pair!.state, occupationCode: pair!.occupation.code })!;
    expect(hourlyOnly.value.wage.annualMedian).toBeNull();
    expect(hourlyOnly.value.takeHome).toBeNull();
    expect(hourlyOnly.assumptions.join(' ')).toMatch(/only an hourly wage/);
  });

  it('says why an annual-only occupation has no hourly wage', () => {
    const teachers = occupationWageProfile({ area: 'NY', occupationCode: '25-2021' })!;
    expect(teachers.value.wage.basis).toBe('annual-only');
    expect(teachers.value.wage.hourlyMedian).toBeNull();
    expect(teachers.assumptions.join(' ')).toMatch(/only an annual wage/);
  });

  it('answers nothing rather than substituting a figure from elsewhere', () => {
    expect(occupationWageProfile({ area: 'TX', occupationCode: '99-9999' })).toBeNull();
    expect(occupationWageProfile({ area: 'TX', occupationCode: '00-0000' })?.value.wage.annualMedian).toBeDefined();
    const suppressed = oewsIndex.occupations.find((occupation) =>
      occupation.group === 'detailed' && !getOewsEstimate('WY', occupation.code));
    expect(suppressed, 'Wyoming should not publish every occupation').toBeDefined();
    expect(occupationWageProfile({ area: 'WY', occupationCode: suppressed!.code })).toBeNull();
  });

  it('always names its sources and its limits', () => {
    const profile = occupationWageProfile({ area: 'TX', occupationCode: '29-1141' })!;
    expect(profile.breakdown.length).toBeGreaterThanOrEqual(5);
    expect(profile.assumptions.join(' ')).toMatch(/survey estimates for May 2025/);
    expect(profile.assumptions.join(' ')).toMatch(/self-employed/);
    expect(profile.assumptions.join(' ')).toMatch(/filing single/);
  });

  it('composes every covered pair without throwing', () => {
    const sample = oewsPageWorthyPairs().filter((_pair, index) => index % 97 === 0);
    expect(sample.length).toBeGreaterThan(300);
    for (const { state, occupation } of sample) {
      const result = occupationWageProfile({ area: state, occupationCode: occupation.code });
      expect(result, `${state} ${occupation.code}`).not.toBeNull();
      expect(result!.assumptions.length).toBeGreaterThan(0);
      expect(result!.breakdown.length).toBeGreaterThan(0);
    }
  });
});

describe('naming the taxes that were actually charged', () => {
  it('does not name a state income tax in a state that levies none', () => {
    const texas = occupationWageProfile({ area: 'TX', occupationCode: '29-1141' })!;
    expect(texas.value.takeHome?.stateIncomeTax).toBe(0);
    expect(taxesOnWagesLabel(texas.value.takeHome)).toBe('federal and FICA tax');
    expect(texas.breakdown.map((step) => step.label).join(' ')).not.toMatch(/state and FICA/);
  });

  it('names it where it is charged', () => {
    const california = occupationWageProfile({ area: 'CA', occupationCode: '15-1252' })!;
    expect(california.value.takeHome!.stateIncomeTax).toBeGreaterThan(0);
    expect(taxesOnWagesLabel(california.value.takeHome)).toBe('federal, state and FICA tax');
    expect(california.breakdown.map((step) => step.label).join(' ')).toMatch(/federal, state and FICA tax/);
  });
});
