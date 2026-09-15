import { describe, expect, it } from 'vitest';
import {
  ANNUAL_SALARIES,
  getAnnualSalaryProfile,
  getHourlyWageProfile,
  HOURLY_RATES,
  hourlyToSlug,
  salaryToSlug,
  slugToHourly,
  slugToSalary,
} from '@/lib/matrices/wage-matrix-data';
import { buildSerpTitle } from '@/lib/seo';
import { getSitemapFamilies } from '@/lib/seo/sitemaps';

describe('Wage Matrix Data & Conversions', () => {
  it('defines curated lists of realistic hourly wages and annual salaries', () => {
    expect(HOURLY_RATES.length).toBe(20);
    expect(ANNUAL_SALARIES.length).toBe(23);

    expect(HOURLY_RATES).toContain(15);
    expect(HOURLY_RATES).toContain(20);
    expect(HOURLY_RATES).toContain(30);
    expect(HOURLY_RATES).toContain(50);
    expect(HOURLY_RATES).toContain(100);

    expect(ANNUAL_SALARIES).toContain(30_000);
    expect(ANNUAL_SALARIES).toContain(60_000);
    expect(ANNUAL_SALARIES).toContain(75_000);
    expect(ANNUAL_SALARIES).toContain(100_000);
    expect(ANNUAL_SALARIES).toContain(200_000);
  });

  it('correctly maps hourly slugs back and forth', () => {
    expect(hourlyToSlug(30)).toBe('30-an-hour');
    expect(slugToHourly('30-an-hour')).toBe(30);
    expect(slugToHourly('15-an-hour')).toBe(15);
    expect(slugToHourly('100-an-hour')).toBe(100);
    expect(slugToHourly('invalid-slug')).toBeUndefined();
    expect(slugToHourly('999-an-hour')).toBeUndefined();
  });

  it('correctly maps salary slugs back and forth', () => {
    expect(salaryToSlug(60_000)).toBe('60k-a-year');
    expect(slugToSalary('60k-a-year')).toBe(60_000);
    expect(slugToSalary('100k-a-year')).toBe(100_000);
    expect(slugToSalary('200k-a-year')).toBe(200_000);
    expect(slugToSalary('invalid-slug')).toBeUndefined();
    expect(slugToSalary('999k-a-year')).toBeUndefined();
  });

  it('computes exact mathematical gross pay frequencies for $30/hour', () => {
    const profile = getHourlyWageProfile(30);
    expect(profile.rate).toBe(30);
    expect(profile.annualGross).toBe(62_400); // 30 * 2080
    expect(profile.monthlyGross).toBe(5_200); // 62400 / 12
    expect(profile.semiMonthlyGross).toBe(2_600); // 62400 / 24
    expect(profile.biweeklyGross).toBe(2_400); // 62400 / 26
    expect(profile.weeklyGross).toBe(1_200); // 62400 / 52
    expect(profile.dailyGross).toBe(240); // 30 * 8

    // Budget allocations
    expect(profile.budget503020.needsAnnual + profile.budget503020.wantsAnnual + profile.budget503020.savingsAnnual).toBe(62_400);
    expect(profile.housingGuideline.maxRentMonthly).toBe(1_560); // 30% of 5200
  });

  it('computes exact mathematical gross pay frequencies for $60k/year', () => {
    const profile = getAnnualSalaryProfile(60_000);
    expect(profile.salary).toBe(60_000);
    expect(profile.hourlyEquivalent).toBe(28.85); // 60000 / 2080 = 28.846... -> 28.85
    expect(profile.monthlyGross).toBe(5_000); // 60000 / 12
    expect(profile.semiMonthlyGross).toBe(2_500); // 60000 / 24
    expect(profile.biweeklyGross).toBe(2_307.69); // 60000 / 26
    expect(profile.weeklyGross).toBe(1_153.85); // 60000 / 52
    expect(profile.dailyGross).toBe(230.8); // 28.85 * 8

    // Budget allocations
    expect(profile.budget503020.needsAnnual).toBe(30_000);
    expect(profile.budget503020.wantsAnnual).toBe(18_000);
    expect(profile.budget503020.savingsAnnual).toBe(12_000);
  });

  it('models comprehensive work schedule variations and unpaid time off', () => {
    const profile = getHourlyWageProfile(30);
    expect(profile.workScenarios.length).toBe(6);

    const standard = profile.workScenarios.find((s) => s.label.includes('Standard'))!;
    expect(standard.annualGross).toBe(62_400);
    expect(standard.annualHours).toBe(2080);

    const unpaidVacation = profile.workScenarios.find((s) => s.label.includes('2 Weeks Unpaid'))!;
    expect(unpaidVacation.annualGross).toBe(60_000); // 30 * 2000
    expect(unpaidVacation.annualHours).toBe(2000);

    const hospital = profile.workScenarios.find((s) => s.label.includes('37.5'))!;
    expect(hospital.annualGross).toBe(58_500); // 30 * 1950

    const partTime = profile.workScenarios.find((s) => s.label.includes('Part-Time (20'))!;
    expect(partTime.annualGross).toBe(31_200); // 30 * 1040
  });

  it('calculates overtime rates and multiple weekly overtime scenarios', () => {
    const profile = getHourlyWageProfile(30);
    expect(profile.overtime.baseRate).toBe(30);
    expect(profile.overtime.timeAndHalfRate).toBe(45); // 30 * 1.5
    expect(profile.overtime.doubleTimeRate).toBe(60); // 30 * 2.0

    // 5 hrs OT/week: (40 * 30) + (5 * 45) = 1200 + 225 = 1425/wk -> 1425 * 52 = 74,100
    const ot5 = profile.overtime.scenarios.find((s) => s.overtimeHoursPerWeek === 5)!;
    expect(ot5.totalWeeklyGross).toBe(1_425);
    expect(ot5.totalAnnualGross).toBe(74_100);
    expect(ot5.extraAnnualGross).toBe(11_700);

    // 10 hrs OT/week: 1200 + 450 = 1650/wk -> 85,800
    const ot10 = profile.overtime.scenarios.find((s) => s.overtimeHoursPerWeek === 10)!;
    expect(ot10.totalAnnualGross).toBe(85_800);
  });

  it('provides itemized monthly living budgets and realistic housing purchasing power', () => {
    const profile = getHourlyWageProfile(30);
    const itemized = profile.itemizedBudget;

    expect(itemized.needsMonthly).toBe(2_600);
    expect(itemized.needsBreakdown.housingMax).toBe(1_560);
    expect(itemized.needsBreakdown.groceries).toBeGreaterThan(0);
    expect(itemized.needsBreakdown.utilitiesPhone).toBeGreaterThan(0);
    expect(itemized.needsBreakdown.transportation).toBeGreaterThan(0);

    // Deep housing scenarios
    expect(profile.housingDeep.frontEndMonthlyBudget).toBe(1_456); // 28% of 5200
    expect(profile.housingDeep.backEndMonthlyBudget).toBe(1_872); // 36% of 5200
    expect(profile.housingDeep.scenarios.length).toBe(3); // 5%, 10%, 20% down
    expect(profile.housingDeep.scenarios[2].downPaymentPercent).toBe(20);
    expect(profile.housingDeep.scenarios[2].hasPmi).toBe(false);
  });

  it('calculates verified 50-state tax liabilities with top benchmark states', () => {
    const profile = getHourlyWageProfile(25);
    expect(profile.stateTaxes).toHaveLength(51); // 50 states + DC
    expect(profile.topStates).toHaveLength(6); // TX, FL, CA, NY, WA, IL

    for (const row of profile.stateTaxes) {
      expect(row.grossAnnual).toBe(52_000);
      expect(row.federalTax).toBeGreaterThan(0);
      expect(row.ficaTax).toBeGreaterThan(0);
      expect(row.stateTax).toBeGreaterThanOrEqual(0);
      expect(Math.abs(row.totalTax - (row.federalTax + row.ficaTax + row.stateTax))).toBeLessThanOrEqual(0.05);
      expect(Math.abs(row.annualNet - (row.grossAnnual - row.totalTax))).toBeLessThanOrEqual(1);
      expect(row.effectiveRate).toBeGreaterThan(0);
      expect(row.effectiveRate).toBeLessThan(40);
      expect(row.annualNet).toBeGreaterThan(0);
    }

    // Texas and Florida must have stateTax === 0
    const texas = profile.stateTaxes.find((s) => s.stateCode === 'TX')!;
    expect(texas).toBeDefined();
    expect(texas.stateTax).toBe(0);

    const florida = profile.stateTaxes.find((s) => s.stateCode === 'FL')!;
    expect(florida).toBeDefined();
    expect(florida.stateTax).toBe(0);

    // California must have stateTax > 0
    const california = profile.stateTaxes.find((s) => s.stateCode === 'CA')!;
    expect(california).toBeDefined();
    expect(california.stateTax).toBeGreaterThan(0);
  });

  it('finds realistic matching BLS occupations within bracket and reciprocal cross-links', () => {
    const profile = getHourlyWageProfile(30);
    expect(profile.matchedOccupations.length).toBeGreaterThan(0);
    expect(profile.matchedOccupations.length).toBeLessThanOrEqual(4);

    for (const job of profile.matchedOccupations) {
      expect(job.title.length).toBeGreaterThan(0);
      expect(job.path).toMatch(/^\/salary\//);
      expect(job.medianAnnual).toBeGreaterThan(50_000);
      expect(job.medianAnnual).toBeLessThan(75_000);
    }

    // Reciprocal links
    expect(profile.closestSalarySlug).toBe('60k-a-year');
    expect(profile.closestSalaryAmount).toBe(60_000);

    const salaryProfile = getAnnualSalaryProfile(60_000);
    expect(salaryProfile.closestHourlySlug).toBe('28-an-hour');
  });

  it('generates evergreen SERP titles for math queries and fresh titles for tax queries', () => {
    const evergreenTitle = buildSerpTitle('$30 an Hour Is How Much a Year?', 'evergreen');
    expect(evergreenTitle).not.toContain('2026');
    expect(evergreenTitle).toBe('$30 an Hour Is How Much a Year?');

    const taxTitle = buildSerpTitle('$60k Salary After Tax: Take-Home Pay & Paycheck', 'tax-freshness', 2026);
    expect(taxTitle).toContain('(2026)');
    expect(taxTitle).toBe('$60k Salary After Tax: Take-Home Pay & Paycheck (2026)');
  });

  it('registers all 43 wage matrix routes in the wage-matrix sitemap family', () => {
    const families = getSitemapFamilies();
    const wageMatrix = families['wage-matrix'];

    expect(wageMatrix).toBeDefined();
    expect(wageMatrix).toHaveLength(43);

    const hourlyPaths = wageMatrix.filter((e) => e.path.startsWith('/money/hourly-to-salary/'));
    const salaryPaths = wageMatrix.filter((e) => e.path.startsWith('/money/salary-after-tax/'));

    expect(hourlyPaths).toHaveLength(20);
    expect(salaryPaths).toHaveLength(23);

    for (const entry of wageMatrix) {
      expect(Number.isFinite(Date.parse(entry.lastModified))).toBe(true);
      expect(entry.changeFrequency).toBe('monthly');
      expect(entry.priority).toBe(0.8);
    }
  });
});
