import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdSlot } from '@/components/monetization/AdSlot';
import { AffiliateOffers } from '@/components/monetization/AffiliateOffers';
import { NextActionModule } from '@/components/monetization/NextActionModule';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { DEFAULT_LOCALE } from '@/lib/i18n/locales';
import { JOB_ENGINE_ID } from '@/lib/job/version';
import { createMonetizationContext } from '@/lib/monetization/context';
import { getMonetizationPolicy } from '@/lib/monetization/policy';
import { resolveMonetizationSurface } from '@/lib/monetization/surface';
import { breadcrumbJsonLd } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export async function CostPage({
  title,
  description,
  path,
  pageId,
  children,
  methodology,
}: {
  title: string;
  description: string;
  path: `/${string}`;
  pageId: string;
  children: ReactNode;
  methodology: Array<{ title: string; body: string }>;
}) {
  const policy = getMonetizationPolicy(pageId);
  const monetization = createMonetizationContext({
    pageId,
    calculatorId: pageId,
    calculatorType: JOB_ENGINE_ID,
    locale: DEFAULT_LOCALE,
    vertical: policy.vertical,
    riskClass: policy.riskClass,
    leadEligible: policy.lead.enabled,
    affiliateEligible: policy.affiliate.enabled,
    adsEligible: policy.ads.enabled,
  });
  const surface = await resolveMonetizationSurface(monetization);
  const breadcrumbs = [
    { name: siteConfig.name, path: '/' as const },
    { name: 'Job costs', path: '/cost' as const },
    ...(path === '/cost' ? [] : [{ name: title, path }]),
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <header className="tool-hero accent-amber">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((item, index) => (
              <span key={item.path}>
                {index > 0 && <b aria-hidden="true">/</b>}
                {index === breadcrumbs.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path}>{item.name}</Link>}
              </span>
            ))}
          </nav>
          <div className="tool-hero-grid">
            <div>
              <p className="eyebrow"><span /> Job Cost Engine</p>
              <h1>{title}</h1>
            </div>
            <div className="tool-intro">
              <p>{description}</p>
            </div>
          </div>
        </header>
        <div className="ad-leaderboard-wrap">
          <AdSlot placement="header-leaderboard" pageId={pageId} />
        </div>
        <div className="tool-workspace">
          <div className="tool-main-column">
            {children}
            <NextActionModule
              context={monetization}
              offers={surface.offers}
              overrides={surface.overrides}
              showIntentSwitch={surface.showIntentSwitch}
              callCampaign={surface.callCampaign}
            />
            <AffiliateOffers toolId={pageId} />
            <AdSlot placement="in-content" pageId={pageId} />
            {methodology.length > 0 && (
              <section className="engine-notes" aria-labelledby="engine-notes-title">
                <h2 id="engine-notes-title">Engine notes</h2>
                <ul>
                  {methodology.map((item) => (
                    <li key={item.title}>
                      <strong>{item.title}.</strong>
                      {' '}
                      {item.body}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <aside className="tool-rail" aria-label="Job cost information">
            <div className="rail-card">
              <p className="rail-kicker">Note</p>
              <h2>This is a CostAnswer estimated range.</h2>
              <p>It is not a contractor quote, a market quantile, or a typical market band. Equipment dollars are FEMA cost proxies. Local permits are usually excluded.</p>
            </div>
            <AdSlot placement="desktop-rail" pageId={pageId} />
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
