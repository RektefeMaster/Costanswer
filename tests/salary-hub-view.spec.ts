import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  compareSalaryHubOccupations,
  filterSalaryHubGroups,
  flattenSalaryHub,
  majorGroupShortTitle,
  normalizeSalaryQuery,
  occupationMatchesNeedle,
  rankSalaryHubOccupations,
  type SalaryHubGroup,
  type SalaryHubOccupation,
} from '@/lib/salary-hub-view';

const VIEW_SOURCE = readFileSync(path.join(process.cwd(), 'lib', 'salary-hub-view.ts'), 'utf8');

function occupation(overrides: Partial<SalaryHubOccupation> & Pick<SalaryHubOccupation, 'code' | 'name' | 'haystack'>): SalaryHubOccupation {
  return {
    path: `/salary/${overrides.code}`,
    medianAnnual: null,
    medianHourly: null,
    employment: null,
    ...overrides,
  };
}

const nurses = occupation({
  code: '29-1141',
  name: 'Registered Nurse',
  haystack: 'registered nurse rn 29-1141 291141',
  medianAnnual: 90_000,
  employment: 3_000_000,
});
const lawyers = occupation({
  code: '23-1011',
  name: 'Lawyer',
  haystack: 'lawyer attorney 23-1011',
  medianAnnual: 140_000,
  employment: 800_000,
});
const hourlyOnly = occupation({
  code: '35-3031',
  name: 'Waiter',
  haystack: 'waiter waitress 35-3031',
  medianHourly: 16,
});

const groups: SalaryHubGroup[] = [
  { majorCode: '23-0000', title: 'Legal Occupations', shortTitle: 'Legal', members: [lawyers] },
  { majorCode: '29-0000', title: 'Healthcare Occupations', shortTitle: 'Healthcare', members: [nurses] },
];

describe('salary hub view stays free of datasets', () => {
  it('imports nothing from lib/data, snapshots, or JSON', () => {
    const specifiers: string[] = [];
    const pattern = /(?:^|\n)\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(VIEW_SOURCE))) specifiers.push(match[1]);
    const offenders = specifiers.filter((specifier) =>
      specifier.includes('/data')
      || specifier.includes('snapshot')
      || specifier.endsWith('.json')
      || specifier.includes('salary-pages')
      || specifier.includes('bls-oews'),
    );
    expect(offenders).toEqual([]);
  });
});

describe('finding a job from what a reader types', () => {
  it('treats RN, the spoken name, and the SOC code as the same job', () => {
    expect(occupationMatchesNeedle(nurses, normalizeSalaryQuery('RN salary'))).toBe(true);
    expect(occupationMatchesNeedle(nurses, normalizeSalaryQuery('how much does a nurse make'))).toBe(true);
    expect(occupationMatchesNeedle(nurses, normalizeSalaryQuery('29-1141'))).toBe(true);
    expect(occupationMatchesNeedle(nurses, normalizeSalaryQuery('291141'))).toBe(true);
  });

  it('does not filter on a single character, so the full catalogue stays visible', () => {
    expect(filterSalaryHubGroups(groups, 'n')).toHaveLength(groups.length);
  });

  it('narrows to RN without matching attorney', () => {
    expect(occupationMatchesNeedle(lawyers, normalizeSalaryQuery('RN'))).toBe(false);
    const matches = flattenSalaryHub(filterSalaryHubGroups(groups, 'RN'));
    expect(matches.map((row) => row.code)).toEqual(['29-1141']);
  });
});

describe('ranking', () => {
  it('drops the Occupations suffix from a major-group title', () => {
    expect(majorGroupShortTitle('Management Occupations')).toBe('Management');
  });

  it('ranks the highest median first, annualising an hourly wage', () => {
    const ranked = rankSalaryHubOccupations([hourlyOnly, nurses, lawyers], 'pay');
    expect(ranked.map((row) => row.code)).toEqual(['23-1011', '29-1141', '35-3031']);
    expect(compareSalaryHubOccupations(lawyers, nurses, 'pay')).toBeLessThan(0);
  });
});
