import { JsonLd } from '@/components/seo/JsonLd';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { categories, getTool, type CategoryId } from '@/lib/tool-registry';
import { siteConfig } from '@/lib/site-config';

const categoryOrder: CategoryId[] = ['money', 'home', 'auto', 'everyday', 'food', 'shopping'];
const toneByCategory: Record<CategoryId, string> = {
  money: 'mint', home: 'amber', auto: 'blue', everyday: 'rose', food: 'coral', shopping: 'violet',
};
const featuredTools = ['hourly-to-salary', 'electricity-cost', 'unit-price'].map(getTool);

export default function Home() {
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteConfig.name,
        url: siteConfig.origin,
        description: siteConfig.description,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteConfig.origin}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }} />
      <SiteHeader />
      <main>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Practical answers for life in America</p>
          <h1>Make the numbers<br />make <em>sense.</em></h1>
          <p className="hero-lede">
            Costs, paychecks, projects, purchases and everyday math—clear answers,
            transparent assumptions, and sources you can check.
          </p>

          <form id="answer-search" className="answer-search" action="/search" role="search">
            <label className="sr-only" htmlFor="q">What do you want to figure out?</label>
            <span className="search-icon" aria-hidden="true" />
            <input id="q" name="q" type="search" placeholder="What do you want to figure out?" />
            <button type="submit">Find my answer <span aria-hidden="true">→</span></button>
          </form>
          <p className="search-hint">Try “hourly wage to salary” or “how much paint do I need?”</p>
        </div>

        <div className="hero-demo" aria-label="Example calculation">
          <div className="demo-topline">
            <span className="live-dot">LIVE EXAMPLE</span>
            <span>Updated instantly</span>
          </div>
          <p className="demo-kicker">$28 an hour is how much a year?</p>
          <div className="demo-answer">
            <span>$58,240</span>
            <small>per year</small>
          </div>
          <div className="demo-math">
            <span>$28.00/hour</span><b>×</b><span>40 hours</span><b>×</b><span>52 weeks</span>
          </div>
          <div className="demo-footer">
            <span>Before taxes · 2,080 work hours</span>
            <a href="/money/hourly-to-salary">Open calculator →</a>
          </div>
        </div>
      </section>

      <section id="explore" className="category-strip" aria-labelledby="category-title">
        <div className="section-intro">
          <p className="eyebrow muted"><span /> Start with a topic</p>
          <h2 id="category-title">Answers built around<br />real decisions.</h2>
        </div>
        <div className="category-grid">
          {categoryOrder.map((categoryId, index) => (
            <a className={`category-card ${toneByCategory[categoryId]}`} href={`/topics/${categoryId}`} key={categoryId}>
              <span className="category-number">0{index + 1}</span>
              <span className="category-arrow" aria-hidden="true">↗</span>
              <strong>{categories[categoryId].name}</strong>
              <small>{categories[categoryId].description}</small>
            </a>
          ))}
        </div>
      </section>

      <section id="popular" className="popular-section" aria-labelledby="popular-title">
        <div>
          <p className="eyebrow muted"><span /> Popular right now</p>
          <h2 id="popular-title">A useful answer<br />is a few inputs away.</h2>
          <p>Every result shows the math, the assumptions, and when the underlying data was updated.</p>
        </div>
        <div className="question-list">
          {featuredTools.map((tool, index) => (
            <a href={tool.path} key={tool.id}>
              <span className="question-index">0{index + 1}</span>
              <span><strong>{tool.shortTitle}</strong><small>{tool.description}</small></span>
              <span className="question-category">{categories[tool.category].name}</span>
              <span className="question-arrow" aria-hidden="true">→</span>
            </a>
          ))}
        </div>
      </section>

      <section id="method" className="trust-bar">
        <p>Built for decisions, not clicks.</p>
        <ul>
          <li><span>01</span> Sources you can inspect</li>
          <li><span>02</span> Assumptions made visible</li>
          <li><span>03</span> Mobile-first by default</li>
        </ul>
      </section>
      </main>
      <SiteFooter />
    </>
  );
}
