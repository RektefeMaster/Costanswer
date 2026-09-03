/* Vinext beta currently duplicates React during next/link HMR; plain crawlable anchors avoid that runtime fault. */
/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { CategoryArt } from '@/components/site/CategoryArt';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  CATEGORY_IDS,
  categories,
  getToolsByCategory,
  isCategoryHubIndexable,
  isCategoryId,
} from '@/lib/tool-registry';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export function generateStaticParams() {
  return CATEGORY_IDS.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  if (!isCategoryId(category)) return {};
  const definition = categories[category];
  return pageMetadata(
    `${definition.name} calculators`,
    definition.description,
    `/topics/${category}`,
    { index: isCategoryHubIndexable(category), follow: true },
  );
}

export default async function TopicPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isCategoryId(category)) notFound();
  const definition = categories[category];
  const categoryTools = getToolsByCategory(category);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: siteConfig.name, path: '/' }, { name: definition.name, path: `/topics/${category}` }])} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={`topic-page accent-${definition.accent}`}>
        <header className="topic-hero">
          <div className="topic-hero-mark" aria-hidden="true">
            <CategoryArt category={category} />
          </div>
          <nav className="breadcrumbs" aria-label="Breadcrumb"><span><a href="/">{siteConfig.name}</a></span><span><b aria-hidden="true">/</b><span aria-current="page">{definition.name}</span></span></nav>
          <p className="eyebrow"><span /> {definition.name} calculators</p>
          <h1>{definition.name}</h1>
          <p>{definition.description}</p>
        </header>
        <section className="topic-tool-list" aria-labelledby="tools-heading">
          <div className="topic-tool-intro">
            <p className="eyebrow muted"><span /> In this topic</p>
            <h2 id="tools-heading">Calculators</h2>
          </div>
          <div className="topic-tool-rows">
            {categoryTools.map((tool, index) => (
              <a className="topic-tool-card" href={tool.path} key={tool.id}>
                <span className="topic-tool-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="topic-tool-copy">
                  <strong>{tool.title}</strong>
                  <small>{tool.description}</small>
                </span>
                <span className="topic-tool-meta">
                  <span className="quality-chip">
                    {tool.indexability.provenanceStatus === 'verified' ? 'Public data' : 'Your numbers'}
                  </span>
                  <span className="topic-tool-arrow" aria-hidden="true">→</span>
                </span>
              </a>
            ))}
          </div>
        </section>
        <section className="quality-note">
          <p>Why only {categoryTools.length}?</p>
          <h2>This list will get longer.</h2>
          <p>A calculator goes up when we can explain it. If it uses data, we link to the source.</p>
          <a href="/methodology">How the numbers work →</a>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
