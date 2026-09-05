import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { AdSlot } from '@/components/monetization/AdSlot';
import { OccupationsInStateTable } from '@/components/salary/SalaryTables';
import { WagePanel, WageSources } from '@/components/salary/WageProfile';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { occupationWageProfile, taxesOnWagesLabel } from '@/lib/calculations/salary';
import { getOewsEstimatesForArea, getOewsOccupation } from '@/lib/data/bls-oews-snapshot';
import type { OewsEstimate, OewsOccupation } from '@/lib/data/bls-oews';
import { getStateName, STATE_CODES } from '@/lib/location/states';
import {
  isSalaryLevelIndexable,
  salaryFamilyPath,
  salaryStateIndexPath,
  salaryStatePath,
  stateFromSlug,
  stateSlug,
} from '@/lib/salary-pages';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

/** What work pays in one state, and the doorway into every occupation there. */

const BIGGEST_OCCUPATION_ROWS = 40;
const BEST_PAID_OCCUPATION_ROWS = 25;

export function generateStaticParams() {
  return STATE_CODES.map((state) => ({ state: stateSlug(state) }));
}

type Row = { occupation: OewsOccupation; estimate: OewsEstimate };

function pageWorthyRows(state: (typeof STATE_CODES)[number]): Row[] {
  const rows: Row[] = [];
  for (const estimate of getOewsEstimatesForArea(state)) {
    const occupation = getOewsOccupation(estimate.occCode);
    if (!occupation || occupation.group !== 'detailed') continue;
    if (estimate.employment === null || estimate.annual.median === null) continue;
    rows.push({ occupation, estimate });
  }
  return rows;
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: slug } = await params;
  const state = stateFromSlug(slug);
  if (!state) return {};
  const result = occupationWageProfile({ area: state, occupationCode: '00-0000' });
  if (!result) return {};
  const name = getStateName(state);
  const median = result.value.wage.annualMedian;
  return pageMetadata(
    `Salaries in ${name}`,
    median === null
      ? `What jobs pay in ${name}, from the BLS ${result.value.referenceLabel} wage survey, with take-home after ${name} tax.`
      : `The median job in ${name} pays ${formatMoney(median, 0)} a year. BLS ${result.value.referenceLabel} wages for every occupation, with take-home after ${name} tax and local price levels.`,
    salaryStatePath(state),
    { index: isSalaryLevelIndexable('stateHub'), follow: true },
  );
}

