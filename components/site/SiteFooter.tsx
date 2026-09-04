import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { categories, CATEGORY_IDS } from '@/lib/categories';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-lead">
          <Link className="brand brand-footer" href="/" aria-label={`${siteConfig.name} home`}>
            <span className="brand-mark" aria-hidden="true">C</span>
            <span>Cost<span>Answer</span></span>
          </Link>
          <p>{siteConfig.tagline}</p>
        </div>
        <nav className="footer-nav-topics" aria-labelledby="footer-topics-heading">
          <p id="footer-topics-heading" className="footer-kicker">Topics</p>
          <div className="footer-topics">
            {CATEGORY_IDS.map((categoryId) => (
              <Link href={`/topics/${categoryId}`} key={categoryId}>{categories[categoryId].name}</Link>
            ))}
          </div>
        </nav>
        <nav className="footer-nav-site" aria-labelledby="footer-site-heading">
          <p id="footer-site-heading" className="footer-kicker">The site</p>
          <Link href="/about">About</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/methodology/data">Data sources</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <nav className="footer-nav-legal" aria-labelledby="footer-legal-heading">
          <p id="footer-legal-heading" className="footer-kicker">Legal</p>
          <Link href="/terms">User agreement</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>
      <p className="footer-legal">
        © {new Date().getUTCFullYear()} {siteConfig.name}. Independently published calculators, not a licensed advisory firm. Estimates for informational use. Not legal, tax, medical, or financial advice.
        {' '}
        <Link href="/terms">User agreement</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/privacy">Privacy</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/faq">FAQ</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/contact">Contact</Link>
      </p>
    </footer>
  );
}
