/**
 * The salary directory's pure view logic — filtering, sorting, labels, types.
 *
 * Split out of `salary-hub.ts` because the client directory needs only these,
 * while that module reads the OEWS snapshot at import time. Together in one
 * file, the bundler had no choice but to ship 3.9 MB of wage tables to the
 * browser in order to deliver a search box.
 *
 * Nothing here may import a dataset. That restriction is the file's purpose,
 * and `tests/salary-hub-view.spec.ts` enforces it.
 */
import { formatMoney } from '@/lib/calculations/contracts';

/**
 * Same 2,080-hour year OEWS uses to annualise an hourly wage.
 *
 * Copied rather than imported so this module never touches `lib/data`.
 */
const OEWS_ANNUAL_HOURS = 2_080;


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

function escapeSearchToken(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function haystackHasToken(haystack: string, token: string): boolean {
  if (token.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escapeSearchToken(token)}([^a-z0-9]|$)`).test(haystack);
  }
  return haystack.includes(token);
}

export function occupationMatchesNeedle(occupation: SalaryHubOccupation, needle: string): boolean {
  if (needle.length < 2) return true;
  const compact = needle.replace(/ /g, '');
  if (compact.length >= 2 && occupation.code.replace('-', '').includes(compact)) return true;
  const tokens = needle.split(' ').filter((token) => token.length >= 2 && !QUERY_STOPWORDS.has(token));
  if (tokens.length === 0) return haystackHasToken(occupation.haystack, needle);
  return tokens.every((token) => haystackHasToken(occupation.haystack, token));
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