export default async function StateSalaryPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: slug } = await params;
  const state = stateFromSlug(slug);
  if (!state) notFound();
  const result = occupationWageProfile({ area: state, occupationCode: '00-0000' });
  if (!result) notFound();
  const profile = result.value;
  const name = getStateName(state);

  const rows = pageWorthyRows(state);
  const biggest = [...rows].sort((left, right) => (right.estimate.employment ?? 0) - (left.estimate.employment ?? 0)).slice(0, BIGGEST_OCCUPATION_ROWS);
  const bestPaid = [...rows].sort((left, right) => (right.estimate.annual.median ?? 0) - (left.estimate.annual.median ?? 0)).slice(0, BEST_PAID_OCCUPATION_ROWS);
  const mostConcentrated = [...rows]
    .filter((row) => row.estimate.locationQuotient !== null && (row.estimate.employment ?? 0) >= 1_000)
    .sort((left, right) => (right.estimate.locationQuotient ?? 0) - (left.estimate.locationQuotient ?? 0))
    .slice(0, 10);

  const breadcrumbs = [
    { name: siteConfig.name, path: '/' },
    { name: 'Salaries', path: salaryFamilyPath() },
    { name: 'States', path: salaryStateIndexPath() },
    { name, path: salaryStatePath(state) },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <header className="tool-hero accent-blue">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((item, index) => (
              <span key={item.path}>
                {index > 0 && <b aria-hidden="true">/</b>}
                {index === breadcrumbs.length - 1
                  ? <span aria-current="page">{item.name}</span>
                  : <Link href={item.path}>{item.name}</Link>}
              </span>
            ))}
          </nav>
          <div className="tool-hero-grid">
            <div>
              <p className="eyebrow"><span /> {`${name} · BLS ${profile.referenceLabel}`}</p>
              <h1>{`Salaries in ${name}`}</h1>
            </div>
            <div className="tool-intro">
              <p>
                {`Wages for ${formatNumber(rows.length)} occupations the Bureau of Labor Statistics measured in ${name}, each with what the median leaves after ${taxesOnWagesLabel(profile.takeHome)} and what it buys at local prices.`}
              </p>
            </div>
          </div>
        </header>

        <div className="ad-leaderboard-wrap">
          <AdSlot placement="header-leaderboard" />
        </div>

        <div className="tool-workspace">
          <div className="tool-main-column">
            <WagePanel
              result={result}
              tone="blue"
              footnote={`All occupations combined. Individual occupations vary far more than this figure suggests. The tables below show the spread.`}
            />
            <AdSlot placement="in-content" />

            <section className="related-section" aria-labelledby="biggest-title">
              <p className="eyebrow muted"><span /> Where people work</p>
              <h2 id="biggest-title">{`The most common jobs in ${name}`}</h2>
              <OccupationsInStateTable
                caption={`Occupations by number of jobs in ${name}`}
                state={state}
                rows={biggest}
                secondaryColumn="employment"
              />
            </section>

            <section className="related-section" aria-labelledby="best-paid-title">
              <p className="eyebrow muted"><span /> Where the money is</p>
              <h2 id="best-paid-title">{`The best-paid jobs in ${name}`}</h2>
              <OccupationsInStateTable
                caption={`Occupations by median annual wage in ${name}`}
                state={state}
                rows={bestPaid}
                secondaryColumn="employment"
              />
            </section>

            {mostConcentrated.length > 0 && (
              <section className="related-section" aria-labelledby="concentrated-title">
                <p className="eyebrow muted"><span /> What is distinctive here</p>
                <h2 id="concentrated-title">{`Jobs more concentrated in ${name} than anywhere`}</h2>
                <p className="related-lede">
                  {`A concentration above 1.00 means the occupation makes up a larger share of ${name}'s jobs than of the country's. These are the industries the state is built on.`}
                </p>
                <OccupationsInStateTable
                  caption={`Occupations by concentration against the national share, ${name}`}
                  state={state}
                  rows={mostConcentrated}
                  secondaryColumn="concentration"
                />
              </section>
            )}
          </div>
          <aside className="tool-rail" aria-label="About this page">
            <div className="rail-card">
              <p className="rail-kicker">Note</p>
              <h2>These are survey estimates, not offers.</h2>
              <p>{`OEWS asks employers what they pay, once a year. Figures here are ${profile.referenceLabel}, and cover wage and salary workers only.`}</p>
            </div>
            {profile.costAdjusted && (
              <div className="rail-card">
                <p className="rail-kicker">Prices</p>
                <h2>{`${name} sits at ${formatNumber(profile.costAdjusted.allItemsRpp, { maximumFractionDigits: 1 })} against 100`}</h2>
                <p>
                  {profile.costAdjusted.housingRentsRpp === null
                    ? 'The national average price level is 100.'
                    : `Rents alone sit at ${formatNumber(profile.costAdjusted.housingRentsRpp, { maximumFractionDigits: 1 })}. `}
                  <Link href="/money/cost-of-living">Compare two places →</Link>
                </p>
              </div>
            )}
            <div className="rail-card">
              <p className="rail-kicker">Next</p>
              <h2>Every state</h2>
              <p><Link href={salaryStateIndexPath()}>Salaries by state →</Link></p>
              <p><Link href="/money/salary-after-tax">{`Take-home pay in ${name} →`}</Link></p>
            </div>
            <AdSlot placement="desktop-rail" />
          </aside>
        </div>

        <WageSources profile={profile} />
      </main>
      <SiteFooter />
    </>
  );
}
