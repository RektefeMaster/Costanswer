/**
 * The family hub as a directory a person can actually use.
 *
 * The occupation pages are the answers. This module is the way into them:
 * a searchable, sortable list of every national page, each row carrying the
 * median wage so a reader can scan pay without opening 761 pages. The hub
 * still lists every occupation in SOC order, which is what keeps the family
 * crawlable; the search and sort are a layer over that list, not a substitute.
 */
import { formatMoney } from '@/lib/calculations/contracts';
import { OEWS_ANNUAL_HOURS, type OewsEstimate, type OewsOccupation } from '@/lib/data/bls-oews';
import { getOewsEstimate, getOewsEstimatesForArea, getOewsOccupation } from '@/lib/data/bls-oews-snapshot';
import { STATE_CODES } from '@/lib/location/states';
import { occupationHeadingName } from '@/lib/salary-content';
import {
  nationalSalaryOccupations,
  occupationSearchTerms,
  salaryOccupationPath,
} from '@/lib/salary-pages';

/**
 * Occupations the hub surfaces first.
 *
 * The same jobs the homepage already names, so a reader who followed that
 * doorway lands on something they recognise rather than a SOC table.
 */
export const FEATURED_SALARY_CODES = [
  '29-1141',
  '15-1252',
  '53-3032',
  '25-2021',
  '47-2111',
  '31-1131',
  '13-2011',
  '43-6014',
] as const;

export type SalaryHubOccupation = {
  code: string;
  path: string;
  name: string;
  /** Lowercased blob of names, aliases, and the SOC code, for client search. */
  haystack: string;
  medianAnnual: number | null;
  medianHourly: number | null;
  employment: number | null;
};

export type SalaryHubGroup = {
  majorCode: string;
  title: string;
  shortTitle: string;
  members: SalaryHubOccupation[];
};

export type SalaryHubSort = 'field' | 'pay' | 'jobs';

export type SalaryHubModel = {
  groups: SalaryHubGroup[];
  featured: SalaryHubOccupation[];
  occupationCount: number;
  nationalMedian: number | null;
  stateCount: number;
};

export function majorGroupShortTitle(title: string): string {
  return title.replace(/\s+Occupations$/i, '');
}

function toHubOccupation(occupation: OewsOccupation, estimate: OewsEstimate | undefined): SalaryHubOccupation {
  return {
    code: occupation.code,
    path: salaryOccupationPath(occupation),
    name: occupationHeadingName(occupation),
    haystack: occupationSearchTerms(occupation).join(' '),
    medianAnnual: estimate?.annual.median ?? null,
    medianHourly: estimate?.hourly.median ?? null,
    employment: estimate?.employment ?? null,
  };
}

export function salaryHubModel(): SalaryHubModel {
  const occupations = nationalSalaryOccupations();
  const estimatesByCode = new Map(getOewsEstimatesForArea('US').map((estimate) => [estimate.occCode, estimate]));
  const groups = new Map<string, SalaryHubOccupation[]>();

  for (const occupation of occupations) {
    const member = toHubOccupation(occupation, estimatesByCode.get(occupation.code));
    const list = groups.get(occupation.majorCode) ?? [];
    list.push(member);
    groups.set(occupation.majorCode, list);
  }

  const grouped: SalaryHubGroup[] = [...groups.entries()]
    .map(([majorCode, members]) => {
      const title = getOewsOccupation(majorCode)?.title ?? 'Other occupations';
      return {
        majorCode,
        title,
        shortTitle: majorGroupShortTitle(title),
        members,
      };
    })
    .sort((left, right) => left.majorCode.localeCompare(right.majorCode));

  const byCode = new Map(flattenSalaryHub(grouped).map((occupation) => [occupation.code, occupation]));
  const featured = FEATURED_SALARY_CODES
    .map((code) => byCode.get(code))
    .filter((occupation): occupation is SalaryHubOccupation => occupation !== undefined);

  const nationalTotal = getOewsEstimate('US', '00-0000');

  return {
    groups: grouped,
    featured,
    occupationCount: occupations.length,
    nationalMedian: nationalTotal?.annual.median ?? null,
    stateCount: STATE_CODES.length,
  };
}

