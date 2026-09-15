import Link from '@/components/i18n/LocalizedLink';
import { TrackedLinkSurface } from '@/components/analytics/LinkSurface';
import { calculateSalaryAfterTax } from '@/lib/calculations/salary-after-tax';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import type { StateCode } from '@/lib/location/states';
import { hourlyToSlug, salaryToSlug } from '@/lib/matrices/wage-matrix-data';

/**
 * What the common salary brackets leave after one state's taxes.
 *
 * A state hub answers "what do jobs pay in Texas" and then stops. The question
 * underneath it is always "and what of that do I keep here", which is the one
 * question the occupation tables cannot answer and the bracket pages can. This
 * block computes the answer on the page, so the reader gets the figure before
 * deciding whether to click, and the link goes to the page that expands it.
 *
 * Showing the number first is the point. A row of bare links asks the reader to
 * guess which one is worth opening; a row that already says what $75,000 leaves
 * in this state gives them a reason.
 *
 * English only. The bracket pages have no Spanish alternate, so the Spanish
 * state hub takes the localized `SalaryNextSteps` block instead.
 */

/** Round numbers people search for, not a sample of the wage distribution. */
const SALARY_BENCHMARKS = [50_000, 75_000, 100_000, 150_000] as const;
const HOURLY_BENCHMARKS = [20, 30, 50] as const;

const FULL_TIME_HOURS = 2080;

export function StateEconomicCluster({
  state,
  stateName,
  medianWage,
}: {
  state: StateCode;
  stateName: string;
  /** The all-occupations median the hub already shows, when BLS published one. */
  medianWage?: number | null;
}) {
  const rows = SALARY_BENCHMARKS.map((gross) => {
    const { value } = calculateSalaryAfterTax({
      annualGrossSalary: gross,
      state,
      filingStatus: 'single',
      taxYear: 2026,
      dependents: 0,
    });
    return {
      gross,
      annualNet: value.annualTakeHome,
      monthlyNet: value.monthlyTakeHome,
      effectiveRate: value.effectiveTaxRate,
      stateTax: value.stateIncomeTax,
      slug: salaryToSlug(gross),
    };
  });

  /*
   * Phrased off the computed figure, the way `taxesOnWagesLabel` does it. A
   * zero state line is not the same claim as "this state has no income tax":
   * North Dakota levies one and still leaves several brackets at zero, and
   * tests/salary-editorial-regressions guards exactly that confusion.
   */
  const taxesApplied = rows.some((row) => row.stateTax > 0)
    ? `2026 federal tax, FICA and ${stateName} income tax`
    : '2026 federal tax and FICA';

  return (
    <TrackedLinkSurface surface="state-cluster" className="related-section" labelledBy="state-cluster-title">
      <p className="eyebrow muted"><span /> What you keep</p>
      <h2 id="state-cluster-title">{`Take-home pay on a ${stateName} salary`}</h2>
      <p className="related-lede">
        {medianWage
          ? `The median wage across all occupations in ${stateName} is ${formatMoney(medianWage, 0)}. These are the brackets either side of it, after ${taxesApplied}, for a single filer taking the standard deduction.`
          : `Common salary brackets after ${taxesApplied}, for a single filer taking the standard deduction.`}
      </p>

      <div className="matrix-table-wrap">
        <table className="matrix-table">
          <caption className="sr-only">{`Take-home pay by salary bracket in ${stateName}, 2026, single filer`}</caption>
          <thead>
            <tr>
              <th scope="col">Salary</th>
              <th scope="col">Take-home a month</th>
              <th scope="col">Take-home a year</th>
              <th scope="col">Goes to tax</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.gross}>
                <th scope="row">
                  <Link href={`/money/salary-after-tax/${row.slug}`} data-link-target="state-salary-bracket">
                    {`${formatMoney(row.gross, 0)} a year`}
                  </Link>
                </th>
                <td><strong>{formatMoney(row.monthlyNet, 0)}</strong></td>
                <td>{formatMoney(row.annualNet, 0)}</td>
                <td>{`${formatNumber(row.effectiveRate * 100, { maximumFractionDigits: 1 })}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="state-cluster-subhead">{`Paid by the hour in ${stateName}`}</h3>
      <div className="state-cluster-hourly-pills">
        {HOURLY_BENCHMARKS.map((rate) => (
          <Link
            key={rate}
            href={`/money/hourly-to-salary/${hourlyToSlug(rate)}`}
            className="state-cluster-pill"
            data-link-target="state-hourly-bracket"
          >
            <span>{`$${rate} an hour`}</span>
            <strong>{`${formatMoney(rate * FULL_TIME_HOURS, 0)} a year`}</strong>
          </Link>
        ))}
      </div>

      <div className="state-cluster-tools">
        <Link href="/money/cost-of-living" className="salary-step-card" data-link-target="prices">
          <div className="salary-step-card-content">
            <span className="salary-step-badge">Local prices</span>
            <strong className="salary-step-title">{`What a salary is worth in ${stateName}`}</strong>
            <span className="salary-step-note">Rent, groceries and the local price level against the national average.</span>
          </div>
          <span className="salary-step-arrow" aria-hidden="true">→</span>
        </Link>
        <Link href="/money/home-affordability" className="salary-step-card" data-link-target="housing">
          <div className="salary-step-card-content">
            <span className="salary-step-badge">Housing</span>
            <strong className="salary-step-title">What those salaries buy at today’s rates</strong>
            <span className="salary-step-note">Price range, down payment and the monthly payment behind it.</span>
          </div>
          <span className="salary-step-arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </TrackedLinkSurface>
  );
}
