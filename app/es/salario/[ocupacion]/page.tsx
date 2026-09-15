import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { AdSlot } from '@/components/monetization/AdSlot';
import { StatesForOccupationTable } from '@/components/salary/SalaryTables';
import { OccupationNames, SalaryQuestions } from '@/components/salary/SalaryQuestions';
import { SalaryNextSteps } from '@/components/salary/SalaryNextSteps';
import { WagePanel, WageSources } from '@/components/salary/WageProfile';
import { formatMoneyLocale } from '@/lib/i18n/format';
import { occupationWageProfile } from '@/lib/calculations/salary';
import { getOewsEstimate } from '@/lib/data/bls-oews-snapshot';
import { getStateNameEs } from '@/lib/location/states-es';
import type { StateCode } from '@/lib/location/states';
import {
  isSalaryLevelIndexable,
  salaryLeafIsOpen,
  statesWithWageFor,
} from '@/lib/salary-pages';
import {
  salaryFamilyPathEs,
  salaryOccupationFromSlugEs,
  salaryOccupationInStatePathEs,
  salaryOccupationPathEs,
} from '@/lib/salary-es-pages';
import {
  occupationHeadingEs,
  occupationJsonLdEs,
  occupationPluralEs,
  salaryDescriptionEs,
  salaryDirectAnswerEs,
  salaryQuestionsEs,
  salaryTitleEs,
} from '@/lib/salary-content-es';
import { breadcrumbJsonLd, faqPageJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export async function generateMetadata({ params }: { params: Promise<{ ocupacion: string }> }): Promise<Metadata> {
  const { ocupacion: slug } = await params;
  const occupation = salaryOccupationFromSlugEs(slug);
  if (!occupation) return {};
  const result = occupationWageProfile({ area: 'US', occupationCode: occupation.code });
  if (!result) return {};
  return pageMetadata(
    salaryTitleEs(result.value),
    salaryDescriptionEs(result.value),
    salaryOccupationPathEs(occupation),
    { index: isSalaryLevelIndexable('occupation'), follow: true },
  );
}

export default async function SpanishOccupationPage({ params }: { params: Promise<{ ocupacion: string }> }) {
  const { ocupacion: slug } = await params;
  const occupation = salaryOccupationFromSlugEs(slug);
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
  const heading = occupationHeadingEs(occupation);
  const path = salaryOccupationPathEs(occupation);
  const questions = salaryQuestionsEs(profile);
  const breadcrumbs = [
    { name: siteConfig.name, path: '/es' },
    { name: 'Salarios', path: salaryFamilyPathEs() },
    { name: heading, path },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(breadcrumbs),
          occupationJsonLdEs(profile, new URL(path, siteConfig.origin).toString()),
          ...(questions.length > 0 ? [faqPageJsonLd(questions, path)] : []),
        ]}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="salary-page">
        <header className="tool-hero accent-mint">
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
              <p className="eyebrow"><span /> {`Estados Unidos · BLS ${profile.referenceLabel}`}</p>
              <h1>{salaryTitleEs(profile)}</h1>
            </div>
            <div className="tool-intro">
              <OccupationNames profile={profile} locale="es-US" />
              <p className="direct-answer">{salaryDirectAnswerEs(profile)}</p>
            </div>
          </div>
        </header>
        <div className="ad-leaderboard-wrap">
          <AdSlot placement="header-leaderboard" />
        </div>
        <div className="tool-workspace">
          <div className="tool-main-column">
            <WagePanel result={result} tone="amber" locale="es-US" />
            <AdSlot placement="in-content" />
            <SalaryNextSteps locale="es-US" annualMedian={profile.wage.annualMedian} hourlyMedian={profile.wage.hourlyMedian} />
            {best && worst && best.estimate.annual.median !== null && worst.estimate.annual.median !== null && (
              <section className="engine-notes" aria-labelledby="spread-title">
                <h2 id="spread-title">{`¿En qué estado se paga más a ${occupationPluralEs(occupation)}?`}</h2>
                <p className="engine-notes-lede">
                  {`${getStateNameEs(best.state)} paga una mediana de ${formatMoneyLocale('es-US', best.estimate.annual.median, 0)}; ${getStateNameEs(worst.state)}, ${formatMoneyLocale('es-US', worst.estimate.annual.median, 0)}. Son ${formatMoneyLocale('es-US', best.estimate.annual.median - worst.estimate.annual.median, 0)} de diferencia antes de impuestos o precios.`}
                </p>
                <ul>
                  <li>
                    <strong>{getStateNameEs(best.state)}.</strong>{' '}
                    {salaryLeafIsOpen(occupation)
                      ? <Link href={salaryOccupationInStatePathEs(occupation, best.state)}>{`Ver neto y precios en ${getStateNameEs(best.state)} →`}</Link>
                      : `El neto allí depende del impuesto de ${getStateNameEs(best.state)}.`}
                  </li>
                  <li>
                    <strong>La cifra nominal no es la comparación.</strong>{' '}
                    Un sueldo más alto en un estado caro puede dejar menos que uno más bajo en un estado barato. Cada página estatal ajusta impuestos y precios.
                  </li>
                </ul>
              </section>
            )}
            <section className="related-section" aria-labelledby="states-title">
              <p className="eyebrow muted"><span /> Cada estado</p>
              <h2 id="states-title">{`Sueldo de ${heading.toLowerCase()} por estado`}</h2>
              <StatesForOccupationTable occupation={occupation} rows={rows} locale="es-US" />
            </section>
            <SalaryQuestions profile={profile} locale="es-US" />
          </div>
          <aside className="tool-rail" aria-label="Sobre esta página">
            <div className="rail-card">
              <p className="rail-kicker">Nota</p>
              <h2>Son estimaciones de encuesta, no ofertas.</h2>
              <p>{`OEWS pregunta a los empleadores qué pagan, una vez al año. Las cifras son de ${profile.referenceLabel} y cubren solo trabajadores asalariados.`}</p>
            </div>
            <div className="rail-card">
              <p className="rail-kicker">Siguiente</p>
              <h2>Pase un sueldo a neto</h2>
              <p><Link href="/money/salary-after-tax">Sueldo después de impuestos →</Link></p>
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
