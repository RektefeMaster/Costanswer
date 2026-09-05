import Link from 'next/link';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { taxesOnWagesLabel, type OccupationWageProfile } from '@/lib/calculations/salary';
import type { CalculationResult } from '@/lib/calculations/contracts';
import { FILING_STATUS_LABELS } from '@/lib/calculations/tax/types';

/**
 * The composed wage answer, rendered on the server.
 *
 * These pages have nothing to interact with — every number is fixed by the
 * release — so they ship no client JavaScript at all. The markup reuses the
 * calculator result classes so a salary page and a calculator result read as
 * the same object, and the folding sections are native `<details>` rather than
 * state.
 */

const PERCENTILE_ROWS = [
  { key: 'p10', label: '10th percentile', note: 'Entry and lowest-paid' },
  { key: 'p25', label: '25th percentile', note: null },
  { key: 'median', label: 'Median', note: 'Half earn more, half less' },
  { key: 'p75', label: '75th percentile', note: null },
  { key: 'p90', label: '90th percentile', note: 'Most experienced and senior' },
] as const;

function annualOrDash(value: number | null, capped: boolean): string {
  if (value !== null) return formatMoney(value, 0);
  return capped ? 'At or above the top code' : 'Not published';
}

function hourlyOrDash(value: number | null, capped: boolean): string {
  if (value !== null) return formatMoney(value);
  return capped ? 'At or above the top code' : 'Not published';
}

