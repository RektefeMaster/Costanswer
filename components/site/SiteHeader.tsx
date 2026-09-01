/* Vinext beta currently duplicates React during next/link HMR; plain crawlable anchors avoid that runtime fault. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { categories, CATEGORY_IDS } from '@/lib/tool-registry';

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="HowMuchUSA home">
        <span className="brand-mark" aria-hidden="true">H</span>
        <span>HowMuch<span>USA</span></span>
      </a>
      <nav className="top-nav" aria-label="Primary navigation">
        {CATEGORY_IDS.slice(0, 4).map((categoryId) => (
          <a href={`/topics/${categoryId}`} key={categoryId}>{categories[categoryId].name}</a>
        ))}
      </nav>
      <a className="header-search" href="/search">Find an answer</a>
    </header>
  );
}
