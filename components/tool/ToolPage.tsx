import Link from 'next/link';
import type { ReactNode } from 'react';
import { categories, getRelatedTools, type ResultNature, type ToolDefinition } from '@/lib/tool-registry';
import { siteConfig } from '@/lib/site-config';
import { breadcrumbJsonLd, toolJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { AdSlot } from '@/components/monetization/AdSlot';
import { RelatedToolLink } from '@/components/analytics/RelatedToolLink';

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
  const breadcrumbs = [
    { name: siteConfig.name, path: '/' },
    { name: category.name, path: `/topics/${tool.category}` },
    { name: tool.shortTitle, path: tool.path },
  ];

  return (
    <>
      <JsonLd data={[toolJsonLd(tool), breadcrumbJsonLd(breadcrumbs)]} />
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

        <div className="tool-workspace">
          <div className="tool-main-column">{children}</div>
          <aside className="tool-rail" aria-label="Tool information">
            <div className="rail-card">
              <p className="rail-kicker">Note</p>
              <h2>{RESULT_NOTES[tool.resultNature].heading}</h2>
              <p>{caution ?? RESULT_NOTES[tool.resultNature].body}</p>
            </div>
            <AdSlot placement="desktop-rail" />
          </aside>
        </div>

        <section className="method-section" aria-labelledby="method-title">
          <div className="method-heading">
            <p className="eyebrow muted"><span /> Method</p>
            <h2 id="method-title">How this works</h2>
          </div>
          <div className="method-grid">
            {methodology.map((item, index) => (
              <article key={item.title}>
                <span>0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

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
