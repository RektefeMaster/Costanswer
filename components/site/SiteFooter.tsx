import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { categories, CATEGORY_IDS } from '@/lib/categories';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-lead">
        <Link className="brand brand-footer" href="/" aria-label={`${siteConfig.name} home`}>
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>Cost<span>Answer</span></span>
        </Link>
        <p>How much everyday things cost in the U.S.</p>
      </div>
      <nav aria-label="Footer topics">
        {CATEGORY_IDS.map((categoryId) => (
          <Link href={`/topics/${categoryId}`} key={categoryId}>{categories[categoryId].name}</Link>
        ))}
      </nav>
      <nav aria-label="Footer information">
        <Link href="/methodology">Methodology</Link>
        <Link href="/methodology/data">Data sources</Link>
        <Link href="/about">About</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      <p className="footer-legal">© {new Date().getUTCFullYear()} {siteConfig.name}. Estimates only. Not legal, tax, or financial advice.</p>
    </footer>
  );
}
