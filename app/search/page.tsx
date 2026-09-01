import { SearchExperience } from '@/components/search/SearchExperience';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Find a tool',
  'Search HowMuchUSA calculators and practical answer tools by the question you want to solve.',
  '/search',
  { index: false, follow: true },
);

export default function SearchPage() {
  return (
    <>
      <SiteHeader />
      <main className="search-page">
        <header>
          <p className="eyebrow"><span /> Search by intent</p>
          <h1>What do you want<br />to figure out?</h1>
          <p>Describe the decision—not the name of a calculator.</p>
        </header>
        <SearchExperience />
      </main>
      <SiteFooter />
    </>
  );
}
