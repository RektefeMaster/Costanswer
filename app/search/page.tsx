import { salaryHubModel } from '@/lib/salary-hub';
import { requestLocale } from '@/lib/i18n/request-locale';
import { siteText } from '@/lib/i18n/site-copy';
import { SearchExperience } from '@/components/search/SearchExperience';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { salarySearchIndex } from '@/lib/salary-pages';
import { jobSearchIndex } from '@/lib/job/catalog';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Search calculators',
  'Find how much something costs, or what a job pays. Salaries by occupation, hourly pay, electricity, concrete, and more.',
  '/search',
  { index: false, follow: true },
);

export default async function SearchPage() {
  const locale = await requestLocale();
  const t = (text: string) => siteText(text, locale);
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="search-page">
        <header>
          <p className="eyebrow"><span /> {t("Search")}</p>
          <h1>{t("Find a calculator")}</h1>
          <p>{t("Type what you are trying to figure out. A job title, hourly pay, an electric bill, a concrete slab, cheaper states.")}</p>
        </header>
        {/* The occupation index is built here so the browser only carries it on
            this page, and never carries the wage columns behind it. */}
        <SearchExperience salaryIndex={locale === 'es-US' ? salaryHubModel('es-US').groups.flatMap((group) => group.members.map((item) => ({ slug: item.path.split('/').at(-1)!, name: item.name, code: item.code, terms: [item.haystack] }))) : salarySearchIndex()} jobIndex={jobSearchIndex()} />
      </main>
      <SiteFooter />
    </>
  );
}
