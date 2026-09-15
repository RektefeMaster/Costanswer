import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
import { JsonLd } from '@/components/seo/JsonLd';
import { SalaryFeatured, SalaryGroupCatalog } from '@/components/salary/SalaryCatalog';
import { SalaryDirectory } from '@/components/salary/SalaryDirectory';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { formatMoneyLocale, formatNumberLocale } from '@/lib/i18n/format';
import { oewsIndex } from '@/lib/data/bls-oews-snapshot';
import { salaryHubModel } from '@/lib/salary-hub';
import { isSalaryLevelIndexable } from '@/lib/salary-pages';
import { salaryFamilyPathEs, salaryStateIndexPathEs } from '@/lib/salary-es-pages';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export async function generateMetadata(): Promise<Metadata> {
  const hub = salaryHubModel('es-US');
  return pageMetadata(
    'Sueldos en EE. UU. por ocupación: mediana y neto',
    `Mediana salarial de ${formatNumberLocale('es-US', hub.occupationCount)} trabajos según BLS ${oewsIndex.referenceLabel}, con paga por hora, percentiles y sueldo neto por estado.`,
    salaryFamilyPathEs(),
    { index: isSalaryLevelIndexable('familyHub'), follow: true },
  );
}

export default function SpanishSalaryHubPage() {
  const hub = salaryHubModel('es-US');
  const breadcrumbs = [
    { name: siteConfig.name, path: '/es' },
    { name: 'Salarios', path: salaryFamilyPathEs() },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="salary-page">
        <header className="tool-hero accent-mint salary-hero">
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
              <p className="eyebrow"><span /> {`BLS ${oewsIndex.referenceLabel} · ${formatNumberLocale('es-US', hub.occupationCount)} ocupaciones`}</p>
              <h1>Salarios por ocupación</h1>
            </div>
            <div className="tool-intro">
              <p className="direct-answer">
                {hub.nationalMedian == null
                  ? 'Busque un trabajo, o salte a un campo. Cada página muestra la mediana, el rango y lo que queda después de impuestos en cada estado.'
                  : `El trabajo mediano en Estados Unidos paga ${formatMoneyLocale('es-US', hub.nationalMedian, 0)} al año. Busque un título para ver la mediana, los percentiles y el neto en cada estado.`}
              </p>
              <dl className="salary-hero-stats">
                <div><dt>Mediana de EE. UU.</dt><dd>{hub.nationalMedian == null ? 'Sin datos' : formatMoneyLocale('es-US', hub.nationalMedian, 0)}</dd></div>
                <div><dt>Ocupaciones</dt><dd>{formatNumberLocale('es-US', hub.occupationCount)}</dd></div>
                <div><dt>Estados y D. C.</dt><dd>{formatNumberLocale('es-US', hub.stateCount)}</dd></div>
              </dl>
              <p className="salary-hero-alt"><Link href={salaryStateIndexPathEs()}>Ver por estado →</Link></p>
            </div>
          </div>
        </header>
        <SalaryDirectory groups={hub.groups} locale="es-US">
          <SalaryFeatured featured={hub.featured} locale="es-US" />
          <SalaryGroupCatalog groups={hub.groups} />
        </SalaryDirectory>
      </main>
      <SiteFooter />
    </>
  );
}
