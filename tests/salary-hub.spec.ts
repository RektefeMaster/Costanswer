import { describe, expect, it } from 'vitest';
import { formatMoney } from '@/lib/calculations/contracts';
import { nationalSalaryOccupations, occupationSearchTerms, salaryOccupationPath } from '@/lib/salary-pages';
import {
  FEATURED_SALARY_CODES,
  compareSalaryHubOccupations,
  filterSalaryHubGroups,
  flattenSalaryHub,
  majorGroupShortTitle,
  normalizeSalaryQuery,
  occupationMatchesNeedle,
  rankSalaryHubOccupations,
  salaryHubModel,
  salaryHubPayLabel,
} from '@/lib/salary-hub';

describe('the salary hub directory', () => {
  const hub = salaryHubModel();
  const occupations = flattenSalaryHub(hub.groups);

  it('lists every national occupation page exactly once', () => {
    const published = nationalSalaryOccupations();
    expect(occupations).toHaveLength(published.length);
    expect(new Set(occupations.map((occupation) => occupation.path)).size).toBe(published.length);
    for (const occupation of published) {
      expect(occupations.some((row) => row.path === salaryOccupationPath(occupation))).toBe(true);
    }
  });

  it('keeps groups in SOC order and names them from the major group', () => {
    const codes = hub.groups.map((group) => group.majorCode);
    expect(codes).toEqual([...codes].sort());
    expect(hub.groups[0]?.shortTitle).toBe(majorGroupShortTitle(hub.groups[0]?.title ?? ''));
    expect(majorGroupShortTitle('Management Occupations')).toBe('Management');
  });

  it('surfaces the same common jobs the homepage already names', () => {
    expect(hub.featured.map((occupation) => occupation.code)).toEqual([...FEATURED_SALARY_CODES]);
    expect(hub.featured.every((occupation) => occupation.medianAnnual !== null || occupation.medianHourly !== null)).toBe(true);
  });

  it('puts a median on a row so the list is scannable without opening a page', () => {
    const nurses = occupations.find((occupation) => occupation.code === '29-1141')!;
    expect(nurses.name).toBe('Registered Nurse');
    expect(nurses.medianAnnual).toBeGreaterThan(50_000);
    expect(salaryHubPayLabel(nurses)).toBe(formatMoney(nurses.medianAnnual!, 0));
  });
});

describe('finding a job from what a reader types', () => {
  const hub = salaryHubModel();
  const occupations = flattenSalaryHub(hub.groups);
  const nurses = occupations.find((occupation) => occupation.code === '29-1141')!;

  it('treats RN, the spoken name, and the SOC code as the same job', () => {
    expect(occupationSearchTerms(nationalSalaryOccupations().find((occupation) => occupation.code === '29-1141')!)).toEqual(
      expect.arrayContaining(['registered nurse', 'rn', '29-1141', '291141']),
    );
    expect(occupationMatchesNeedle(nurses, normalizeSalaryQuery('RN salary'))).toBe(true);
    expect(occupationMatchesNeedle(nurses, normalizeSalaryQuery('how much does a nurse make'))).toBe(true);
    expect(occupationMatchesNeedle(nurses, normalizeSalaryQuery('registered nurse'))).toBe(true);
    expect(occupationMatchesNeedle(nurses, normalizeSalaryQuery('29-1141'))).toBe(true);
    expect(occupationMatchesNeedle(nurses, normalizeSalaryQuery('291141'))).toBe(true);
  });

  it('does not filter on a single character, so the full catalogue stays visible', () => {
    expect(filterSalaryHubGroups(hub.groups, 'n')).toHaveLength(hub.groups.length);
  });

  it('narrows to RN without matching attorney or furnace', () => {
    const lawyers = occupations.find((occupation) => occupation.code === '23-1011')!;
    const furnace = occupations.find((occupation) => occupation.haystack.includes('furnace'));
    expect(occupationMatchesNeedle(lawyers, normalizeSalaryQuery('RN'))).toBe(false);
    if (furnace) expect(occupationMatchesNeedle(furnace, normalizeSalaryQuery('RN'))).toBe(false);
    const matches = flattenSalaryHub(filterSalaryHubGroups(hub.groups, 'RN'));
    expect(matches.some((occupation) => occupation.code === '29-1141')).toBe(true);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThan(10);
    expect(matches.some((occupation) => occupation.code === '23-1011')).toBe(false);
  });

  it('ranks the highest median first when asked what pays most', () => {
    const ranked = rankSalaryHubOccupations(occupations, 'pay');
    expect(ranked[0]).toBeDefined();
    for (let index = 1; index < ranked.length; index += 1) {
      expect(compareSalaryHubOccupations(ranked[index - 1]!, ranked[index]!, 'pay')).toBeLessThanOrEqual(0);
    }
    expect(ranked[0]!.medianAnnual ?? 0).toBeGreaterThan(ranked.at(-1)!.medianAnnual ?? 0);
  });
});
