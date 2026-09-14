/**
 * The salary hub's server-side model.
 *
 * Building it reads the OEWS snapshot, so this module belongs on the server.
 * The pure half lives in `salary-hub-view.ts` and is re-exported here, leaving
 * every existing server import unchanged while the client can reach the pure
 * functions without dragging the wage tables along.
 */
import { type OewsEstimate, type OewsOccupation } from '@/lib/data/bls-oews';
import { getOewsEstimate, getOewsEstimatesForArea, getOewsOccupation } from '@/lib/data/bls-oews-snapshot';
import { STATE_CODES } from '@/lib/location/states';
import { occupationHeadingName } from '@/lib/salary-content';
import { occupationHeadingEs } from '@/lib/salary-content-es';
import { majorGroupTitleEs, occupationSearchTermsEs } from '@/lib/salary-naming-es';
import type { Locale } from '@/lib/i18n/locales';
import {
  nationalSalaryOccupations,
  occupationSearchTerms,
  salaryOccupationPath,
} from '@/lib/salary-pages';
import { salaryOccupationPathEs } from '@/lib/salary-es-pages';
import {
  FEATURED_SALARY_CODES,
  flattenSalaryHub,
  majorGroupShortTitle,
  type SalaryHubGroup,
  type SalaryHubModel,
  type SalaryHubOccupation,
} from '@/lib/salary-hub-view';

export * from '@/lib/salary-hub-view';

function toHubOccupation(occupation: OewsOccupation, estimate: OewsEstimate | undefined, locale: Locale): SalaryHubOccupation {
  return {
    code: occupation.code,
    path: locale === 'es-US' ? salaryOccupationPathEs(occupation) : salaryOccupationPath(occupation),
    name: locale === 'es-US' ? occupationHeadingEs(occupation) : occupationHeadingName(occupation),
    haystack: (locale === 'es-US' ? occupationSearchTermsEs(occupation) : occupationSearchTerms(occupation)).join(' '),
    medianAnnual: estimate?.annual.median ?? null,
    medianHourly: estimate?.hourly.median ?? null,
    employment: estimate?.employment ?? null,
  };
}

export function salaryHubModel(locale: Locale = 'en-US'): SalaryHubModel {
  const occupations = nationalSalaryOccupations();
  const estimatesByCode = new Map(getOewsEstimatesForArea('US').map((estimate) => [estimate.occCode, estimate]));
  const groups = new Map<string, SalaryHubOccupation[]>();

  for (const occupation of occupations) {
    const member = toHubOccupation(occupation, estimatesByCode.get(occupation.code), locale);
    const list = groups.get(occupation.majorCode) ?? [];
    list.push(member);
    groups.set(occupation.majorCode, list);
  }

  const grouped: SalaryHubGroup[] = [...groups.entries()]
    .map(([majorCode, members]) => {
      const englishTitle = getOewsOccupation(majorCode)?.title ?? 'Other occupations';
      const named = locale === 'es-US' ? majorGroupTitleEs(majorCode, englishTitle) : {
        title: englishTitle,
        shortTitle: majorGroupShortTitle(englishTitle),
      };
      return {
        majorCode,
        title: named.title,
        shortTitle: named.shortTitle,
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
