import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { formatMoneyLocale, formatNumberLocale } from '@/lib/i18n/format';
import { getOewsEstimate, oewsIndex } from '@/lib/data/bls-oews-snapshot';
import { STATE_CODES } from '@/lib/location/states';
import { getStateNameEs } from '@/lib/location/states-es';
import { isSalaryLevelIndexable } from '@/lib/salary-pages';
import { salaryFamilyPathEs, salaryStateIndexPathEs, salaryStatePathEs } from '@/lib/salary-es-pages';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(
    'Sueldos por estado',
    `Lo que se gana en los 50 estados y D.C., según la encuesta BLS ${oewsIndex.referenceLabel}, con el neto después del impuesto de cada estado.`,
    salaryStateIndexPathEs(),
    { index: isSalaryLevelIndexable('stateIndex'), follow: true },
  );
}

export default function SpanishSalaryStatesPage() {
  const rows = STATE_CODES
    .map((state) => ({ state, estimate: getOewsEstimate(state, '00-0000') }))
    .filter((row) => row.estimate?.annual.median != null)
    .sort((left, right) => (right.estimate!.annual.median ?? 0) - (left.estimate!.annual.median ?? 0));

  const breadcrumbs = [
    { name: siteConfig.name, path: '/es' },
    { name: 'Salarios', path: salaryFamilyPathEs() },
    { name: 'Estados', path: salaryStateIndexPathEs() },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <header className="tool-hero accent-blue">
          <nav className="breadcrumbs" aria-label="Miga de pan">
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
              <p className="eyebrow"><span /> {`BLS ${oewsIndex.referenceLabel}`}</p>
              <h1>Sueldos por estado</h1>
            </div>
            <div className="tool-intro">
              <p className="direct-answer">
                Cada estado tiene su propia mediana ocupacional de BLS y su propio impuesto sobre salarios.
                Un sueldo más alto en el papel no siempre deja más en la cuenta.
              </p>
            </div>
          </div>
        </header>
        <div className="tool-workspace">
          <div className="tool-main-column">
            <div className="rank-table-wrap">
              <table className="rank-table">
                <caption>{`Mediana anual de todos los empleos, ${oewsIndex.referenceLabel}`}</caption>
                <thead>
                  <tr>
                    <th scope="col">Estado</th>
                    <th scope="col">Mediana al año</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ state, estimate }) => (
                    <tr key={state}>
                      <th scope="row">
                        <Link href={salaryStatePathEs(state)}>{getStateNameEs(state)}</Link>
                      </th>
                      <td>{formatMoneyLocale('es-US', estimate!.annual.median!, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>{formatNumberLocale('es-US', rows.length)} jurisdicciones con una mediana publicada.</p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
