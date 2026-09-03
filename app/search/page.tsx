import { SearchExperience } from '@/components/search/SearchExperience';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Search calculators',
  'Find how much something costs. Hourly pay, electricity, concrete, and more.',
  '/search',
  { index: false, follow: true },
);

export default function SearchPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="search-page">
        <header>
          <p className="eyebrow"><span /> Search</p>
          <h1>Find a calculator</h1>
          <p>Type what you are trying to figure out. Hourly pay, an electric bill, a concrete slab, cheaper states.</p>
        </header>
        <SearchExperience />
      </main>
      <SiteFooter />
    </>
  );
}
