import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { AdSlot } from '@/components/monetization/AdSlot';
import { StatesForOccupationTable } from '@/components/salary/SalaryTables';
import { OccupationNames, SalaryQuestions } from '@/components/salary/SalaryQuestions';
import { TakeHomeSection, WagePanel, WageSources } from '@/components/salary/WageProfile';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { occupationWageProfile, taxesOnWagesLabel } from '@/lib/calculations/salary';
import { getOewsEstimate } from '@/lib/data/bls-oews-snapshot';
import { getStateName } from '@/lib/location/states';
import {
  isSalaryLevelIndexable,
  salaryFamilyPath,
  salaryOccupationFromSlug,
  salaryOccupationPath,
  salaryOccupationInStatePath,
  salaryStatePath,
  stateFromSlug,
  statesWithWageFor,
} from '@/lib/salary-pages';
import {
  indefiniteArticle,
  occupationHeadingName,
  occupationJsonLd,
  occupationPlural,
  occupationSingular,
  salaryQuestions,
} from '@/lib/salary-content';
import { breadcrumbJsonLd, faqPageJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

/**
 * One occupation's pay in one state.
 *
 * There are 33,369 of these, past the 20,000-file ceiling on static assets, so
 * they are rendered on demand rather than prerendered. That costs nothing at
 * scale: every figure comes from data already inside the Worker, the page ships
 * no client JavaScript, and the response is cached at the edge until the next
 * annual release.
 */

type Params = { occupation: string; state: string };

function resolve(params: Params) {
  const occupation = salaryOccupationFromSlug(params.occupation);
  const state = stateFromSlug(params.state);
  if (!occupation || !state) return null;
  const result = occupationWageProfile({ area: state, occupationCode: occupation.code });
  if (!result) return null;
  return { occupation, state, result };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolved = resolve(await params);
  if (!resolved) return {};
  const { occupation, state, result } = resolved;
  const profile = result.value;
  const stateName = getStateName(state);
  const median = profile.wage.annualMedian;
  const heading = occupationHeadingName(occupation);
  const singular = occupationSingular(occupation);
  const title = `${heading} Salary in ${stateName}`;
  const description = median === null
    ? `What ${occupation.displayTitle.toLowerCase()} earn in ${stateName}, from the BLS ${profile.referenceLabel} wage survey, with pay by percentile and take-home after tax.`
    : `${indefiniteArticle(singular) === 'a' ? 'A' : 'An'} ${singular} in ${stateName} earns a median of ${formatMoney(median, 0)} a year${profile.takeHome ? `, about ${formatMoney(profile.takeHome.monthly, 0)} a month after tax` : ''}. BLS ${profile.referenceLabel} pay by percentile, plus what it buys locally.`;
  return pageMetadata(title, description, salaryOccupationInStatePath(occupation, state), {
    index: isSalaryLevelIndexable('occupationInState'),
    follow: true,
  });
}

export default async function OccupationInStatePage({ params }: { params: Promise<Params> }) {
  const resolved = resolve(await params);
  if (!resolved) notFound();
  const { occupation, state, result } = resolved;
  const profile = result.value;
  const stateName = getStateName(state);
  const path = salaryOccupationInStatePath(occupation, state);

  const peers = statesWithWageFor(occupation)
    .map((peer) => ({ peer, estimate: getOewsEstimate(peer, occupation.code) }))
    .filter((row): row is { peer: typeof state; estimate: NonNullable<typeof row.estimate> } => Boolean(row.estimate))
    .map(({ peer, estimate }) => ({ state: peer, estimate }));

  const heading = occupationHeadingName(occupation);
  const questions = salaryQuestions(profile);
  const breadcrumbs = [
    { name: siteConfig.name, path: '/' },
    { name: 'Salaries', path: salaryFamilyPath() },
    { name: occupation.displayTitle, path: salaryOccupationPath(occupation) },
    { name: stateName, path },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(breadcrumbs),
          occupationJsonLd(profile, new URL(path, siteConfig.origin).toString()),
          ...(questions.length > 0 ? [faqPageJsonLd(questions, path)] : []),
        ]}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <header className="tool-hero accent-mint">
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
              <p className="eyebrow"><span /> {`${stateName} · BLS ${profile.referenceLabel}`}</p>
              <h1>{`${heading} Salary in ${stateName}`}</h1>
            </div>
            <div className="tool-intro">
              <OccupationNames profile={profile} />
              <p>
                {profile.employment.total === null
                  ? `What the Bureau of Labor Statistics measured for this occupation in ${stateName}, by percentile, with what the median leaves after tax.`
                  : `The Bureau of Labor Statistics counted ${formatNumber(profile.employment.total)} ${occupation.displayTitle.toLowerCase()} working in ${stateName}. Here is what they are paid, what the median leaves after ${taxesOnWagesLabel(profile.takeHome)}, and what that is worth against local prices.`}
              </p>
            </div>
          </div>
        </header>

        <div className="ad-leaderboard-wrap">
          <AdSlot placement="header-leaderboard" />
        </div>

        <div className="tool-workspace">
          <div className="tool-main-column">
            <WagePanel result={result} />
            <AdSlot placement="in-content" />
            <TakeHomeSection profile={profile} />
            {profile.costAdjusted && profile.wage.annualMedian !== null && (
              <section className="engine-notes" aria-labelledby="cost-title">
                <h2 id="cost-title">{`What ${formatMoney(profile.wage.annualMedian, 0)} is worth in ${stateName}`}</h2>
                <p className="engine-notes-lede">
                  {`Prices in ${stateName} sit at ${formatNumber(profile.costAdjusted.allItemsRpp, { maximumFractionDigits: 1 })} against a national average of 100, so ${formatMoney(profile.wage.annualMedian, 0)} earned here buys what ${formatMoney(profile.costAdjusted.adjustedAnnualMedian, 0)} buys at national average prices.`}
                </p>
                <ul>
                  {profile.costAdjusted.housingRentsRpp !== null && (
                    <li>
                      <strong>Rents.</strong>{' '}
                      {`${formatNumber(profile.costAdjusted.housingRentsRpp, { maximumFractionDigits: 1 })} against 100, the component that moves most between states.`}
                    </li>
                  )}
                  {profile.versusHousehold && (
                    <li>
                      <strong>Against local households.</strong>{' '}
                      {`The median household in ${stateName} takes in ${formatMoney(profile.versusHousehold.medianHouseholdIncome, 0)}, so this occupation's median is ${formatNumber(profile.versusHousehold.ratio, { maximumFractionDigits: 2 })} times that, on one income.`}
                    </li>
                  )}
                  {profile.employment.concentrationVsNationPercent !== null && (
                    <li>
                      <strong>How common the job is here.</strong>{' '}
                      {profile.employment.concentrationVsNationPercent === 0
                        ? `As concentrated in ${stateName} as it is nationally.`
                        : `${formatNumber(Math.abs(profile.employment.concentrationVsNationPercent), { maximumFractionDigits: 0 })}% ${profile.employment.concentrationVsNationPercent > 0 ? 'more' : 'less'} concentrated in ${stateName} than in the country as a whole.`}
                    </li>
                  )}
                </ul>
                <p className="engine-notes-lede">
                  <Link href="/money/cost-of-living">Compare two places properly →</Link>
                </p>
              </section>
            )}

            <section className="related-section" aria-labelledby="states-title">
              <p className="eyebrow muted"><span /> Every state</p>
              <h2 id="states-title">{`Which state pays ${occupationPlural(occupation)} the most?`}</h2>
              <StatesForOccupationTable occupation={occupation} rows={peers} highlight={state} />
            </section>

            <SalaryQuestions profile={profile} />
          </div>
          <aside className="tool-rail" aria-label="About this page">
            <div className="rail-card">
              <p className="rail-kicker">Note</p>
              <h2>These are survey estimates, not offers.</h2>
              <p>
                {`OEWS asks employers what they pay, once a year. It is the best public measure of a job's pay in a place, and it is not a quote for any particular role. Figures here are ${profile.referenceLabel}.`}
              </p>
            </div>
            <div className="rail-card">
              <p className="rail-kicker">Next</p>
              <h2>{`Other work in ${stateName}`}</h2>
              <p><Link href={salaryStatePath(state)}>{`See what every occupation pays in ${stateName} →`}</Link></p>
              <p><Link href={salaryOccupationPath(occupation)}>{`${heading} pay nationally →`}</Link></p>
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
