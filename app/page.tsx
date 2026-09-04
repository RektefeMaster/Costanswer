import Link from 'next/link';
import { CategoryArt } from '@/components/site/CategoryArt';
import { JsonLd } from '@/components/seo/JsonLd';
import { HeroDemo } from '@/components/site/HeroDemo';
import { HeroHeadline } from '@/components/site/HeroHeadline';
import { PopularPicks } from '@/components/site/PopularPicks';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { categories, getTool, type CategoryId } from '@/lib/tool-registry';
import { siteConfig } from '@/lib/site-config';

const categoryOrder: CategoryId[] = ['money', 'home', 'auto', 'health', 'math', 'everyday', 'education', 'food', 'shopping'];
const toneByCategory: Record<CategoryId, string> = {
  money: 'mint', home: 'amber', auto: 'blue', everyday: 'rose', food: 'coral', shopping: 'violet', health: 'rose', math: 'violet', education: 'coral',
};
const exploreQuestions = [
  { tool: getTool('hourly-to-salary'), label: 'How much is $28 an hour a year?' },
  { tool: getTool('mortgage-payment'), label: 'What’s a $400,000 mortgage this week?' },
  { tool: getTool('where-cheaper'), label: 'Where are power, gas, and groceries cheaper?' },
];

export default function Home() {
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
          <p className="eyebrow"><span /> Free calculators</p>
          <HeroHeadline />
          <p className="hero-lede">
            A mortgage payment from the latest national average rate. A yearly salary from an hourly wage. What $100 in 1990 buys today.
            Every answer shows the formula it used and the source behind it. Change the numbers until they look like yours.
          </p>

          <form id="answer-search" className="answer-search" action="/search" role="search">
            <label className="sr-only" htmlFor="q">Search calculators</label>
            <span className="search-icon" aria-hidden="true" />
            <input id="q" name="q" type="search" placeholder="Search calculators, e.g. hourly to salary" autoCapitalize="none" autoCorrect="off" enterKeyHint="search" />
            <button type="submit">Search <span aria-hidden="true">→</span></button>
          </form>
          <p className="search-hint">Try “can I afford this house” or “what is $100 in 1990 worth today.”</p>
        </div>

        <HeroDemo />
      </section>

      <section id="explore" className="category-strip" aria-labelledby="category-title">
        <div className="section-intro">
          <h2 id="category-title">What this actually costs.</h2>
          <p className="section-lede">
            A mortgage payment from the latest Freddie Mac national average. Take-home pay after federal and state tax. An electric bill against your state’s average. What $100 in 1990 still buys.
          </p>
          <p className="section-lede">
            When a page uses Freddie Mac, EIA, BLS, or IRS figures, the source and date sit next to the answer. Open the steps. Change the inputs until they look like yours.
          </p>
          <ul className="topic-prompts">
            {exploreQuestions.map((item) => (
              <li key={item.tool.id}>
                <Link href={item.tool.path}>
                  <span>{item.label}</span>
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
                <strong>{categories[categoryId].name}</strong>
                <small>{categories[categoryId].blurb}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <PopularPicks />

      <section id="method" className="trust-bar">
        <p>These are estimates.</p>
        <ul>
          <li><span>01</span> Public U.S. data when we use it</li>
          <li><span>02</span> The steps sit under the answer</li>
          <li><span>03</span> Works on a phone</li>
        </ul>
      </section>
      </main>
      <SiteFooter />
    </>
  );
}
