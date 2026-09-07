import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { categories, CATEGORY_IDS } from '@/lib/categories';
import { occupationHeadingName } from '@/lib/salary-content';
import { FOOTER_SALARY_OCCUPATIONS, salaryFamilyPath, salaryOccupationPath, salaryStateIndexPath } from '@/lib/salary-pages';
import { JOB_CATALOG } from '@/lib/job/catalog';

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
        {/*
          The salary family is 31,000 pages reached from one hub. Linking that
          hub from every page in the site is what gives a crawler a path to it
          at all — a sitemap alone leaves the whole family an orphan.
        */}
        <nav className="footer-nav-salary" aria-labelledby="footer-salary-heading">
          <p id="footer-salary-heading" className="footer-kicker">Salaries</p>
          <div className="footer-salary-links">
            <Link href={salaryFamilyPath()}>What jobs pay</Link>
            <Link href={salaryStateIndexPath()}>Pay by state</Link>
            {FOOTER_SALARY_OCCUPATIONS.map((occupation) => (
              <Link href={salaryOccupationPath(occupation)} key={occupation.code}>{occupationHeadingName(occupation)}</Link>
            ))}
            <Link href="/cost">Job costs</Link>
            <Link href="/cost/estimate">Estimate a job</Link>
            <Link href="/cost/check-quote">Check a quote</Link>
            <Link href="/cost/hvac-replacement">{JOB_CATALOG['hvac-replacement'].shortTitle}</Link>
            <Link href="/cost/tree-removal">{JOB_CATALOG['tree-removal'].shortTitle}</Link>
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
          <Link href="/disclosure">Disclosure</Link>
        </nav>
      </div>
      <p className="footer-legal">
        © {new Date().getUTCFullYear()} {siteConfig.name}. Independently published calculators, not a licensed advisory firm. Estimates for informational use. Not legal, tax, medical, or financial advice.
        {' '}
        <Link href="/terms">User agreement</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/privacy">Privacy</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/disclosure">Disclosure</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/faq">FAQ</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/contact">Contact</Link>
      </p>
    </footer>
  );
}
