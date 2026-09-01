/* Vinext beta currently duplicates React during next/link HMR; plain crawlable anchors avoid that runtime fault. */
/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  CATEGORY_IDS,
  categories,
  getToolsByCategory,
  isCategoryHubIndexable,
  isCategoryId,
} from '@/lib/tool-registry';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return CATEGORY_IDS.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  if (!isCategoryId(category)) return {};
  const definition = categories[category];
  return pageMetadata(
    `${definition.name} calculators and answers`,
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
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: definition.name, path: `/topics/${category}` }])} />
      <SiteHeader />
      <main className={`topic-page accent-${definition.accent}`}>
        <header className="topic-hero">
          <nav className="breadcrumbs" aria-label="Breadcrumb"><span><a href="/">Home</a></span><span><b aria-hidden="true">/</b><span aria-current="page">{definition.name}</span></span></nav>
          <p className="eyebrow"><span /> HowMuchUSA topic</p>
          <h1>{definition.name}</h1>
          <p>{definition.description}</p>
        </header>
        <section className="topic-tool-list" aria-labelledby="tools-heading">
          <div><p className="eyebrow muted"><span /> Available now</p><h2 id="tools-heading">Useful tools,<br />not placeholders.</h2></div>
          <div>
            {categoryTools.map((tool, index) => (
              <a href={tool.path} key={tool.id}>
                <span className="topic-tool-number">0{index + 1}</span>
                <span><strong>{tool.title}</strong><small>{tool.description}</small></span>
                <span className="quality-chip">
                  {tool.indexability.provenanceStatus === 'verified' ? 'Source reviewed' : 'Deterministic'}
                </span>
                <b aria-hidden="true">→</b>
              </a>
            ))}
          </div>
        </section>
        <section className="quality-note">
          <p>Why only {categoryTools.length}?</p>
          <h2>Every indexable page must earn its place.</h2>
          <p>We publish a tool when it offers distinct functionality, visible assumptions, sufficient answer depth, crawlable context, and—when data is involved—auditable provenance. Page count is not the goal.</p>
          <a href="/methodology">Read our publishing method →</a>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
