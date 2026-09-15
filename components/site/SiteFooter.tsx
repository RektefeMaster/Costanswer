import Link from '@/components/i18n/LocalizedLink';
import { siteConfig } from '@/lib/site-config';
import { categories, CATEGORY_IDS } from '@/lib/categories';
import { occupationHeadingName } from '@/lib/salary-content';
import { occupationHeadingEs } from '@/lib/salary-content-es';
import {
  FOOTER_SALARY_OCCUPATIONS,
  salaryFamilyPath,
  salaryOccupationPath,
  salaryStateIndexPath,
} from '@/lib/salary-pages';
import { salaryFamilyPathEs, salaryOccupationPathEs, salaryStateIndexPathEs } from '@/lib/salary-es-pages';
import { JOB_CATALOG } from '@/lib/job/catalog';
import { CATEGORY_ES, siteText } from '@/lib/i18n/site-copy';
import { chrome } from '@/lib/i18n/chrome';
import { requestLocale } from '@/lib/i18n/request-locale';
import { LanguageSwitcher } from '@/components/site/LanguageSwitcher';

export async function SiteFooter() {
  const locale = await requestLocale();
  const t = (text: string) => siteText(text, locale);
  const homeHref = locale === 'es-US' ? '/es' : '/';
  const salaryRoot = locale === 'es-US' ? salaryFamilyPathEs() : salaryFamilyPath();
  const stateIndex = locale === 'es-US' ? salaryStateIndexPathEs() : salaryStateIndexPath();
  const occupationHref = locale === 'es-US' ? salaryOccupationPathEs : salaryOccupationPath;
  const occupationName = locale === 'es-US' ? occupationHeadingEs : occupationHeadingName;

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-lead">
          <Link className="brand brand-footer" href={homeHref} aria-label={`${siteConfig.name} home`}>
            <span className="brand-mark" aria-hidden="true">C</span>
            <span>Cost<span>Answer</span></span>
          </Link>
          <p>{locale === 'es-US' ? 'Sueldos y calculadoras de EE. UU. con la cifra oficial y la cuenta a la vista.' : siteConfig.tagline}</p>
          <LanguageSwitcher />
        </div>
        <nav className="footer-nav-topics" aria-labelledby="footer-topics-heading">
          <p id="footer-topics-heading" className="footer-kicker">{chrome('topics', locale)}</p>
          <div className="footer-topics">
            {CATEGORY_IDS.map((categoryId) => (
              <Link href={`/topics/${categoryId}`} key={categoryId}>{locale === 'es-US' ? CATEGORY_ES[categoryId].name : categories[categoryId].name}</Link>
            ))}
          </div>
        </nav>
        <nav className="footer-nav-salary" aria-labelledby="footer-salary-heading">
          <p id="footer-salary-heading" className="footer-kicker">{chrome('salaries', locale)}</p>
          <div className="footer-salary-links">
            <Link href={salaryRoot}>{chrome('whatJobsPay', locale)}</Link>
            <Link href={stateIndex}>{chrome('payByState', locale)}</Link>
            {FOOTER_SALARY_OCCUPATIONS.map((occupation) => (
              <Link href={occupationHref(occupation)} key={occupation.code}>{occupationName(occupation)}</Link>
            ))}
            <Link href="/cost">{chrome('jobCosts', locale)}</Link>
            <Link href="/cost/estimate">{t("Estimate a job")}</Link>
            <Link href="/cost/check-quote">{t("Check a quote")}</Link>
            <Link href="/cost/hvac-replacement">{t(JOB_CATALOG['hvac-replacement'].shortTitle)}</Link>
            <Link href="/cost/tree-removal">{t(JOB_CATALOG['tree-removal'].shortTitle)}</Link>
          </div>
        </nav>
        <nav className="footer-nav-site" aria-labelledby="footer-site-heading">
          <p id="footer-site-heading" className="footer-kicker">{chrome('theSite', locale)}</p>
          <Link href="/about">{chrome('about', locale)}</Link>
          <Link href="/faq">{chrome('faq', locale)}</Link>
          <Link href="/methodology">{chrome('methodology', locale)}</Link>
          <Link href="/methodology/data">{chrome('dataSources', locale)}</Link>
          <Link href="/contact">{chrome('contact', locale)}</Link>
        </nav>
        <nav className="footer-nav-legal" aria-labelledby="footer-legal-heading">
          <p id="footer-legal-heading" className="footer-kicker">{chrome('legal', locale)}</p>
          <Link href="/terms">{chrome('terms', locale)}</Link>
          <Link href="/privacy">{chrome('privacy', locale)}</Link>
          <Link href="/disclosure">{chrome('disclosure', locale)}</Link>
        </nav>
      </div>
      <p className="footer-legal">
        © {new Date().getUTCFullYear()} {siteConfig.name}. {chrome('footerLegal', locale)}
        {' '}
        <Link href="/terms">{chrome('terms', locale)}</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/privacy">{chrome('privacy', locale)}</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/disclosure">{chrome('disclosure', locale)}</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/faq">{chrome('faq', locale)}</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/contact">{chrome('contact', locale)}</Link>
      </p>
    </footer>
  );
}
