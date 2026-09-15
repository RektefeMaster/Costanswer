import Link from '@/components/i18n/LocalizedLink';
import type { Locale } from '@/lib/i18n/locales';
import { siteText, CATEGORY_ES } from '@/lib/i18n/site-copy';
import { localizedHref } from '@/lib/i18n/routing';
import { CategoryArt } from '@/components/site/CategoryArt';
import { JsonLd } from '@/components/seo/JsonLd';
import { HeroDemo } from '@/components/site/HeroDemo';
import { HeroHeadline } from '@/components/site/HeroHeadline';
import { PopularPicks } from '@/components/site/PopularPicks';
import { SalaryPromo } from '@/components/site/SalaryPromo';
import { JobCostPromo } from '@/components/site/JobCostPromo';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { categories, getTool, type CategoryId } from '@/lib/tool-registry';
import { siteConfig } from '@/lib/site-config';

const categoryOrder: CategoryId[] = ['money', 'home', 'car', 'health', 'math', 'everyday', 'education', 'food', 'shopping'];
const toneByCategory: Record<CategoryId, string> = {
  money: 'mint', home: 'amber', car: 'blue', everyday: 'rose', food: 'coral', shopping: 'violet', health: 'rose', math: 'violet', education: 'coral',
};
const exploreQuestions = [
  { tool: getTool('paycheck'), label: 'What’s my take-home paycheck after tax?' },
  { tool: getTool('mortgage-payment'), label: 'What’s a $400,000 mortgage this week?' },
  { tool: getTool('home-affordability'), label: 'How much house can I afford?' },
  { tool: getTool('salary-after-tax'), label: 'What’s $100k after tax in my state?' },
  { tool: getTool('inflation'), label: 'What is $100 from 1990 worth today?' },
  { tool: getTool('electricity-cost'), label: 'How much is my electric bill by state?' },
];

export function HomePage({ locale = 'en-US' }: { locale?: Locale }) {
  const t = (text: string) => siteText(text, locale);
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteConfig.name,
        alternateName: siteConfig.seoTitle,
        url: siteConfig.origin,
        description: siteConfig.description,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteConfig.origin}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> {t("Free calculators")}</p>
          <HeroHeadline locale={locale} />
          <p className="hero-lede"> {t("A mortgage payment from the latest national average rate. A yearly salary from an hourly wage. What $100 in 1990 buys today. Every answer shows the formula it used and the source behind it. Change the numbers until they look like yours.")} </p>

          <form id="answer-search" className="answer-search" action={localizedHref('/search', locale)} role="search">
            <label className="sr-only" htmlFor="q">{t("Search calculators")}</label>
            <span className="search-icon" aria-hidden="true" />
            <input id="q" name="q" type="search" placeholder={t("Search calculators, e.g. hourly to salary")} autoCapitalize="none" autoCorrect="off" enterKeyHint="search" />
            <button type="submit">{t("Search")} <span aria-hidden="true">→</span></button>
          </form>
          <p className="search-hint">{t("Try “can I afford this house” or “what is $100 in 1990 worth today.”")}</p>
        </div>

        <HeroDemo locale={locale} />
      </section>

      <section id="explore" className="category-strip" aria-labelledby="category-title">
        <div className="section-intro">
          <h2 id="category-title">{t("What this actually costs.")}</h2>
          <p className="section-lede"> {t("A mortgage payment from the latest Freddie Mac national average. Take-home pay after federal and state tax. An electric bill against your state’s average. What $100 in 1990 still buys.")} </p>
          <p className="section-lede"> {t("When a page uses Freddie Mac, EIA, BLS, or IRS figures, the source and date sit next to the answer. Open the steps. Change the inputs until they look like yours.")} </p>
          <ul className="topic-prompts">
            {exploreQuestions.map((item) => (
              <li key={item.tool.id}>
                <Link href={item.tool.path}>
                  <span>{t(item.label)}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="category-grid">
          {categoryOrder.map((categoryId, index) => (
            <Link className={`category-card ${toneByCategory[categoryId]}`} href={`/topics/${categoryId}`} key={categoryId}>
              <CategoryArt category={categoryId} />
              <span className="category-topline">
                <span className="category-number">0{index + 1}</span>
                <span className="category-arrow" aria-hidden="true">↗</span>
              </span>
              <span className="category-copy">
                <strong>{locale === 'es-US' ? CATEGORY_ES[categoryId].name : categories[categoryId].name}</strong>
                <small>{locale === 'es-US' ? CATEGORY_ES[categoryId].blurb : categories[categoryId].blurb}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <SalaryPromo locale={locale} />

      <JobCostPromo locale={locale} />

      <PopularPicks locale={locale} />

      <section id="method" className="trust-bar">
        <p>{t("These are estimates.")}</p>
        <ul>
          <li><span>01</span> {t("Public U.S. data when we use it")}</li>
          <li><span>02</span> {t("The steps sit under the answer")}</li>
          <li><span>03</span> {t("Works on a phone")}</li>
        </ul>
      </section>
      </main>
      <SiteFooter />
    </>
  );
}
