import Link from 'next/link';
import type { ReactNode } from 'react';
import { categories, getRelatedTools, type ToolDefinition } from '@/lib/tool-registry';
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
              <h2>This is an estimate.</h2>
              <p>{caution ?? 'Check the numbers that matter. Open what we assumed. Compare with a bill or a quote if you have one.'}</p>
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
