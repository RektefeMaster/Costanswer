import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { AdSlot } from '@/components/monetization/AdSlot';
import { StatesForOccupationTable } from '@/components/salary/SalaryTables';
import { OccupationNames, SalaryQuestions } from '@/components/salary/SalaryQuestions';
import { WagePanel, WageSources } from '@/components/salary/WageProfile';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { occupationWageProfile } from '@/lib/calculations/salary';
import { getOewsEstimate } from '@/lib/data/bls-oews-snapshot';
import { getStateName, type StateCode } from '@/lib/location/states';
import {
  isSalaryLevelIndexable,
  nationalSalaryOccupations,
  salaryFamilyPath,
  salaryOccupationFromSlug,
  salaryOccupationInStatePath,
  salaryOccupationPath,
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

/** One occupation, nationally, and the doorway to all 51 state pages under it. */

export function generateStaticParams() {
  return nationalSalaryOccupations().map((occupation) => ({ occupation: occupation.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ occupation: string }> }): Promise<Metadata> {
  const { occupation: slug } = await params;
  const occupation = salaryOccupationFromSlug(slug);
  if (!occupation) return {};
  const result = occupationWageProfile({ area: 'US', occupationCode: occupation.code });
  if (!result) return {};
  const profile = result.value;
  const median = profile.wage.annualMedian;
  const heading = occupationHeadingName(occupation);
  const singular = occupationSingular(occupation);
  const title = `${heading} Salary: How Much Do They Make?`;
  const description = median === null
    ? `What ${occupation.displayTitle.toLowerCase()} earn across the United States, from the BLS ${profile.referenceLabel} wage survey, with pay by percentile and by state.`
    : `${indefiniteArticle(singular) === 'a' ? 'A' : 'An'} ${singular} earns a median of ${formatMoney(median, 0)} a year in the U.S. BLS ${profile.referenceLabel} pay by percentile, and what the job pays in all 50 states.`;
  return pageMetadata(title, description, salaryOccupationPath(occupation), {
    index: isSalaryLevelIndexable('occupation'),
    follow: true,
  });
}

export default async function OccupationPage({ params }: { params: Promise<{ occupation: string }> }) {
  const { occupation: slug } = await params;
  const occupation = salaryOccupationFromSlug(slug);
  if (!occupation) notFound();
  const result = occupationWageProfile({ area: 'US', occupationCode: occupation.code });
  if (!result) notFound();
  const profile = result.value;

  const rows = statesWithWageFor(occupation)
    .map((state) => ({ state, estimate: getOewsEstimate(state, occupation.code) }))
    .filter((row): row is { state: StateCode; estimate: NonNullable<typeof row.estimate> } => Boolean(row.estimate));
  const ranked = [...rows].sort((left, right) => (right.estimate.annual.median ?? 0) - (left.estimate.annual.median ?? 0));
  const best = ranked[0];
  const worst = ranked.at(-1);

  const heading = occupationHeadingName(occupation);
  const path = salaryOccupationPath(occupation);
  const questions = salaryQuestions(profile);
  const breadcrumbs = [
    { name: siteConfig.name, path: '/' },
    { name: 'Salaries', path: salaryFamilyPath() },
    { name: occupation.displayTitle, path },
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
              <p className="eyebrow"><span /> {`United States · BLS ${profile.referenceLabel}`}</p>
              <h1>{`${heading} Salary`}</h1>
            </div>
            <div className="tool-intro">
              <OccupationNames profile={profile} />
              <p>
                {profile.employment.total === null
                  ? `National pay for this occupation from the Bureau of Labor Statistics wage survey, by percentile and by state.`
                  : `The Bureau of Labor Statistics counted ${formatNumber(profile.employment.total)} ${occupationPlural(occupation)} across the country. Pay varies more by state than most people expect — and the state that pays most is not always the one that leaves most.`}
              </p>
            </div>
          </div>
        </header>

        <div className="ad-leaderboard-wrap">
          <AdSlot placement="header-leaderboard" />
        </div>

        <div className="tool-workspace">
          <div className="tool-main-column">
            <WagePanel result={result} tone="amber" />
            <AdSlot placement="in-content" />
            {best && worst && best.estimate.annual.median !== null && worst.estimate.annual.median !== null && (
              <section className="engine-notes" aria-labelledby="spread-title">
                <h2 id="spread-title">{`Which state pays ${occupationPlural(occupation)} the most?`}</h2>
                <p className="engine-notes-lede">
                  {`${getStateName(best.state)} pays a median of ${formatMoney(best.estimate.annual.median, 0)}, ${getStateName(worst.state)} ${formatMoney(worst.estimate.annual.median, 0)} — a gap of ${formatMoney(best.estimate.annual.median - worst.estimate.annual.median, 0)} before either state's taxes or prices are counted.`}
                </p>
                <ul>
                  <li>
                    <strong>{getStateName(best.state)}.</strong>{' '}
                    <Link href={salaryOccupationInStatePath(occupation, best.state)}>
                      {`See take-home and local prices in ${getStateName(best.state)} →`}
                    </Link>
                  </li>
                  <li>
                    <strong>The nominal figure is not the comparison.</strong>{' '}
                    A higher salary in an expensive state can leave less than a lower one somewhere cheap. Each state page adjusts for tax and price level.
                  </li>
                </ul>
              </section>
            )}

            <section className="related-section" aria-labelledby="states-title">
              <p className="eyebrow muted"><span /> Every state</p>
              <h2 id="states-title">{`${heading} salary by state`}</h2>
              <StatesForOccupationTable occupation={occupation} rows={rows} />
            </section>

            <SalaryQuestions profile={profile} />
          </div>
          <aside className="tool-rail" aria-label="About this page">
            <div className="rail-card">
              <p className="rail-kicker">Note</p>
              <h2>These are survey estimates, not offers.</h2>
              <p>{`OEWS asks employers what they pay, once a year. Figures here are ${profile.referenceLabel}, and cover wage and salary workers only.`}</p>
            </div>
            <div className="rail-card">
              <p className="rail-kicker">Next</p>
              <h2>Turn a salary into take-home</h2>
              <p><Link href="/money/salary-after-tax">Salary after tax by state →</Link></p>
              <p><Link href="/money/hourly-to-salary">Hourly to salary →</Link></p>
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
