import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { getOewsEstimate } from '@/lib/data/bls-oews-snapshot';
import { oewsIndex } from '@/lib/data/bls-oews-snapshot';
import { getStateName, STATE_CODES } from '@/lib/location/states';
import { isSalaryLevelIndexable, salaryFamilyPath, salaryStateIndexPath, salaryStatePath } from '@/lib/salary-pages';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(
    'Salaries by state',
    `What work pays in all 50 states and D.C., from the BLS ${oewsIndex.referenceLabel} wage survey, with take-home after each state's own tax.`,
    salaryStateIndexPath(),
    { index: isSalaryLevelIndexable('stateIndex'), follow: true },
  );
}

export default function SalaryStatesPage() {
  const rows = STATE_CODES
    .map((state) => ({ state, estimate: getOewsEstimate(state, '00-0000') }))
    .filter((row) => row.estimate?.annual.median != null)
    .sort((left, right) => (right.estimate!.annual.median ?? 0) - (left.estimate!.annual.median ?? 0));

  const breadcrumbs = [
    { name: siteConfig.name, path: '/' },
    { name: 'Salaries', path: salaryFamilyPath() },
    { name: 'States', path: salaryStateIndexPath() },
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
              <p className="eyebrow"><span /> {`All 50 states and D.C. · BLS ${oewsIndex.referenceLabel}`}</p>
              <h1>Salaries by state</h1>
            </div>
            <div className="tool-intro">
              <p>
                The median wage across all occupations, state by state. It is a blunt figure on its own — a state
                can rank high because of what it pays or because of which jobs it has — so each state page breaks
                it into occupations, take-home pay and local prices.
              </p>
            </div>
          </div>
        </header>

        <div className="tool-workspace">
          <div className="tool-main-column">
            <div className="rank-table-wrap">
              <table className="rank-table">
                <caption>{`Median annual wage across all occupations, ${oewsIndex.referenceLabel}`}</caption>
                <thead>
                  <tr>
                    <th scope="col">State</th>
                    <th scope="col">Jobs counted</th>
                    <th scope="col">Median a year</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ state, estimate }) => (
                    <tr key={state}>
                      <th scope="row"><Link href={salaryStatePath(state)}>{getStateName(state)}</Link></th>
                      <td>{estimate!.employment === null ? 'Not published' : formatNumber(estimate!.employment)}</td>
                      <td>{formatMoney(estimate!.annual.median!, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
