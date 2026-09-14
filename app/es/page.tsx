import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { formatMoneyLocale, formatNumberLocale } from '@/lib/i18n/format';
import { salaryHubModel } from '@/lib/salary-hub';
import { salaryFamilyPathEs } from '@/lib/salary-es-pages';
import { breadcrumbJsonLd, organizationJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(
    'Sueldos en Estados Unidos, en español',
    'Cuánto se gana en cada ocupación y cada estado, con la mediana de BLS, el neto después de impuestos y lo que alcanza el dinero. Calculadoras de EE. UU. con la cuenta a la vista.',
    '/es',
  );
}

export default function SpanishHomePage() {
  const hub = salaryHubModel('es-US');
  const breadcrumbs = [
    { name: siteConfig.name, path: '/es' },
  ];
  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          breadcrumbJsonLd(breadcrumbs),
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: siteConfig.name,
            url: new URL('/es', siteConfig.origin).toString(),
            inLanguage: 'es-US',
            description: 'Sueldos ocupacionales de EE. UU. con cifras oficiales de BLS y calculadoras con la cuenta a la vista.',
          },
        ]}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <header className="tool-hero accent-mint">
          <div className="tool-hero-grid">
            <div>
              <p className="eyebrow"><span /> CostAnswer · EE. UU.</p>
              <h1>Cuánto se gana en Estados Unidos</h1>
            </div>
            <div className="tool-intro">
              <p className="direct-answer">
                {hub.nationalMedian == null
                  ? 'Busque una ocupación. Cada página nombra la mediana de BLS, el neto después de impuestos en ese estado, y la fuente con fecha.'
                  : `El trabajo mediano en Estados Unidos paga ${formatMoneyLocale('es-US', hub.nationalMedian, 0)} al año. Hay ${formatNumberLocale('es-US', hub.occupationCount)} ocupaciones y ${formatNumberLocale('es-US', hub.stateCount)} jurisdicciones, cada una con su propia cifra de BLS — no un sueldo copiado de un estado a otro.`}
              </p>
            </div>
          </div>
        </header>
        <div className="tool-workspace">
          <div className="tool-main-column">
            <section className="related-section" aria-labelledby="salary-es-title">
              <p className="eyebrow muted"><span /> Salarios</p>
              <h2 id="salary-es-title">Una ocupación, un estado, una cifra oficial</h2>
              <p>
                Las páginas en español responden “¿cuánto gana un enfermero en Texas?” con la mediana OEWS,
                el take-home después del impuesto de ese estado, y el nivel de precios de BEA. El inglés
                y el español son el mismo dato, no dos inventos.
              </p>
              <p><Link href={salaryFamilyPathEs()}>Ver todas las ocupaciones →</Link></p>
            </section>
            <section className="related-section" aria-labelledby="featured-es-title">
              <p className="eyebrow muted"><span /> Los más buscados</p>
              <h2 id="featured-es-title">Empiece por un trabajo concreto</h2>
              <div className="related-grid">
                {hub.featured.map((occupation) => (
                  <Link className="topic-tool-card" href={occupation.path} key={occupation.code}>
                    <span className="topic-tool-copy">
                      <strong>{occupation.name}</strong>
                      <small>
                        {occupation.medianAnnual == null
                          ? `SOC ${occupation.code}`
                          : `${formatMoneyLocale('es-US', occupation.medianAnnual, 0)} al año`}
                      </small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
            <section className="related-section" aria-labelledby="en-tools-title">
              <p className="eyebrow muted"><span /> Calculadoras</p>
              <h2 id="en-tools-title">Las calculadoras siguen en inglés</h2>
              <p>
                Hipoteca, paycheck, impuestos y costos de un trabajo están en el sitio en inglés, con la misma
                cuenta a la vista. El español de este lanzamiento cubre la familia salarial, que es donde
                hay una cifra oficial distinta para cada página.
              </p>
              <p><Link href="/">Ir a las calculadoras en inglés →</Link></p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
