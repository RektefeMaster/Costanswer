import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { getOewsEstimate, getOewsOccupation, oewsIndex } from '@/lib/data/bls-oews-snapshot';
import type { OewsOccupation } from '@/lib/data/bls-oews';
import {
  isSalaryLevelIndexable,
  nationalSalaryOccupations,
  salaryFamilyPath,
  salaryOccupationPath,
  salaryStateIndexPath,
} from '@/lib/salary-pages';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

/**
 * The family hub, and the page that keeps 830 occupation pages from being orphans.
 *
 * Every occupation is listed, grouped by its SOC major group, so one crawl of
 * this page reaches all of them and a reader can find a job by the field it
 * belongs to rather than by guessing its official title.
 */

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(
    'What jobs pay in the U.S.',
    `Median and percentile wages for ${formatNumber(nationalSalaryOccupations().length)} occupations from the BLS ${oewsIndex.referenceLabel} survey, with take-home pay and local price levels for every state.`,
    salaryFamilyPath(),
    { index: isSalaryLevelIndexable('familyHub'), follow: true },
  );
}

export default function SalaryHubPage() {
  const occupations = nationalSalaryOccupations();
  const groups = new Map<string, OewsOccupation[]>();
  for (const occupation of occupations) {
    const list = groups.get(occupation.majorCode) ?? [];
    list.push(occupation);
    groups.set(occupation.majorCode, list);
  }
  const grouped = [...groups.entries()]
    .map(([majorCode, members]) => ({
      majorCode,
      title: getOewsOccupation(majorCode)?.title ?? 'Other occupations',
      members,
    }))
    .sort((left, right) => left.majorCode.localeCompare(right.majorCode));

  const nationalTotal = getOewsEstimate('US', '00-0000');
  const breadcrumbs = [
    { name: siteConfig.name, path: '/' },
    { name: 'Salaries', path: salaryFamilyPath() },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
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
              <p className="eyebrow"><span /> {`BLS ${oewsIndex.referenceLabel} · ${formatNumber(occupations.length)} occupations`}</p>
              <h1>What jobs pay in the U.S.</h1>
            </div>
            <div className="tool-intro">
              <p>
                {nationalTotal?.annual.median == null
                  ? 'Published wages for every occupation the Bureau of Labor Statistics measures, by percentile and by state.'
                  : `The median American job pays ${formatMoney(nationalTotal.annual.median, 0)} a year. What any particular job pays depends far more on which job and which state. Every page here shows both, plus what the wage leaves after tax.`}
              </p>
              <p><Link href={salaryStateIndexPath()}>Browse by state instead →</Link></p>
            </div>
          </div>
        </header>

        <div className="tool-workspace">
          <div className="tool-main-column">
            {grouped.map((group) => (
              <section className="related-section" aria-labelledby={`group-${group.majorCode}`} key={group.majorCode}>
                <p className="eyebrow muted"><span /> {`SOC ${group.majorCode}`}</p>
                <h2 id={`group-${group.majorCode}`}>{group.title}</h2>
                <ul className="salary-occupation-list">
                  {group.members.map((occupation) => (
                    <li key={occupation.code}>
                      <Link href={salaryOccupationPath(occupation)}>{occupation.displayTitle}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