export function flattenSalaryHub(groups: readonly SalaryHubGroup[]): SalaryHubOccupation[] {
  return groups.flatMap((group) => group.members);
}

export function salaryHubPayLabel(occupation: Pick<SalaryHubOccupation, 'medianAnnual' | 'medianHourly'>): string {
  if (occupation.medianAnnual !== null) return formatMoney(occupation.medianAnnual, 0);
  if (occupation.medianHourly !== null) return `${formatMoney(occupation.medianHourly)}/hr`;
  return 'See pay';
}

export function salaryHubPayNote(occupation: Pick<SalaryHubOccupation, 'medianAnnual' | 'medianHourly'>): string {
  if (occupation.medianAnnual !== null) return 'median a year';
  if (occupation.medianHourly !== null) return 'median an hour';
  return 'pay not published';
}

/**
 * Strip the words people add around a job title, and the punctuation they paste.
 *
 * "RN salary", "how much does a nurse make", and "29-1141" should all reach
 * the same occupation. One and two letter queries are real (RN, PA), so the
 * directory filters from two characters rather than waiting for three.
 */
export function normalizeSalaryQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(salary|salaries|pay|wage|wages|job|jobs|make|earn|earns)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const QUERY_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'how', 'much',
  'does', 'do', 'did', 'what', 'is', 'are', 'my', 'me', 'at', 'by', 'with', 'from',
]);

export function occupationMatchesNeedle(occupation: SalaryHubOccupation, needle: string): boolean {
  if (needle.length < 2) return true;
  const compact = needle.replace(/ /g, '');
  if (compact.length >= 2 && occupation.code.replace('-', '').includes(compact)) return true;
  const tokens = needle.split(' ').filter((token) => token.length >= 2 && !QUERY_STOPWORDS.has(token));
  if (tokens.length === 0) return occupation.haystack.includes(needle);
  return tokens.every((token) => occupation.haystack.includes(token));
}

export function filterSalaryHubGroups(groups: readonly SalaryHubGroup[], query: string): SalaryHubGroup[] {
  const needle = normalizeSalaryQuery(query);
  if (needle.length < 2) return [...groups];
  return groups
    .map((group) => ({
      ...group,
      members: group.members.filter((occupation) => occupationMatchesNeedle(occupation, needle)),
    }))
    .filter((group) => group.members.length > 0);
}

function annualisedMedian(occupation: SalaryHubOccupation): number {
  if (occupation.medianAnnual !== null) return occupation.medianAnnual;
  if (occupation.medianHourly !== null) return occupation.medianHourly * OEWS_ANNUAL_HOURS;
  return Number.NEGATIVE_INFINITY;
}

export function compareSalaryHubOccupations(
  left: SalaryHubOccupation,
  right: SalaryHubOccupation,
  sort: Exclude<SalaryHubSort, 'field'>,
): number {
  switch (sort) {
    case 'pay': {
      const delta = annualisedMedian(right) - annualisedMedian(left);
      return delta !== 0 ? delta : left.name.localeCompare(right.name);
    }
    case 'jobs': {
      const delta = (right.employment ?? Number.NEGATIVE_INFINITY) - (left.employment ?? Number.NEGATIVE_INFINITY);
      return delta !== 0 ? delta : left.name.localeCompare(right.name);
    }
    default: {
      const _exhaustive: never = sort;
      throw new Error(`Unhandled salary hub sort: ${String(_exhaustive)}`);
    }
  }
}

export function rankSalaryHubOccupations(
  occupations: readonly SalaryHubOccupation[],
  sort: Exclude<SalaryHubSort, 'field'>,
): SalaryHubOccupation[] {
  return [...occupations].sort((left, right) => compareSalaryHubOccupations(left, right, sort));
}
