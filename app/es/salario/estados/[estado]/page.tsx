import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { AdSlot } from '@/components/monetization/AdSlot';
import { OccupationsInStateTable } from '@/components/salary/SalaryTables';
import { WagePanel, WageSources } from '@/components/salary/WageProfile';
import { formatMoneyLocale, formatNumberLocale } from '@/lib/i18n/format';
import { occupationWageProfile } from '@/lib/calculations/salary';
import { getOewsEstimatesForArea, getOewsOccupation } from '@/lib/data/bls-oews-snapshot';
import type { OewsEstimate, OewsOccupation } from '@/lib/data/bls-oews';
import { STATE_CODES } from '@/lib/location/states';
import { getStateNameEs } from '@/lib/location/states-es';
import { isSalaryLevelIndexable, stateFromSlug, stateSlug } from '@/lib/salary-pages';
import { salaryFamilyPathEs, salaryStateIndexPathEs, salaryStatePathEs } from '@/lib/salary-es-pages';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

const BIGGEST_OCCUPATION_ROWS = 40;
const BEST_PAID_OCCUPATION_ROWS = 25;

export function generateStaticParams() {
  return STATE_CODES.map((state) => ({ estado: stateSlug(state) }));
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

export async function generateMetadata({ params }: { params: Promise<{ estado: string }> }): Promise<Metadata> {
  const { estado: slug } = await params;
  const state = stateFromSlug(slug);
  if (!state) return {};
  const result = occupationWageProfile({ area: state, occupationCode: '00-0000' });
  if (!result) return {};
  const name = getStateNameEs(state);
  const median = result.value.wage.annualMedian;
  return pageMetadata(
    `Sueldos en ${name}`,
    median === null
      ? `Lo que pagan los trabajos en ${name}, según BLS ${result.value.referenceLabel}, con el neto después del impuesto de ${name}.`
      : `El trabajo mediano en ${name} paga ${formatMoneyLocale('es-US', median, 0)} al año. Sueldos BLS ${result.value.referenceLabel} por ocupación, con neto y precios locales.`,
    salaryStatePathEs(state),
    { index: isSalaryLevelIndexable('stateHub'), follow: true },
  );
}

export default async function SpanishStateSalaryPage({ params }: { params: Promise<{ estado: string }> }) {
  const { estado: slug } = await params;
  const state = stateFromSlug(slug);
  if (!state) notFound();
  const result = occupationWageProfile({ area: state, occupationCode: '00-0000' });
  if (!result) notFound();
  const profile = result.value;
  const name = getStateNameEs(state);
  const rows = pageWorthyRows(state);
  const biggest = [...rows].sort((left, right) => (right.estimate.employment ?? 0) - (left.estimate.employment ?? 0)).slice(0, BIGGEST_OCCUPATION_ROWS);
  const bestPaid = [...rows].sort((left, right) => (right.estimate.annual.median ?? 0) - (left.estimate.annual.median ?? 0)).slice(0, BEST_PAID_OCCUPATION_ROWS);
  const mostConcentrated = [...rows]
    .filter((row) => row.estimate.locationQuotient !== null && (row.estimate.employment ?? 0) >= 1_000)
    .sort((left, right) => (right.estimate.locationQuotient ?? 0) - (left.estimate.locationQuotient ?? 0))
    .slice(0, 10);
  const path = salaryStatePathEs(state);
  const breadcrumbs = [
    { name: siteConfig.name, path: '/es' },
    { name: 'Salarios', path: salaryFamilyPathEs() },
    { name: 'Estados', path: salaryStateIndexPathEs() },
    { name, path },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="salary-page">
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
              <p className="eyebrow"><span /> {`${name} · BLS ${profile.referenceLabel}`}</p>
              <h1>{`Sueldos en ${name}`}</h1>
            </div>
            <div className="tool-intro">
              <p className="direct-answer">
                {`Sueldos de ${formatNumberLocale('es-US', rows.length)} ocupaciones que BLS midió en ${name}, cada una con lo que deja la mediana después de impuestos y lo que alcanza a precios locales.`}
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
              locale="es-US"
              footnote="Todas las ocupaciones juntas. Las ocupaciones individuales se mueven mucho más que esta cifra. Las tablas de abajo muestran la dispersión."
            />
            <AdSlot placement="in-content" />
            <section className="related-section" aria-labelledby="biggest-title">
              <p className="eyebrow muted"><span /> Dónde trabaja la gente</p>
              <h2 id="biggest-title">{`Los trabajos más comunes en ${name}`}</h2>
              <OccupationsInStateTable
                caption={`Ocupaciones por número de empleos en ${name}`}
                state={state}
                rows={biggest}
                secondaryColumn="employment"
                locale="es-US"
              />
            </section>
            <section className="related-section" aria-labelledby="best-paid-title">
              <p className="eyebrow muted"><span /> Dónde está el dinero</p>
              <h2 id="best-paid-title">{`Los trabajos mejor pagados en ${name}`}</h2>
              <OccupationsInStateTable
                caption={`Ocupaciones por mediana anual en ${name}`}
                state={state}
                rows={bestPaid}
                secondaryColumn="employment"
                locale="es-US"
              />
            </section>
            {mostConcentrated.length > 0 && (
              <section className="related-section" aria-labelledby="concentrated-title">
                <p className="eyebrow muted"><span /> Lo distintivo de aquí</p>
                <h2 id="concentrated-title">{`Trabajos más concentrados en ${name} que en el país`}</h2>
                <OccupationsInStateTable
                  caption={`Ocupaciones por concentración frente a la participación nacional, ${name}`}
                  state={state}
                  rows={mostConcentrated}
                  secondaryColumn="concentration"
                  locale="es-US"
                />
              </section>
            )}
          </div>
          <aside className="tool-rail" aria-label="Sobre esta página">
            <div className="rail-card">
              <p className="rail-kicker">Nota</p>
              <h2>Son estimaciones de encuesta, no ofertas.</h2>
              <p>{`OEWS pregunta a los empleadores qué pagan, una vez al año. Las cifras son de ${profile.referenceLabel} y cubren solo trabajadores asalariados.`}</p>
            </div>
            <div className="rail-card">
              <p className="rail-kicker">Siguiente</p>
              <h2>Todos los estados</h2>
              <p><Link href={salaryStateIndexPathEs()}>Sueldos por estado →</Link></p>
              <p><Link href="/money/salary-after-tax">{`Sueldo neto en ${name} →`}</Link></p>
            </div>
            <AdSlot placement="desktop-rail" />
          </aside>
        </div>
        <WageSources profile={profile} locale="es-US" />
      </main>
      <SiteFooter />
    </>
  );
}
