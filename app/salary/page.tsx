import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { SalaryFeatured, SalaryGroupCatalog } from '@/components/salary/SalaryCatalog';
import { SalaryDirectory } from '@/components/salary/SalaryDirectory';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { oewsIndex } from '@/lib/data/bls-oews-snapshot';
import { salaryHubModel } from '@/lib/salary-hub';
import { isSalaryLevelIndexable, salaryFamilyPath, salaryStateIndexPath } from '@/lib/salary-pages';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

/**
 * The family hub, and the page that keeps 830 occupation pages from being orphans.
 *
 * Every occupation is listed, grouped by its SOC major group, so one crawl of
 * this page reaches all of them. The directory on top of that list is what a
 * reader actually uses: search, the median on every row, and a jump list of
 * fields, so finding a job does not mean scanning 761 titles by eye.
 */

export async function generateMetadata(): Promise<Metadata> {
  const hub = salaryHubModel();
  return pageMetadata(
    'What jobs pay in the U.S.',
    `Median and percentile wages for ${formatNumber(hub.occupationCount)} occupations from the BLS ${oewsIndex.referenceLabel} survey, with take-home pay and local price levels for every state.`,
    salaryFamilyPath(),
    { index: isSalaryLevelIndexable('familyHub'), follow: true },
  );
}

export default function SalaryHubPage() {
  const hub = salaryHubModel();
  const breadcrumbs = [
    { name: siteConfig.name, path: '/' },
    { name: 'Salaries', path: salaryFamilyPath() },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <header className="tool-hero accent-mint salary-hero">
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
              <p className="eyebrow"><span /> {`BLS ${oewsIndex.referenceLabel} · ${formatNumber(hub.occupationCount)} occupations`}</p>
              <h1>What jobs pay in the U.S.</h1>
            </div>
            <div className="tool-intro">
              <p>
                {hub.nationalMedian == null
                  ? 'Search a job, or jump to a field. Every page shows the median, the spread, and what the wage leaves after tax in each state.'
                  : `The median American job pays ${formatMoney(hub.nationalMedian, 0)} a year. Search a title to see the median, the percentiles, and take-home in every state — or scan the directory by field.`}
              </p>
              <dl className="salary-hero-stats">
                <div>
                  <dt>U.S. median job</dt>
                  <dd>{hub.nationalMedian == null ? '—' : formatMoney(hub.nationalMedian, 0)}</dd>
                </div>
                <div>
                  <dt>Occupations</dt>
                  <dd>{formatNumber(hub.occupationCount)}</dd>
                </div>
                <div>
                  <dt>States + D.C.</dt>
                  <dd>{formatNumber(hub.stateCount)}</dd>
                </div>
              </dl>
              <p className="salary-hero-alt"><Link href={salaryStateIndexPath()}>Browse by state instead →</Link></p>
            </div>
          </div>
        </header>

        <SalaryDirectory groups={hub.groups}>
          <SalaryFeatured featured={hub.featured} />
          <SalaryGroupCatalog groups={hub.groups} />
        </SalaryDirectory>
      </main>
      <SiteFooter />
    </>
  );
}
