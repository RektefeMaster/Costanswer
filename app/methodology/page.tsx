import { InfoPage } from '@/components/site/InfoPage';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Methodology',
  'How HowMuchUSA builds, validates, explains and publishes practical calculators and data-backed answers.',
  '/methodology',
);

export default function MethodologyPage() {
  return (
    <InfoPage eyebrow="Our operating standard" title="An answer should show its work." intro="HowMuchUSA separates formulas, source data, assumptions and presentation so a useful result can also be inspected.">
      <h2>Calculations live outside the interface</h2>
      <p>Each calculator uses a typed, independently tested domain function. The page collects inputs and formats outputs; it does not own the formula. Every result identifies a calculation version and any dataset snapshot it used.</p>
      <h2>External data fails closed</h2>
      <p>Runtime pages do not call government APIs. An update is fetched, retained, validated, normalized and compared with the published snapshot. Only a candidate that passes transport, schema, unit, completeness and anomaly checks can be promoted.</p>
      <h2>Estimates show uncertainty</h2>
      <p>Geometry can be exact while the amount someone should buy is not. Estimated-cost and material tools separate measured values from planning allowances, ranges and factors that can change the answer.</p>
      <h2>Indexing is a quality decision</h2>
      <p>A generated page must have real data or function, visible provenance, meaningful depth, crawlable links and a distinct user purpose. It must score at least 75/100 in our quality model before it can enter a sitemap.</p>
      <h2>Corrections</h2>
      <p>If an official source revises a value or a formula defect is found, the dataset or calculation version changes. Previous snapshots remain identifiable so the difference can be traced.</p>
      <p><a href="/methodology/data">Inspect the current data inventory →</a></p>
    </InfoPage>
  );
}
