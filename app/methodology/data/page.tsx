import { InfoPage } from '@/components/site/InfoPage';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Data sources and provenance',
  'Current authoritative datasets, versions, observation dates and validation status used by HowMuchUSA.',
  '/methodology/data',
);

export default function DataSourcesPage() {
  return (
    <InfoPage eyebrow="Data inventory" title="Know which numbers are current." intro="Externally sourced values are published as named, immutable snapshots. Tool pages link back to this provenance instead of hiding it in code.">
      <section className="dataset-card">
        <p><span className="status-dot" /> VALIDATED SNAPSHOT</p>
        <h2>EIA residential electricity prices by state</h2>
        <dl>
          <div><dt>Snapshot</dt><dd>{electricitySnapshot.snapshotId}</dd></div>
          <div><dt>Observation period</dt><dd>{electricitySnapshot.observationPeriod}</dd></div>
          <div><dt>Source status</dt><dd>{electricitySnapshot.sourceStatus}</dd></div>
          <div><dt>Geographies</dt><dd>{electricitySnapshot.states.length} states/DC rows</dd></div>
          <div><dt>Adapter</dt><dd>{electricitySnapshot.adapterVersion}</dd></div>
          <div><dt>Schema</dt><dd>{electricitySnapshot.schemaVersion}</dd></div>
        </dl>
        <p>{electricitySnapshot.attribution}</p>
        <ul>{electricitySnapshot.validationReport.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className="dataset-links"><a href={electricitySnapshot.sourceDocumentationUrl}>API documentation ↗</a><a href={electricitySnapshot.termsUrl}>Terms of service ↗</a></p>
      </section>
      <h2>Important interpretation</h2>
      <p>The electricity figure is an average retail price for residential sales in a state, derived from aggregate revenue and sales. It is not a utility tariff, quote, or promise about an individual bill. Tools therefore expose an editable rate.</p>
      <h2>Update policy</h2>
      <p>A normal new-period append may publish after every validation passes. Unit changes, missing states, duplicates, historical revisions, schema changes or abnormal movements are quarantined for review. Failure leaves the last verified snapshot live.</p>
    </InfoPage>
  );
}