export function WagePercentileTable({ profile }: { profile: OccupationWageProfile }) {
  return (
    <div className="rank-table-wrap">
      <table className="rank-table">
        <caption>{`What ${profile.occupation.displayTitle.toLowerCase()} earn in ${profile.areaLabel}, ${profile.referenceLabel}`}</caption>
        <thead>
          <tr>
            <th scope="col">Percentile</th>
            <th scope="col">Annual</th>
            <th scope="col">Hourly</th>
          </tr>
        </thead>
        <tbody>
          {PERCENTILE_ROWS.map((percentile) => (
            <tr className={percentile.key === 'median' ? 'is-home' : undefined} key={percentile.key}>
              <th scope="row">
                {percentile.label}
                {percentile.note && <small>{percentile.note}</small>}
              </th>
              <td>{annualOrDash(profile.wage.annual[percentile.key], profile.wage.atOrAboveWageCap)}</td>
              <td>{hourlyOrDash(profile.wage.hourly[percentile.key], profile.wage.atOrAboveWageCap)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Mean<small>The average, pulled up by the top</small></th>
            <td>{annualOrDash(profile.wage.annualMean, profile.wage.atOrAboveWageCap)}</td>
            <td>{hourlyOrDash(profile.wage.hourlyMean, profile.wage.atOrAboveWageCap)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function headlineWage(profile: OccupationWageProfile): { label: string; value: string; note: string } {
  if (profile.wage.annualMedian !== null) {
    return {
      label: `Median pay · ${profile.areaLabel}`,
      value: formatMoney(profile.wage.annualMedian, 0),
      note: profile.wage.hourlyMedian === null
        ? 'A year. BLS publishes no hourly wage for this occupation.'
        : `A year, or ${formatMoney(profile.wage.hourlyMedian)} an hour.`,
    };
  }
  if (profile.wage.hourlyMedian !== null) {
    return {
      label: `Median pay · ${profile.areaLabel}`,
      value: `${formatMoney(profile.wage.hourlyMedian)}/hr`,
      note: 'BLS publishes only an hourly wage for this occupation.',
    };
  }
  return { label: `Median pay · ${profile.areaLabel}`, value: 'Not published', note: 'BLS withheld this estimate.' };
}

export function WageStatGrid({ profile }: { profile: OccupationWageProfile }) {
  const items: Array<{ label: string; value: string; note?: string }> = [];
  if (profile.takeHome) {
    items.push({
      label: 'Take-home a month',
      value: formatMoney(profile.takeHome.monthly, 0),
      note: `After ${taxesOnWagesLabel(profile.takeHome)} at ${formatNumber(profile.takeHome.effectiveTaxRate, { style: 'percent', maximumFractionDigits: 1 })}`,
    });
  }
  if (profile.costAdjusted) {
    items.push({
      label: 'Worth at national prices',
      value: formatMoney(profile.costAdjusted.adjustedAnnualMedian, 0),
      note: `Prices here sit at ${formatNumber(profile.costAdjusted.allItemsRpp, { maximumFractionDigits: 1 })} against 100`,
    });
  }
  if (profile.versusNation) {
    const direction = profile.versusNation.differencePercent >= 0 ? 'above' : 'below';
    items.push({
      label: 'Against the nation',
      value: `${formatNumber(Math.abs(profile.versusNation.differencePercent), { maximumFractionDigits: 1 })}% ${direction}`,
      note: `National median ${formatMoney(profile.versusNation.nationalAnnualMedian, 0)}`,
    });
  }
  if (items.length < 3 && profile.employment.total !== null) {
    items.push({
      label: 'Jobs counted',
      value: formatNumber(profile.employment.total),
      note: profile.employment.locationQuotient === null
        ? 'Wage and salary jobs'
        : `Concentration ${formatNumber(profile.employment.locationQuotient, { maximumFractionDigits: 2 })} against 1.00`,
    });
  }
  if (items.length === 0) return null;
  return (
    <div className="result-stat-grid">
      {items.slice(0, 3).map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.note && <small>{item.note}</small>}
        </div>
      ))}
    </div>
  );
}

export function WageResultDetails({ result }: { result: CalculationResult<OccupationWageProfile> }) {
  return (
    <div className="result-details">
      <details open>
        <summary>How we got this</summary>
        <ol>
          {result.breakdown.map((step, index) => (
            <li key={`${index}-${step.label}`}>
              <span><strong>{step.label}</strong>{step.detail && <small>{step.detail}</small>}</span>
              <b>{step.value}</b>
            </li>
          ))}
        </ol>
      </details>
      <details>
        <summary>What we assumed</summary>
        <ul>{result.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
      </details>
      <details className="result-audit-details">
        <summary>Technical details</summary>
        <p className="result-audit">
          <span>Method {result.calculationVersion}</span>
          <span>Data {result.datasetSnapshotIds.join(', ')}</span>
        </p>
      </details>
    </div>
  );
}

export function WagePanel({
  result,
  tone = 'mint',
  footnote,
}: {
  result: CalculationResult<OccupationWageProfile>;
  tone?: 'mint' | 'amber' | 'blue' | 'violet';
  footnote?: string;
}) {
  const profile = result.value;
  const headline = headlineWage(profile);
  return (
    <section className="calculator-panel" aria-label={`${profile.occupation.displayTitle} pay in ${profile.areaLabel}`}>
      <div className="calculation-output">
        <div className={`primary-result result-${tone}`}>
          <p>{headline.label}</p>
          <strong>{headline.value}</strong>
          <span>{headline.note}</span>
        </div>
        <WageStatGrid profile={profile} />
        <WagePercentileTable profile={profile} />
        {footnote && <p className="data-footnote">{footnote}</p>}
        <WageResultDetails result={result} />
      </div>
    </section>
  );
}

export function TakeHomeSection({ profile }: { profile: OccupationWageProfile }) {
  if (!profile.takeHome) return null;
  const takeHome = profile.takeHome;
  return (
    <section className="engine-notes" aria-labelledby="take-home-title">
      <h2 id="take-home-title">What lands in the bank</h2>
      <p className="engine-notes-lede">
        {`A ${formatMoney(takeHome.grossAnnual, 0)} salary in ${profile.areaLabel}, for one ${FILING_STATUS_LABELS[takeHome.filingStatus].toLowerCase()} filer taking the standard deduction in ${takeHome.taxYear}.`}
      </p>
      <ul>
        <li><strong>Federal income tax.</strong> {formatMoney(takeHome.federalIncomeTax, 0)} a year.</li>
        <li>
          <strong>State income tax.</strong>{' '}
          {takeHome.stateTaxStatus === 'unsupported'
            ? `Not modelled for ${profile.areaLabel}, so this figure covers federal and FICA only.`
            : takeHome.stateIncomeTax === 0
              ? `${profile.areaLabel} levies no state income tax on wages.`
              : `${formatMoney(takeHome.stateIncomeTax, 0)} a year.`}
        </li>
        <li><strong>Social Security and Medicare.</strong> {formatMoney(takeHome.fica, 0)} a year.</li>
        <li>
          <strong>Left over.</strong> {formatMoney(takeHome.annual, 0)} a year, {formatMoney(takeHome.monthly, 0)} a month —
          an effective rate of {formatNumber(takeHome.effectiveTaxRate, { style: 'percent', maximumFractionDigits: 1 })}.
        </li>
      </ul>
      <p className="engine-notes-lede">
        <Link href="/money/salary-after-tax">Run your own salary and filing status →</Link>
      </p>
    </section>
  );
}

export function WageSources({ profile }: { profile: OccupationWageProfile }) {
  const sources = [
    {
      name: 'BLS Occupational Employment and Wage Statistics',
      detail: `${profile.referenceLabel} estimates, cross-industry, wage and salary workers`,
      href: 'https://www.bls.gov/oes/',
      dateLabel: profile.referenceLabel,
    },
  ];
  if (profile.takeHome) {
    sources.push({
      name: 'IRS and state revenue departments',
      detail: `${profile.takeHome.taxYear} federal brackets, standard deduction, FICA and state schedules`,
      href: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf',
      dateLabel: String(profile.takeHome.taxYear),
    });
  }
  if (profile.costAdjusted) {
    sources.push({
      name: 'BEA Regional Price Parities',
      detail: `Price level of ${profile.areaLabel} against a national 100`,
      href: 'https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area',
      dateLabel: String(profile.costAdjusted.referenceYear),
    });
  }
  if (profile.versusHousehold) {
    sources.push({
      name: 'Census American Community Survey',
      detail: `Median household income, ${profile.versusHousehold.surveyYears} 5-year estimates`,
      href: 'https://www.census.gov/programs-surveys/acs',
      dateLabel: profile.versusHousehold.surveyYears,
    });
  }
  return (
    <section className="sources-section" aria-labelledby="sources-title">
      <div>
        <p className="eyebrow muted"><span /> Sources</p>
        <h2 id="sources-title">Where this data comes from</h2>
      </div>
      <div className="source-list">
        {sources.map((source) => (
          <a href={source.href} key={source.name} target="_blank" rel="noreferrer">
            <span><strong>{source.name}</strong><small>{source.detail}</small></span>
            <span>{source.dateLabel} ↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}
