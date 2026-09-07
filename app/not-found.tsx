import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { categories, CATEGORY_IDS, getTool } from '@/lib/tool-registry';

/**
 * The 404 page.
 *
 * The framework default is a bare "This page could not be found" with no
 * header, no footer and no link out of it. On a site whose whole shape is a
 * link graph — 900 indexable URLs, a family that renumbers when BLS publishes,
 * and a catalogue people reach by guessing at addresses — that default is a
 * dead end for the reader and a dead end for a crawler that followed a stale
 * link. This one keeps the site's own navigation, offers the search box that
 * would have answered the question, and names the places worth trying.
 *
 * It carries no canonical of its own: a 404 is not a version of another page,
 * and the status code is what search engines act on regardless.
 */

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'That address is not a page on CostAnswer. Search the calculators, or start from a topic.',
  robots: { index: false, follow: true },
};

const SUGGESTED_TOOL_IDS = [
  'hourly-to-salary',
  'salary-after-tax',
  'mortgage-payment',
  'paycheck',
  'inflation',
  'electricity-cost',
] as const;

export default function NotFound() {
  const suggestions = SUGGESTED_TOOL_IDS.map((id) => getTool(id));

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="info-page not-found-page">
        <header>
          <div>
            <p className="eyebrow"><span /> Error 404</p>
            <h1>That page is not here.</h1>
          </div>
          <div className="info-lede-block">
            <p className="info-lede">
              The address you followed does not match a calculator, a topic, a job or an
              occupation on this site. Nothing is broken — the page simply does not exist.
            </p>
          </div>
        </header>

        <article className="info-article">
          <form className="answer-search" action="/search" role="search">
            <label className="sr-only" htmlFor="not-found-q">Search calculators</label>
            <span className="search-icon" aria-hidden="true" />
            <input
              id="not-found-q"
              name="q"
              type="search"
              placeholder="Search calculators, e.g. hourly to salary"
              autoCapitalize="none"
              autoCorrect="off"
              enterKeyHint="search"
            />
            <button type="submit">Search <span aria-hidden="true">→</span></button>
          </form>

          <h2>Popular calculators</h2>
          <ul className="not-found-links">
            {suggestions.map((tool) => (
              <li key={tool.id}><Link href={tool.path}>{tool.title}</Link></li>
            ))}
          </ul>

          <h2>Browse by topic</h2>
          <ul className="not-found-links">
            {CATEGORY_IDS.map((id) => (
              <li key={id}><Link href={`/topics/${id}`}>{categories[id].name}</Link></li>
            ))}
            <li><Link href="/salary">Salaries by job</Link></li>
            <li><Link href="/cost">What a job should cost</Link></li>
          </ul>

          <p>
            If a link on this site sent you here, that is a defect worth
            reporting — <Link href="/contact">tell us where it was</Link>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
