import Link from '@/components/i18n/LocalizedLink';
import { TrackedLinkSurface } from '@/components/analytics/LinkSurface';
import { formatMoney } from '@/lib/calculations/contracts';
import type { Locale } from '@/lib/i18n/locales';
import {
  ANNUAL_SALARIES,
  HOURLY_RATES,
  hourlyToSlug,
  salaryToSlug,
} from '@/lib/matrices/wage-matrix-data';

/**
 * The full bracket list, at the foot of the calculator that generates it.
 *
 * A reader arrives at `/money/hourly-to-salary` on a general query, runs one
 * conversion, and is done. The bracket pages below hold far more than the
 * calculator does for the same number: take-home in all fifty states, overtime,
 * what it covers at local prices. The brackets already link to each other, so
 * a reader who reaches one can walk the rest; nothing on the root page said
 * they existed at all, which is where most readers land.
 *
 * It sits below the calculator rather than above it because it is a browse
 * surface, not an answer. Someone who came to convert a number should convert
 * it first; the table is what they scan once they have.
 *
 * English only, deliberately. The bracket pages carry no Spanish alternate, so
 * on `/es/money/...` this would be forty-three invitations to leave the
 * language. The Spanish page keeps the calculator, which is localized.
 */

const HOURLY_COPY = {
  title: 'Every hourly rate, converted',
  lede: 'Each rate below has a page of its own: the yearly and monthly total, take-home pay in all fifty states, overtime at time and a half, and what the wage covers at local prices.',
  rate: 'Hourly rate',
  year: 'A year',
  month: 'A month',
  overtime: 'Time and a half',
  caption: 'Hourly rates with a published conversion page, from $15 to $100 an hour',
} as const;

const SALARY_COPY = {
  title: 'Every salary, after tax',
  lede: 'Each salary below has a page of its own: the paycheck at four frequencies, take-home pay in all fifty states, the filing statuses compared, and the occupations that earn it.',
  salary: 'Salary',
  hourly: 'An hour',
  biweekly: 'Every two weeks',
  month: 'A month',
  caption: 'Annual salaries with a published after-tax page, from $30,000 to $200,000',
} as const;

/** Both directories are English surfaces; a Spanish page renders neither. */
function skip(locale: Locale): boolean {
  return locale === 'es-US';
}

export function HourlyMatrixDirectory({ locale = 'en-US' }: { locale?: Locale }) {
  if (skip(locale)) return null;
  return (
    <TrackedLinkSurface
      surface="matrix-directory"
      className="matrix-directory-section"
      labelledBy="hourly-matrix-title"
    >
      <div className="matrix-directory-header">
        <p className="eyebrow muted"><span /> Every rate</p>
        <h2 id="hourly-matrix-title">{HOURLY_COPY.title}</h2>
        <p className="matrix-directory-lede">{HOURLY_COPY.lede}</p>
      </div>
      <div className="matrix-table-wrap">
        <table className="matrix-table">
          <caption className="sr-only">{HOURLY_COPY.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{HOURLY_COPY.rate}</th>
              <th scope="col">{HOURLY_COPY.year}</th>
              <th scope="col">{HOURLY_COPY.month}</th>
              <th scope="col">{HOURLY_COPY.overtime}</th>
            </tr>
          </thead>
          <tbody>
            {HOURLY_RATES.map((rate) => (
              <tr key={rate}>
                <th scope="row">
                  <Link href={`/money/hourly-to-salary/${hourlyToSlug(rate)}`} data-link-target="hourly-bracket">
                    {`$${rate} an hour`}
                  </Link>
                </th>
                <td><strong>{formatMoney(rate * 2080, 0)}</strong></td>
                <td>{formatMoney((rate * 2080) / 12, 0)}</td>
                <td>{`${formatMoney(rate * 1.5, 2)} an hour`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TrackedLinkSurface>
  );
}

export function SalaryMatrixDirectory({ locale = 'en-US' }: { locale?: Locale }) {
  if (skip(locale)) return null;
  return (
    <TrackedLinkSurface
      surface="matrix-directory"
      className="matrix-directory-section"
      labelledBy="salary-matrix-title"
    >
      <div className="matrix-directory-header">
        <p className="eyebrow muted"><span /> Every salary</p>
        <h2 id="salary-matrix-title">{SALARY_COPY.title}</h2>
        <p className="matrix-directory-lede">{SALARY_COPY.lede}</p>
      </div>
      <div className="matrix-table-wrap">
        <table className="matrix-table">
          <caption className="sr-only">{SALARY_COPY.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{SALARY_COPY.salary}</th>
              <th scope="col">{SALARY_COPY.hourly}</th>
              <th scope="col">{SALARY_COPY.biweekly}</th>
              <th scope="col">{SALARY_COPY.month}</th>
            </tr>
          </thead>
          <tbody>
            {ANNUAL_SALARIES.map((salary) => (
              <tr key={salary}>
                <th scope="row">
                  <Link href={`/money/salary-after-tax/${salaryToSlug(salary)}`} data-link-target="salary-bracket">
                    {`${formatMoney(salary, 0)} a year`}
                  </Link>
                </th>
                <td><strong>{`${formatMoney(salary / 2080, 2)}`}</strong></td>
                <td>{formatMoney(salary / 26, 0)}</td>
                <td>{formatMoney(salary / 12, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TrackedLinkSurface>
  );
}
