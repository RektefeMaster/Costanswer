import Link from 'next/link';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import type { OewsEstimate, OewsOccupation } from '@/lib/data/bls-oews';
import { getStateName, type StateCode } from '@/lib/location/states';
import { salaryOccupationInStatePath, salaryOccupationPath } from '@/lib/salary-pages';
import { occupationHeadingName, occupationPlural } from '@/lib/salary-content';

/**
 * The tables that are also the link graph.
 *
 * Each row is both a comparison a reader wants and a crawlable edge into the
 * level below, which is what keeps 34,000 pages from being orphans without
 * hand-maintaining link lists anywhere.
 */

export function StatesForOccupationTable({
  occupation,
  rows,
  highlight,
}: {
  occupation: OewsOccupation;
  rows: Array<{ state: StateCode; estimate: OewsEstimate }>;
  highlight?: StateCode;
}) {
  const ranked = [...rows].sort((left, right) => (right.estimate.annual.median ?? 0) - (left.estimate.annual.median ?? 0));
  return (
    <div className="rank-table-wrap">
      <table className="rank-table">
        <caption>{`Where ${occupationPlural(occupation)} are paid most, by state median`}</caption>
        <thead>
          <tr>
            <th scope="col">State</th>
            <th scope="col">Jobs</th>
            <th scope="col">Median a year</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map(({ state, estimate }) => (
            <tr className={state === highlight ? 'is-home' : undefined} key={state}>
              <th scope="row">
                <Link href={salaryOccupationInStatePath(occupation, state)}>{getStateName(state)}</Link>
                {estimate.locationQuotient !== null && (
                  <small>{`Concentration ${formatNumber(estimate.locationQuotient, { maximumFractionDigits: 2 })}`}</small>
                )}
              </th>
              <td>{estimate.employment === null ? 'Not published' : formatNumber(estimate.employment)}</td>
              <td>{estimate.annual.median === null ? 'Not published' : formatMoney(estimate.annual.median, 0)}</td>
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
}: {
  caption: string;
  state: StateCode;
  rows: Array<{ occupation: OewsOccupation; estimate: OewsEstimate }>;
  secondaryColumn: 'employment' | 'concentration';
}) {
  return (
    <div className="rank-table-wrap">
      <table className="rank-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Occupation</th>
            <th scope="col">{secondaryColumn === 'employment' ? 'Jobs' : 'Concentration'}</th>
            <th scope="col">Median a year</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ occupation, estimate }) => (
            <tr key={occupation.code}>
              <th scope="row">
                <Link href={salaryOccupationInStatePath(occupation, state)}>{occupationHeadingName(occupation)}</Link>
              </th>
              <td>
                {secondaryColumn === 'employment'
                  ? estimate.employment === null ? 'Not published' : formatNumber(estimate.employment)
                  : estimate.locationQuotient === null ? 'Not published' : formatNumber(estimate.locationQuotient, { maximumFractionDigits: 2 })}
              </td>
              <td>{estimate.annual.median === null ? 'Not published' : formatMoney(estimate.annual.median, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OccupationIndexGrid({ occupations }: { occupations: OewsOccupation[] }) {
  return (
    <div className="related-grid">
      {occupations.map((occupation) => (
        <Link className="topic-tool-card" href={salaryOccupationPath(occupation)} key={occupation.code}>
          <span className="topic-tool-copy">
            <strong>{occupationHeadingName(occupation)}</strong>
            <small>{`SOC ${occupation.code}`}</small>
          </span>
        </Link>
      ))}
    </div>
  );
}
