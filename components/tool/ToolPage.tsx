import { requestLocale } from '@/lib/i18n/request-locale';
import { CATEGORY_ES, siteText } from '@/lib/i18n/site-copy';
import { localizedTool } from '@/lib/i18n/tool-copy';
import Link from '@/components/i18n/LocalizedLink';
import type { ReactNode } from 'react';
import { RelatedToolLink } from '@/components/analytics/RelatedToolLink';
import { AdSlot } from '@/components/monetization/AdSlot';
import { AffiliateOffers } from '@/components/monetization/AffiliateOffers';
import { NextActionModule } from '@/components/monetization/NextActionModule';
import { toolMonetizationContext } from '@/lib/monetization/tool-context';
import { resolveMonetizationSurface } from '@/lib/monetization/surface';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { CalculatorEditorial } from '@/components/tool/CalculatorEditorial';
import { breadcrumbJsonLd, toolArticleJsonLd, toolJsonLd } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';
import { getToolEditorial } from '@/lib/tool-content';
import { categories, getRelatedTools, getToolClusters, type ResultNature, type ToolDefinition } from '@/lib/tool-registry';
import type { DataSourceId } from '@/lib/data/data-sources';
import { calculationReceipt, receiptSummary } from '@/lib/tools/receipt';

export type SourceItem = {
  name: string;
  detail: string;
  href: string;
  dateLabel?: string;
};

type ToolPageProps = {
  tool: ToolDefinition;
  children: ReactNode;
  methodology: Array<{ title: string; body: string }>;
  sources?: SourceItem[];
  caution?: string;
  /**
   * Observation period or effective version per source, when the page already
   * holds the snapshot. Purely to sharpen the receipt: a page that does not
   * pass one still names the source and its kind.
   */
  sourcePeriods?: Partial<Record<DataSourceId, string>>;
};

/**
 * What the note beside a result should say, per kind of result.
 *
 * A single "This is an estimate" heading sat over exact fraction arithmetic and
 * a random number generator as readily as over a modelled cost. Each kind gets
 * a heading that is true of it, so the word "estimate" keeps its meaning on the
 * pages that need it.
 */
const RESULT_NOTES: Record<ResultNature, { heading: string; body: string }> = {
  exact: {
    heading: 'This is an exact calculation.',
    body: 'The arithmetic is exact for the numbers you enter. Open the steps to see it worked through.',
  },
  'official-data-estimate': {
    heading: 'This uses published official data.',
    body: 'An official average is not your bill or your quote. The source and its date sit next to the answer. Compare with a real one if you have it.',
  },
  projection: {
    heading: 'This is a projection, not a forecast.',
    body: 'It shows what the return and contributions you entered would produce. Real markets do not deliver a steady rate.',
  },
  'planning-model': {
    heading: 'This is a planning guideline.',
    body: 'The bands here are our own thresholds, not a lender or dealer decision. Treat the ranges as rough.',
  },
  'formula-estimate': {
    heading: 'This is a published formula, not a measurement.',
    body: 'The equation is applied exactly, but it estimates a quantity it cannot measure. Open what we assumed.',
  },
  random: {
    heading: 'These numbers are generated.',
    body: 'Each result is new and is not a calculation of anything. Not for lotteries, prize draws, or security keys.',
  },
};

