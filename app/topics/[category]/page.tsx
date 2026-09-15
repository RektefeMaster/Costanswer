import { requestLocale } from '@/lib/i18n/request-locale';
import { CATEGORY_ES, siteText } from '@/lib/i18n/site-copy';
import { localizedTool } from '@/lib/i18n/tool-copy';
import { localizedHref } from '@/lib/i18n/routing';
import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
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
  const locale = await requestLocale();
  const t = (text: string) => siteText(text, locale);
  const definition = locale === 'es-US' ? { ...categories[category], ...CATEGORY_ES[category] } : categories[category];
  return pageMetadata(
    `${definition.name} ${locale === 'es-US' ? '· Calculadoras' : 'calculators'}`,
    definition.description,
    localizedHref(`/topics/${category}`, locale) as `/${string}`,
    { index: isCategoryHubIndexable(category), follow: true },
  );
}

export default async function TopicPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isCategoryId(category)) notFound();
  const locale = await requestLocale();
  const t = (text: string) => siteText(text, locale);
  const definition = locale === 'es-US' ? { ...categories[category], ...CATEGORY_ES[category] } : categories[category];
  const categoryTools = getToolsByCategory(category).map((tool) => localizedTool(tool, locale));
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: siteConfig.name, path: '/' }, { name: definition.name, path: `/topics/${category}` }])} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={`topic-page accent-${definition.accent}`}>
        <header className="topic-hero">
          <div className="topic-hero-mark" aria-hidden="true">
            <CategoryArt category={category} priority />
          </div>
          <nav className="breadcrumbs" aria-label={t("Breadcrumb")}><span><Link href="/">{siteConfig.name}</Link></span><span><b aria-hidden="true">/</b><span aria-current="page">{definition.name}</span></span></nav>
          <p className="eyebrow"><span /> {definition.name} {t('Calculators')}</p>
          <h1>{definition.name}</h1>
          <p>{definition.description}</p>
        </header>
        <section className="topic-tool-list" aria-labelledby="tools-heading">
          <div className="topic-tool-intro">
            <p className="eyebrow muted"><span /> {t("In this topic")}</p>
            <h2 id="tools-heading">{t("Calculators")}</h2>
          </div>
          <div className="topic-tool-rows">
            {categoryTools.map((tool, index) => (
              <Link className="topic-tool-card" href={tool.path} key={tool.id}>
                <span className="topic-tool-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="topic-tool-copy">
                  <strong>{tool.title}</strong>
                  <small>{tool.description}</small>
                </span>
                <span className="topic-tool-meta">
                  <span className="quality-chip">
                    {tool.indexability.provenanceStatus === 'verified' ? t('Public data') : t('Your numbers')}
                  </span>
                  <span className="topic-tool-arrow" aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        {category === 'money' && (
          <section className="quality-note">
            <p>{t("Also here")}</p>
            <h2>{t("What each job pays, state by state.")}</h2>
            <p>{t("Federal wage-survey medians for hundreds of occupations, with take-home pay and local price levels.")}</p>
            <Link href="/salary">{t("Salaries by occupation →")}</Link>
          </section>
        )}
        <section className="quality-note">
          <p>{t("How these are built")}</p>
          <h2>{t("Every calculator shows its work.")}</h2>
          <p>{t("Each one names the formula it used, and the dated official source behind any figure it did not get from you.")}</p>
          <Link href="/methodology">{t("How the numbers work →")}</Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
