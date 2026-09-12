import { describe, expect, it } from 'vitest';
import snapshotJson from '@/data/irs-rmd/current.json';
import { calculateRmd } from '@/lib/calculations/rmd';
import { rmdRequiredBeginningAge, uniformLifetimePeriod } from '@/lib/data/irs-rmd';
import { validateIrsRmdSnapshot } from '@/lib/data/verify';

const own = {
  inherited: false,
  spouseMoreThanTenYearsYounger: false,
  rothIra: false,
};

describe('IRS Uniform Lifetime Table III', () => {
  it('matches the IRS $100,000 at age 75 worked example', () => {
    expect(uniformLifetimePeriod(75)).toBe(24.6);
    const result = calculateRmd({
      priorYearEndBalance: 100_000,
      age: 75,
      birthYear: 1951,
      ...own,
    });
    expect(result.value.rmd).toBe(4_065);
    expect(result.value.required).toBe(true);
    expect(result.value.startAge).toBe(73);
  });

  it('starts RMDs at 73 or 75 from SECURE 2.0, not from the table', () => {
    expect(rmdRequiredBeginningAge(1959)).toBe(73);
    expect(rmdRequiredBeginningAge(1960)).toBe(75);
    expect(rmdRequiredBeginningAge(1948)).toBe(72);
    const tooYoung = calculateRmd({
      priorYearEndBalance: 500_000,
      age: 72,
      birthYear: 1954,
      ...own,
    });
    expect(tooYoung.value.required).toBe(false);
    expect(tooYoung.value.rmd).toBe(0);
    const laterCohort = calculateRmd({
      priorYearEndBalance: 500_000,
      age: 74,
      birthYear: 1960,
      ...own,
    });
    expect(laterCohort.value.startAge).toBe(75);
    expect(laterCohort.value.rmd).toBe(0);
  });

  it('refuses Table III for inherited IRAs, Roth owners, and Table II facts', () => {
    expect(calculateRmd({
      priorYearEndBalance: 100_000, age: 80, birthYear: 1946, inherited: true, spouseMoreThanTenYearsYounger: false, rothIra: false,
    }).value.rmd).toBeNull();
    expect(calculateRmd({
      priorYearEndBalance: 100_000, age: 80, birthYear: 1946, inherited: false, spouseMoreThanTenYearsYounger: false, rothIra: true,
    }).value.blockedReason).toMatch(/Roth IRA/);
    expect(calculateRmd({
      priorYearEndBalance: 100_000, age: 80, birthYear: 1946, inherited: false, spouseMoreThanTenYearsYounger: true, rothIra: false,
    }).value.blockedReason).toMatch(/Table II/);
  });

  it('uses birth-year age for Table III even when the typed age disagrees', () => {
    const result = calculateRmd({
      priorYearEndBalance: 100_000,
      age: 80,
      birthYear: 1951,
      ...own,
    });
    expect(result.value.age).toBe(75);
    expect(result.value.rmd).toBe(4_065);
  });

  it('uses 2.0 at age 120 and over', () => {
    expect(uniformLifetimePeriod(120)).toBe(2);
    expect(uniformLifetimePeriod(125)).toBe(2);
    expect(uniformLifetimePeriod(71)).toBeUndefined();
  });

  it('fails the build on a mistyped factor', () => {
    expect(() => validateIrsRmdSnapshot(snapshotJson)).not.toThrow();
    const mistyped = structuredClone(snapshotJson);
    mistyped.uniformLifetime[3].period = 24.7;
    expect(() => validateIrsRmdSnapshot(mistyped)).toThrow(/integrity check/);
  });
});