export async function ToolPage({ tool, children, methodology, sources = [], caution, sourcePeriods }: ToolPageProps) {
  const locale = await requestLocale();
  const t = (text: string) => siteText(text, locale);
  tool = localizedTool(tool, locale);
  const category = locale === 'es-US' ? { ...categories[tool.category], ...CATEGORY_ES[tool.category] } : categories[tool.category];
  /*
   * Built from the tool's own data manifest rather than hand-listed per page,
   * so a tool cannot claim a source it does not read and cannot quietly gain a
   * dependency without the receipt saying so.
   */
  const receipt = calculationReceipt({ manifest: tool.data, periods: sourcePeriods });
  const related = getRelatedTools(tool).map((item) => localizedTool(item, locale));
  // Naming the journey the reader is on gives the related block a reason to
  // exist beyond "more of the same category".
  const clusters = getToolClusters(tool.id);
  const editorialContent = getToolEditorial(tool.id, locale);
  /*
   * Built from the registry entry, not from a live calculation. The interactive
   * island owns the numbers; this page only knows which tool it is and what its
   * policy row permits, which is all the commercial layer is entitled to.
   */
  const monetization = toolMonetizationContext(tool);
  /*
   * Resolved on the server so no offer query, flag lookup or database handle
   * reaches the browser. It never throws: a page must not fail to render
   * because the monetization database is absent, which is the default state.
   */
  const surface = await resolveMonetizationSurface(monetization);
  const breadcrumbs = [
    { name: siteConfig.name, path: '/' },
    { name: category.name, path: `/topics/${tool.category}` },
    { name: tool.shortTitle, path: tool.path },
  ];

  return (
    <>
      <JsonLd data={[toolJsonLd(tool, locale), toolArticleJsonLd(tool, editorialContent, locale), breadcrumbJsonLd(breadcrumbs)]} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <header className={`tool-hero accent-${tool.accent}`}>
          <nav className="breadcrumbs" aria-label={t("Breadcrumb")}>
            {breadcrumbs.map((item, index) => (
              <span key={item.path}>
                {index > 0 && <b aria-hidden="true">/</b>}
                {index === breadcrumbs.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path}>{item.name}</Link>}
              </span>
            ))}
          </nav>
          <div className="tool-hero-grid">
            <div>
              <p className="eyebrow"><span /> {tool.eyebrow}</p>
              <h1>{tool.title}</h1>
            </div>
            <div className="tool-intro">
              <p>{tool.description}</p>
            </div>
          </div>
        </header>

        <div className="ad-leaderboard-wrap">
          <AdSlot placement="header-leaderboard" pageId={tool.id} />
        </div>

        <div className="tool-workspace">
          <div className="tool-main-column">
            {children}
            {/*
              Order is load-bearing and asserted by `assertPlacementOrder`: the
              answer, then the next step someone might take, and only then an
              advertisement. Nothing commercial sits between an input and its
              result.
            */}
            <NextActionModule
              context={monetization}
              offers={surface.offers}
              overrides={surface.overrides}
              showIntentSwitch={surface.showIntentSwitch}
              callCampaign={surface.callCampaign}
            />
            <AffiliateOffers toolId={tool.id} />
            <AdSlot placement="in-content" pageId={tool.id} />
            <CalculatorEditorial toolPath={tool.path} content={editorialContent} locale={locale} />
            {methodology.length > 0 && (
              <section className="engine-notes" aria-labelledby="engine-notes-title">
                <h2 id="engine-notes-title">{t("Engine notes")}</h2>
                <p className="engine-notes-lede">{t("Rounding, versioning, and omissions that sit beside the guide rather than repeating it.")}</p>
                <ul>
                  {methodology.map((item) => (
                    <li key={item.title}>
                      <strong>{t(item.title)}.</strong>
                      {' '}
                      {t(item.body)}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <aside className="tool-rail" aria-label={t("Tool information")}>
            <div className="rail-card">
              <p className="rail-kicker">{t("Note")}</p>
              <h2>{t(RESULT_NOTES[tool.resultNature].heading)}</h2>
              <p>{t(caution ?? RESULT_NOTES[tool.resultNature].body)}</p>
            </div>
            <AdSlot placement="desktop-rail" pageId={tool.id} />
          </aside>
        </div>

        <section className="receipt-section" aria-labelledby="receipt-title">
          <div>
            <p className="eyebrow muted"><span /> {t("Calculation receipt")}</p>
            <h2 id="receipt-title">{t("What each number here is")}</h2>
            <p className="receipt-lede">{receiptSummary(tool.data)}</p>
          </div>
          <div className="receipt-list">
            {receipt.length === 0 ? (
              <p className="receipt-empty">{tool.data.fallbackBehavior.note}</p>
            ) : (
              <dl>
                {receipt.map((line) => (
                  <div className={`receipt-row receipt-${line.provenanceClass}`} key={`${line.provenanceClass}-${line.source}`}>
                    <dt>
                      <b>{line.classWord}</b>
                      <span>{line.source}{line.period ? ` · ${line.period}` : ''}</span>
                    </dt>
                    <dd>{line.role}</dd>
                  </div>
                ))}
              </dl>
            )}
            {tool.data.requiresData && (
              <p className="receipt-fallback">
                <strong>{t("If a source above is unavailable or out of date:")}</strong> {tool.data.fallbackBehavior.note}
              </p>
            )}
          </div>
        </section>


        {sources.length > 0 && (
          <section className="sources-section" aria-labelledby="sources-title">
            <div>
              <p className="eyebrow muted"><span /> {t("Sources")}</p>
              <h2 id="sources-title">{t("Where this data comes from")}</h2>
            </div>
            <div className="source-list">
              {sources.map((source) => (
                <a href={source.href} key={source.href} target="_blank" rel="noreferrer">
                  <span><strong>{source.name}</strong><small>{source.detail}</small></span>
                  <span>{source.dateLabel ?? t('View source')} ↗</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="related-section" aria-labelledby="related-title">
          <p className="eyebrow muted"><span /> {t("Next")}</p>
          <h2 id="related-title">{t("Related calculators")}</h2>
          {clusters.length > 0 && (
            <p className="related-lede">
              People working through {clusters.map((cluster) => cluster.label.toLowerCase()).join(' and ')} usually need these next.
            </p>
          )}
          <div className="related-grid">
            {related.map((relatedTool) => (
              <RelatedToolLink href={relatedTool.path} toolId={tool.id} category={tool.category} relatedToolId={relatedTool.id} key={relatedTool.id}>
                <span>{locale === 'es-US' ? CATEGORY_ES[relatedTool.category].name : categories[relatedTool.category].name}</span>
                <strong>{relatedTool.shortTitle}</strong>
                <small>{relatedTool.description}</small>
                <b aria-hidden="true">→</b>
              </RelatedToolLink>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
