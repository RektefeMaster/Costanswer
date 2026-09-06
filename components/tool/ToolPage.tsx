import Link from 'next/link';
import type { ReactNode } from 'react';
import { RelatedToolLink } from '@/components/analytics/RelatedToolLink';
import { AdSlot } from '@/components/monetization/AdSlot';
import { AffiliateOffers } from '@/components/monetization/AffiliateOffers';
import { NextActionModule } from '@/components/monetization/NextActionModule';
import { toolMonetizationContext } from '@/lib/monetization/tool-context';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { CalculatorEditorial } from '@/components/tool/CalculatorEditorial';
import { breadcrumbJsonLd, toolArticleJsonLd, toolJsonLd } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';
import { getToolEditorial } from '@/lib/tool-content';
import { categories, getRelatedTools, getToolClusters, type ResultNature, type ToolDefinition } from '@/lib/tool-registry';

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

export function ToolPage({ tool, children, methodology, sources = [], caution }: ToolPageProps) {
  const category = categories[tool.category];
  const related = getRelatedTools(tool);
  // Naming the journey the reader is on gives the related block a reason to
  // exist beyond "more of the same category".
  const clusters = getToolClusters(tool.id);
  const editorialContent = getToolEditorial(tool.id);
  /*
   * Built from the registry entry, not from a live calculation. The interactive
   * island owns the numbers; this page only knows which tool it is and what its
   * policy row permits, which is all the commercial layer is entitled to.
   */
  const monetization = toolMonetizationContext(tool);
  const breadcrumbs = [
    { name: siteConfig.name, path: '/' },
    { name: category.name, path: `/topics/${tool.category}` },
    { name: tool.shortTitle, path: tool.path },
  ];

  return (
    <>
      <JsonLd data={[toolJsonLd(tool), toolArticleJsonLd(tool, editorialContent), breadcrumbJsonLd(breadcrumbs)]} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <header className={`tool-hero accent-${tool.accent}`}>
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
            <NextActionModule context={monetization} />
            <AffiliateOffers toolId={tool.id} />
            <AdSlot placement="in-content" pageId={tool.id} />
            <CalculatorEditorial toolPath={tool.path} content={editorialContent} />
            {methodology.length > 0 && (
              <section className="engine-notes" aria-labelledby="engine-notes-title">
                <h2 id="engine-notes-title">Engine notes</h2>
                <p className="engine-notes-lede">Rounding, versioning, and omissions that sit beside the guide rather than repeating it.</p>
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
          <aside className="tool-rail" aria-label="Tool information">
            <div className="rail-card">
              <p className="rail-kicker">Note</p>
              <h2>{RESULT_NOTES[tool.resultNature].heading}</h2>
              <p>{caution ?? RESULT_NOTES[tool.resultNature].body}</p>
            </div>
            <AdSlot placement="desktop-rail" pageId={tool.id} />
          </aside>
        </div>

        {sources.length > 0 && (
          <section className="sources-section" aria-labelledby="sources-title">
            <div>
              <p className="eyebrow muted"><span /> Sources</p>
              <h2 id="sources-title">Where this data comes from</h2>
            </div>
            <div className="source-list">
              {sources.map((source) => (
                <a href={source.href} key={source.href} target="_blank" rel="noreferrer">
                  <span><strong>{source.name}</strong><small>{source.detail}</small></span>
                  <span>{source.dateLabel ?? 'View source'} ↗</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="related-section" aria-labelledby="related-title">
          <p className="eyebrow muted"><span /> Next</p>
          <h2 id="related-title">Related calculators</h2>
          {clusters.length > 0 && (
            <p className="related-lede">
              People working through {clusters.map((cluster) => cluster.label.toLowerCase()).join(' and ')} usually need these next.
            </p>
          )}
          <div className="related-grid">
            {related.map((relatedTool) => (
              <RelatedToolLink href={relatedTool.path} toolId={tool.id} category={tool.category} relatedToolId={relatedTool.id} key={relatedTool.id}>
                <span>{categories[relatedTool.category].name}</span>
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
