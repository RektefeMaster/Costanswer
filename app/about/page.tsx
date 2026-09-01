import { InfoPage } from '@/components/site/InfoPage';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('About', 'Why HowMuchUSA exists and what makes its answers different.', '/about');

export default function AboutPage() {
  return (
    <InfoPage eyebrow="About HowMuchUSA" title="Practical questions deserve more than a mystery number." intro="We build small decision tools around transparent math, trustworthy source data and the context needed to use an answer well.">
      <h2>One coherent answer platform</h2>
      <p>Money, home projects, cars, dates, food and shopping look unrelated on a menu. Underneath, they reuse the same capabilities: units, dates, location, prices, ranges, comparisons and source provenance.</p>
      <h2>What we will not do</h2>
      <p>We do not invent local market prices, publish thousands of place-name swaps, call an average a personal quote, or hide uncertainty to make a result look more precise.</p>
      <h2>What comes next</h2>
      <p>Expansion follows measured demand and reusable engines. Salary and inflation datasets, more energy decisions, material estimators and carefully qualified local benchmarks are planned only after their data pipelines and quality gates are ready.</p>
    </InfoPage>
  );
}
