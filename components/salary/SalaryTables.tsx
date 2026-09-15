import Link from '@/components/i18n/LocalizedLink';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import type { OewsEstimate, OewsOccupation } from '@/lib/data/bls-oews';
import { getStateName, type StateCode } from '@/lib/location/states';
import { getStateNameEs } from '@/lib/location/states-es';
import { salaryLeafIsOpen, salaryOccupationInStatePath, salaryOccupationPath } from '@/lib/salary-pages';
import { salaryOccupationInStatePathEs, salaryOccupationPathEs } from '@/lib/salary-es-pages';
import { occupationHeadingName, occupationPlural } from '@/lib/salary-content';
import { occupationHeadingEs, occupationPluralEs } from '@/lib/salary-content-es';
import type { Locale } from '@/lib/i18n/locales';
import { formatMoneyLocale, formatNumberLocale } from '@/lib/i18n/format';
import { wageUi } from '@/lib/salary/wage-ui';

/**
 * The tables that are also the link graph.
 *
 * Each row is both a comparison a reader wants and a crawlable edge into the
 * level below, which is what keeps 34,000 pages from being orphans without
 * hand-maintaining link lists anywhere.
 *
 * A row for a leaf that is not open yet is still a row. It keeps the state,
 * the jobs and the median — the comparison is the point of the table — and
 * simply is not a link. Linking a `noindex` page gets it crawled and not
 * indexed, which spends the crawl budget the wave was protecting; `SalaryCell`
 * is where that stops being possible to get wrong in one table and right in
 * the other.
 */

function SalaryCell({
  occupation,
  state,
  label,
  locale = 'en-US',
}: {
  occupation: OewsOccupation;
  state: StateCode;
  label: string;
  locale?: Locale;
}) {
  if (!salaryLeafIsOpen(occupation)) return <>{label}</>;
  const href = locale === 'es-US'
    ? salaryOccupationInStatePathEs(occupation, state)
    : salaryOccupationInStatePath(occupation, state);
  return <Link href={href}>{label}</Link>;
}

export function StatesForOccupationTable({
  occupation,
  rows,
  highlight,
  locale = 'en-US',
}: {
  occupation: OewsOccupation;
  rows: Array<{ state: StateCode; estimate: OewsEstimate }>;
  highlight?: StateCode;
  locale?: Locale;
}) {
  const ranked = [...rows].sort((left, right) => (right.estimate.annual.median ?? 0) - (left.estimate.annual.median ?? 0));
  const money = (value: number) => locale === 'es-US' ? formatMoneyLocale(locale, value, 0) : formatMoney(value, 0);
  const num = (value: number, options?: Intl.NumberFormatOptions) => locale === 'es-US' ? formatNumberLocale(locale, value, options) : formatNumber(value, options);
  const unpublished = wageUi('unpublished', locale);
  const caption = locale === 'es-US'
    ? `Dónde se paga más a ${occupationPluralEs(occupation)}, por mediana estatal`
    : `Where ${occupationPlural(occupation)} are paid most, by state median`;
  return (
    <div className="rank-table-wrap">
      <table className="rank-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{wageUi('state', locale)}</th>
            <th scope="col">{wageUi('jobs', locale)}</th>
            <th scope="col">{wageUi('medianAYear', locale)}</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map(({ state, estimate }) => (
            <tr className={state === highlight ? 'is-home' : undefined} key={state}>
              <th scope="row">
                <SalaryCell occupation={occupation} state={state} label={locale === 'es-US' ? getStateNameEs(state) : getStateName(state)} locale={locale} />
                {estimate.locationQuotient !== null && (
                  <small>{`${wageUi('concentration', locale)} ${num(estimate.locationQuotient, { maximumFractionDigits: 2 })}`}</small>
                )}
              </th>
              <td>{estimate.employment === null ? unpublished : num(estimate.employment)}</td>
              <td>{estimate.annual.median === null ? unpublished : money(estimate.annual.median)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OccupationsInStateTable({
  caption,
  state,
  rows,
  secondaryColumn,
  locale = 'en-US',
}: {
  caption: string;
  state: StateCode;
  rows: Array<{ occupation: OewsOccupation; estimate: OewsEstimate }>;
  secondaryColumn: 'employment' | 'concentration';
  locale?: Locale;
}) {
  const money = (value: number) => locale === 'es-US' ? formatMoneyLocale(locale, value, 0) : formatMoney(value, 0);
  const num = (value: number, options?: Intl.NumberFormatOptions) => locale === 'es-US' ? formatNumberLocale(locale, value, options) : formatNumber(value, options);
  const unpublished = wageUi('unpublished', locale);
  return (
    <div className="rank-table-wrap">
      <table className="rank-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{wageUi('occupation', locale)}</th>
            <th scope="col">{secondaryColumn === 'employment' ? wageUi('jobs', locale) : wageUi('concentration', locale)}</th>
            <th scope="col">{wageUi('medianAYear', locale)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ occupation, estimate }) => (
            <tr key={occupation.code}>
              <th scope="row">
                <SalaryCell
                  occupation={occupation}
                  state={state}
                  label={locale === 'es-US' ? occupationHeadingEs(occupation) : occupationHeadingName(occupation)}
                  locale={locale}
                />
              </th>
              <td>
                {secondaryColumn === 'employment'
                  ? estimate.employment === null ? unpublished : num(estimate.employment)
                  : estimate.locationQuotient === null ? unpublished : num(estimate.locationQuotient, { maximumFractionDigits: 2 })}
              </td>
              <td>{estimate.annual.median === null ? unpublished : money(estimate.annual.median)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OccupationIndexGrid({ occupations, locale = 'en-US' }: { occupations: OewsOccupation[]; locale?: Locale }) {
  return (
    <div className="related-grid">
      {occupations.map((occupation) => (
        <Link
          className="topic-tool-card"
          href={locale === 'es-US' ? salaryOccupationPathEs(occupation) : salaryOccupationPath(occupation)}
          key={occupation.code}
        >
          <span className="topic-tool-copy">
            <strong>{locale === 'es-US' ? occupationHeadingEs(occupation) : occupationHeadingName(occupation)}</strong>
            <small>{`SOC ${occupation.code}`}</small>
          </span>
        </Link>
      ))}
    </div>
  );
}
