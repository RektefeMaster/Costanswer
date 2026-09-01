import type { ReactNode } from 'react';
import { categories, getRelatedTools, type ToolDefinition } from '@/lib/tool-registry';
import { breadcrumbJsonLd, toolJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { AdSlot } from '@/components/monetization/AdSlot';

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
    { name: 'Home', path: '/' },
    { name: category.name, path: `/topics/${tool.category}` },
    { name: tool.shortTitle, path: tool.path },
  ];

  return (
    <>
      <JsonLd data={[toolJsonLd(tool), breadcrumbJsonLd(breadcrumbs)]} />
      <SiteHeader />
      <main>
        <header className={`tool-hero accent-${tool.accent}`}>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((item, index) => (
              <span key={item.path}>
                {index > 0 && <b aria-hidden="true">/</b>}
                {index === breadcrumbs.length - 1 ? <span aria-current="page">{item.name}</span> : <a href={item.path}>{item.name}</a>}
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
              <ul>
                <li>Calculation logic is versioned</li>
                <li>Assumptions stay visible</li>
                <li>No account or personal data required</li>
              </ul>
            </div>
          </div>
        </header>

        <div className="tool-workspace">
          <div className="tool-main-column">{children}</div>
          <aside className="tool-rail" aria-label="Tool information">
            <div className="rail-card">
              <p className="rail-kicker">BEFORE YOU DECIDE</p>
              <h2>Use the result as a starting point.</h2>
              <p>{caution ?? 'Check the inputs that matter most, review the assumptions, and compare the result with a real quote or statement when available.'}</p>
            </div>
            <AdSlot placement="desktop-rail" />
          </aside>
        </div>

        <section className="method-section" aria-labelledby="method-title">
          <div className="method-heading">
            <p className="eyebrow muted"><span /> Transparent by design</p>
            <h2 id="method-title">How this answer works.</h2>
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
              <p className="eyebrow muted"><span /> Provenance</p>
              <h2 id="sources-title">Sources you can inspect.</h2>
            </div>
            <div className="source-list">
              {sources.map((source) => (
                <a href={source.href} key={source.href} target="_blank" rel="noreferrer">
                  <span><strong>{source.name}</strong><small>{source.detail}</small></span>
                  <span>{source.dateLabel ?? 'Open source'} ↗</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="related-section" aria-labelledby="related-title">
          <p className="eyebrow muted"><span /> Keep going</p>
          <h2 id="related-title">Related decisions</h2>
          <div className="related-grid">
            {related.map((relatedTool) => (
              <a href={relatedTool.path} key={relatedTool.id}>
                <span>{categories[relatedTool.category].name}</span>
                <strong>{relatedTool.shortTitle}</strong>
                <small>{relatedTool.description}</small>
                <b aria-hidden="true">→</b>
              </a>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

