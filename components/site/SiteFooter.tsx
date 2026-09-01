/* Vinext beta currently duplicates React during next/link HMR; plain crawlable anchors avoid that runtime fault. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { categories, CATEGORY_IDS } from '@/lib/tool-registry';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-lead">
        <a className="brand brand-footer" href="/" aria-label="HowMuchUSA home">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span>HowMuch<span>USA</span></span>
        </a>
        <p>Clear numbers. Visible assumptions. Sources you can inspect.</p>
      </div>
      <nav aria-label="Footer topics">
        {CATEGORY_IDS.map((categoryId) => (
          <a href={`/topics/${categoryId}`} key={categoryId}>{categories[categoryId].name}</a>
        ))}
      </nav>
      <nav aria-label="Footer information">
        <a href="/methodology">Methodology</a>
        <a href="/methodology/data">Data sources</a>
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
      </nav>
      <p className="footer-legal">© {new Date().getUTCFullYear()} HowMuchUSA. Estimates are informational and are not professional advice.</p>
    </footer>
  );
}
