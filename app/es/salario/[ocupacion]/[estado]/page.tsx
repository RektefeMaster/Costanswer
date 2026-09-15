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
import { TakeHomeSection, WagePanel, WageSources } from '@/components/salary/WageProfile';
import { occupationWageProfile } from '@/lib/calculations/salary';
import { getOewsEstimate } from '@/lib/data/bls-oews-snapshot';
import { getStateNameEs } from '@/lib/location/states-es';
import {
  salaryEsLeafIsOpen,
  salaryFamilyPathEs,
  salaryOccupationFromSlugEs,
  salaryOccupationInStatePathEs,
  salaryOccupationPathEs,
  salaryStatePathEs,
} from '@/lib/salary-es-pages';
import { stateFromSlug, statesWithWageFor } from '@/lib/salary-pages';
import {
  costContextEs,
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

type Params = { ocupacion: string; estado: string };

function resolve(params: Params) {
  const occupation = salaryOccupationFromSlugEs(params.ocupacion);
  const state = stateFromSlug(params.estado);
  if (!occupation || !state) return null;
  const result = occupationWageProfile({ area: state, occupationCode: occupation.code });
  if (!result) return null;
  return { occupation, state, result };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolved = resolve(await params);
  if (!resolved) return {};
  const { occupation, result } = resolved;
  return pageMetadata(
    salaryTitleEs(result.value),
    salaryDescriptionEs(result.value),
    salaryOccupationInStatePathEs(occupation, resolved.state),
    { index: salaryEsLeafIsOpen(occupation), follow: true },
  );
}

export default async function SpanishOccupationInStatePage({ params }: { params: Promise<Params> }) {
  const resolved = resolve(await params);
  if (!resolved) notFound();
  const { occupation, state, result } = resolved;
  const profile = result.value;
  const stateName = getStateNameEs(state);
  const path = salaryOccupationInStatePathEs(occupation, state);
  const peers = statesWithWageFor(occupation)
    .map((peer) => ({ peer, estimate: getOewsEstimate(peer, occupation.code) }))
    .filter((row): row is { peer: typeof state; estimate: NonNullable<typeof row.estimate> } => Boolean(row.estimate))
    .map(({ peer, estimate }) => ({ state: peer, estimate }));
  const heading = occupationHeadingEs(occupation);
  const questions = salaryQuestionsEs(profile);
  const cost = costContextEs(profile);
  const breadcrumbs = [
    { name: siteConfig.name, path: '/es' },
    { name: 'Salarios', path: salaryFamilyPathEs() },
    { name: occupationHeadingEs(occupation), path: salaryOccupationPathEs(occupation) },
    { name: stateName, path },
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
              <p className="eyebrow"><span /> {`${stateName} · BLS ${profile.referenceLabel}`}</p>
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
            <WagePanel result={result} locale="es-US" />
            <AdSlot placement="in-content" />
            <TakeHomeSection profile={profile} locale="es-US" />
            <SalaryNextSteps locale="es-US" annualMedian={profile.wage.annualMedian} hourlyMedian={profile.wage.hourlyMedian} state={state} />
            {cost && (
              <section className="engine-notes" aria-labelledby="cost-title">
                <h2 id="cost-title">{cost.heading}</h2>
                <p className="engine-notes-lede">{cost.lede}</p>
                <ul>
                  {cost.rents && <li><strong>Rentas.</strong> {cost.rents}</li>}
                  {cost.household && <li><strong>Frente a los hogares locales.</strong> {cost.household}</li>}
                  {cost.concentration && <li><strong>Qué tan común es el trabajo aquí.</strong> {cost.concentration}</li>}
                </ul>
                <p className="engine-notes-lede">
                  <Link href="/money/cost-of-living">Compare dos lugares con la misma cesta →</Link>
                </p>
              </section>
            )}
            <section className="related-section" aria-labelledby="states-title">
              <p className="eyebrow muted"><span /> Cada estado</p>
              <h2 id="states-title">{`¿En qué estado se paga más a ${occupationPluralEs(occupation)}?`}</h2>
              <StatesForOccupationTable occupation={occupation} rows={peers} highlight={state} locale="es-US" />
            </section>
            <SalaryQuestions profile={profile} locale="es-US" />
          </div>
          <aside className="tool-rail" aria-label="Sobre esta página">
            <div className="rail-card">
              <p className="rail-kicker">Nota</p>
              <h2>Son estimaciones de encuesta, no ofertas.</h2>
              <p>
                {`OEWS pregunta a los empleadores qué pagan, una vez al año. Es la mejor medida pública del sueldo de un trabajo en un lugar, y no es una cotización. Las cifras son de ${profile.referenceLabel}.`}
              </p>
            </div>
            <div className="rail-card">
              <p className="rail-kicker">Siguiente</p>
              <h2>{`Otro trabajo en ${stateName}`}</h2>
              <p><Link href={salaryStatePathEs(state)}>{`Ver lo que paga cada ocupación en ${stateName} →`}</Link></p>
              <p><Link href={salaryOccupationPathEs(occupation)}>{`Sueldo nacional de ${heading.toLowerCase()} →`}</Link></p>
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
