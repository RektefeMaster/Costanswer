import { InfoPage } from '@/components/site/InfoPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { gasolineSnapshot } from '@/lib/data/gasoline-snapshot';
import { grocerySnapshot } from '@/lib/data/grocery-snapshot';
import { mortgageRateSnapshot } from '@/lib/data/mortgage-rate-snapshot';
import { cpiSnapshot } from '@/lib/data/cpi-snapshot';
import { describeCpiMonths, missingCpiMonths } from '@/lib/data/bls-cpi';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { acsSnapshot } from '@/lib/data/acs-snapshot';
import { beaRppSnapshot } from '@/lib/data/bea-rpp-snapshot';
import { resolveHudFmrSnapshot, hudLatestPublishedSnapshot } from '@/lib/data/hud-fmr-snapshot';
import { usdaFoodSnapshot } from '@/lib/data/usda-food-snapshot';
import { gsaPerDiemSnapshot } from '@/lib/data/gsa-perdiem-snapshot';
import { irsRetirementSnapshot } from '@/lib/data/irs-retirement-snapshot';
import { geographySnapshot } from '@/lib/data/geography-snapshot';
import { datasetSourceDisplay, officialDatasetJsonLd } from '@/lib/data/source-display';
import { DATASET_POLICIES } from '@/lib/data/dataset-policy';
import { pageMetadata } from '@/lib/seo';
import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';

export const metadata = pageMetadata(
  'Data sources',
  'EIA, BLS, HUD, Census, BEA, USDA, and Freddie Mac copies used by CostAnswer, with observation dates.',
  '/methodology/data',
);

const electricitySource = datasetSourceDisplay({
  datasetId: 'eia-electricity',
  observationPeriod: electricitySnapshot.observationPeriod,
  sourceStatus: electricitySnapshot.sourceStatus,
  publishedAt: electricitySnapshot.publishedAt,
  verifiedAt: electricitySnapshot.verifiedAt,
  fetchedAt: electricitySnapshot.fetchedAt,
});
const gasolineSource = datasetSourceDisplay({
  datasetId: 'eia-gasoline',
  observationPeriod: gasolineSnapshot.observationPeriod,
  sourceStatus: gasolineSnapshot.sourceStatus,
  publishedAt: gasolineSnapshot.publishedAt,
  verifiedAt: gasolineSnapshot.verifiedAt,
  fetchedAt: gasolineSnapshot.fetchedAt,
});
const grocerySource = datasetSourceDisplay({
  datasetId: 'bls-grocery',
  observationPeriod: grocerySnapshot.observationPeriod,
  sourceStatus: grocerySnapshot.sourceStatus,
  publishedAt: grocerySnapshot.publishedAt,
  verifiedAt: grocerySnapshot.verifiedAt,
  fetchedAt: grocerySnapshot.fetchedAt,
});
const cpiSource = datasetSourceDisplay({
  datasetId: 'bls-cpi',
  observationPeriod: cpiSnapshot.observationPeriod,
  sourceStatus: cpiSnapshot.sourceStatus,
  publishedAt: cpiSnapshot.publishedAt,
  verifiedAt: cpiSnapshot.verifiedAt,
  fetchedAt: cpiSnapshot.fetchedAt,
});
const mortgageSource = datasetSourceDisplay({
  datasetId: 'freddie-mac-pmms',
  observationPeriod: mortgageRateSnapshot.observationPeriod,
  sourceStatus: mortgageRateSnapshot.sourceStatus,
  publishedAt: mortgageRateSnapshot.publishedAt,
  verifiedAt: mortgageRateSnapshot.verifiedAt,
  fetchedAt: mortgageRateSnapshot.fetchedAt,
});
const taxSource = datasetSourceDisplay({
  datasetId: 'us-tax',
  observationPeriod: String(taxSnapshot.taxYear),
  sourceStatus: taxSnapshot.sourceStatus,
  publishedAt: taxSnapshot.publishedAt,
  verifiedAt: taxSnapshot.verifiedAt,
});
const hudEffective = resolveHudFmrSnapshot(PUBLISHING_SNAPSHOT_DATE);
const hudSource = datasetSourceDisplay({
  datasetId: 'hud-fmr',
  observationPeriod: String(hudEffective.fiscalYear),
  sourceStatus: hudEffective.sourceStatus,
  publishedAt: hudEffective.publishedAt,
  verifiedAt: hudEffective.verifiedAt,
  fetchedAt: hudEffective.fetchedAt,
});
const acsSource = datasetSourceDisplay({
  datasetId: 'census-acs5',
  observationPeriod: acsSnapshot.observationPeriod,
  sourceStatus: acsSnapshot.sourceStatus,
  publishedAt: acsSnapshot.publishedAt,
  verifiedAt: acsSnapshot.verifiedAt,
  fetchedAt: acsSnapshot.fetchedAt,
});
const beaSource = datasetSourceDisplay({
  datasetId: 'bea-rpp',
  observationPeriod: beaRppSnapshot.observationPeriod,
  sourceStatus: beaRppSnapshot.sourceStatus,
  publishedAt: beaRppSnapshot.publishedAt,
  verifiedAt: beaRppSnapshot.verifiedAt,
  fetchedAt: beaRppSnapshot.fetchedAt,
});
const usdaSource = datasetSourceDisplay({
  datasetId: 'usda-food-plans',
  observationPeriod: usdaFoodSnapshot.observationPeriod,
  sourceStatus: usdaFoodSnapshot.sourceStatus,
  publishedAt: usdaFoodSnapshot.publishedAt,
  verifiedAt: usdaFoodSnapshot.verifiedAt,
  fetchedAt: usdaFoodSnapshot.fetchedAt,
});
const perDiemSource = datasetSourceDisplay({
  datasetId: 'gsa-perdiem',
  observationPeriod: gsaPerDiemSnapshot.observationPeriod,
  sourceStatus: gsaPerDiemSnapshot.sourceStatus,
  publishedAt: gsaPerDiemSnapshot.publishedAt,
  verifiedAt: gsaPerDiemSnapshot.verifiedAt,
  fetchedAt: gsaPerDiemSnapshot.fetchedAt,
});
const irsRetirementSource = datasetSourceDisplay({
  datasetId: 'irs-retirement-limits',
  observationPeriod: irsRetirementSnapshot.observationPeriod,
  sourceStatus: irsRetirementSnapshot.sourceStatus,
  publishedAt: irsRetirementSnapshot.publishedAt,
  verifiedAt: irsRetirementSnapshot.verifiedAt,
  fetchedAt: irsRetirementSnapshot.fetchedAt,
});

const datasetJsonLd = [
  officialDatasetJsonLd({
    name: 'Freddie Mac weekly mortgage rate averages',
    description: mortgageRateSnapshot.attribution,
    temporalCoverage: mortgageRateSnapshot.observationPeriod,
    dateModified: mortgageRateSnapshot.verifiedAt,
    creatorName: mortgageRateSnapshot.provider,
    sourceUrl: mortgageRateSnapshot.sourceUrl,
  }),
  officialDatasetJsonLd({
    name: 'BLS CPI-U all-items index',
    description: cpiSnapshot.attribution,
    temporalCoverage: `${cpiSnapshot.observations[0]?.period}/${cpiSnapshot.observationPeriod}`,
    dateModified: cpiSnapshot.verifiedAt,
    creatorName: cpiSnapshot.provider,
    sourceUrl: cpiSnapshot.sourceUrl,
  }),
  officialDatasetJsonLd({
    name: 'EIA residential electricity prices by state',
    description: electricitySnapshot.attribution,
    temporalCoverage: electricitySnapshot.observationPeriod,
    dateModified: electricitySnapshot.verifiedAt,
    creatorName: electricitySnapshot.provider,
    sourceUrl: electricitySnapshot.sourceUrl,
  }),
  officialDatasetJsonLd({
    name: 'EIA weekly regular gasoline prices',
    description: gasolineSnapshot.attribution,
    temporalCoverage: gasolineSnapshot.observationPeriod,
    dateModified: gasolineSnapshot.verifiedAt,
    creatorName: gasolineSnapshot.provider,
    sourceUrl: gasolineSnapshot.sourceUrl,
  }),
  officialDatasetJsonLd({
    name: 'BLS average grocery staple prices',
    description: grocerySnapshot.attribution,
    temporalCoverage: grocerySnapshot.observationPeriod,
    dateModified: grocerySnapshot.verifiedAt,
    creatorName: grocerySnapshot.provider,
    sourceUrl: grocerySnapshot.sourceUrl,
  }),
  officialDatasetJsonLd({
    name: `U.S. tax year ${taxSnapshot.taxYear} snapshot`,
    description: `${taxSnapshot.federal.sourceName}. ${taxSnapshot.fica.sourceName}.`,
    temporalCoverage: String(taxSnapshot.taxYear),
    dateModified: taxSnapshot.verifiedAt,
    creatorName: taxSnapshot.federal.provider,
    sourceUrl: taxSnapshot.federal.sourceUrl,
  }),
  officialDatasetJsonLd({
    name: 'HUD Fair Market Rents',
    description: hudEffective.attribution,
    temporalCoverage: `FY${hudEffective.fiscalYear}`,
    dateModified: hudEffective.verifiedAt,
    creatorName: hudEffective.provider,
    sourceUrl: hudEffective.sourceUrl,
  }),
  officialDatasetJsonLd({
    name: 'Census ACS 5-Year estimates',
    description: acsSnapshot.attribution,
    temporalCoverage: acsSnapshot.surveyYears,
    dateModified: acsSnapshot.verifiedAt,
    creatorName: acsSnapshot.provider,
    sourceUrl: acsSnapshot.sourceUrl,
  }),
  officialDatasetJsonLd({
    name: 'BEA Regional Price Parities',
    description: beaRppSnapshot.attribution,
    temporalCoverage: String(beaRppSnapshot.referenceYear),
    dateModified: beaRppSnapshot.verifiedAt,
    creatorName: beaRppSnapshot.provider,
    sourceUrl: beaRppSnapshot.sourceUrl,
  }),
  officialDatasetJsonLd({
    name: 'USDA Food Plans monthly cost of food',
    description: usdaFoodSnapshot.attribution,
    temporalCoverage: usdaFoodSnapshot.reportMonth,
    dateModified: usdaFoodSnapshot.verifiedAt,
    creatorName: usdaFoodSnapshot.provider,
    sourceUrl: usdaFoodSnapshot.sourceUrl,
  }),
  officialDatasetJsonLd({
    name: `IRS tax year ${irsRetirementSnapshot.observationPeriod} retirement contribution limits`,
    description: irsRetirementSnapshot.attribution,
    temporalCoverage: irsRetirementSnapshot.observationPeriod,
    dateModified: irsRetirementSnapshot.verifiedAt,
    creatorName: irsRetirementSnapshot.provider,
    sourceUrl: irsRetirementSnapshot.sourceUrl,
  }),
];

function freshnessRows(source: ReturnType<typeof datasetSourceDisplay>) {
  return (
    <>
      <div><dt>Source line</dt><dd>{source.line}</dd></div>
      <div><dt>Status</dt><dd><span className={`freshness-pill freshness-${source.freshness}`}>{source.freshnessLabel}</span></dd></div>
      <div><dt>Age of this period</dt><dd>{source.observationAge}</dd></div>
      {source.lastCheckedOn && <div><dt>Last checked</dt><dd>{source.lastCheckedOn}</dd></div>}
      <div><dt>Provider schedule</dt><dd>{source.releaseSchedule}{source.nextExpectedRelease ? `. Next release expected ${source.nextExpectedRelease}.` : '. No fixed release schedule.'}</dd></div>
      {source.freshnessNote && <div><dt>Note</dt><dd>{source.freshnessNote}</dd></div>}
    </>
  );
}

const cpiGaps = missingCpiMonths(cpiSnapshot.observations);

/** One row per dataset, so the standing of the whole set is legible at a glance. */
const ALL_SOURCES = [
  { label: 'Freddie Mac mortgage rates', source: mortgageSource },
  { label: 'BLS CPI-U inflation index', source: cpiSource },
  { label: 'EIA residential electricity', source: electricitySource },
  { label: 'EIA weekly gasoline', source: gasolineSource },
  { label: 'BLS grocery average prices', source: grocerySource },
  { label: 'IRS and SSA tax parameters', source: taxSource },
  { label: 'IRS retirement limits', source: irsRetirementSource },
  { label: 'Census ACS 5-year estimates', source: acsSource },
  { label: 'HUD Fair Market Rents', source: hudSource },
  { label: 'BEA Regional Price Parities', source: beaSource },
  { label: 'USDA Food Plans', source: usdaSource },
  { label: 'GSA travel per diem', source: perDiemSource },
];

export default function DataSourcesPage() {
  return (
    <InfoPage
      eyebrow="Data sources"
      title="The data on the site right now"
      intro="Every official dataset on the site, what period it covers, when it was last checked, and when its provider is due to publish again."
    >
      <JsonLd data={datasetJsonLd} />
      {/*
        Each dataset is measured against its provider's own release calendar, so
        "current" means nothing newer has been published rather than "recent
        enough". That distinction is the whole point of storing dated snapshots.
      */}
      <section className="dataset-summary">
        <h2>Where every dataset stands today</h2>
        <ul>
          {ALL_SOURCES.map((entry) => (
            <li key={entry.label}>
              <span className={`freshness-pill freshness-${entry.source.freshness}`}>{entry.source.freshnessLabel}</span>
              <strong>{entry.label}</strong>
              <small>{entry.source.periodLabel} · {entry.source.observationAge}</small>
            </li>
          ))}
        </ul>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>Freddie Mac weekly mortgage rate averages</h2>
        <dl>
          <div><dt>Observation period</dt><dd>{mortgageRateSnapshot.observationPeriod}</dd></div>
          {freshnessRows(mortgageSource)}
          <div><dt>Source status</dt><dd>{mortgageRateSnapshot.sourceStatus}</dd></div>
          <div><dt>Cadence</dt><dd>{DATASET_POLICIES['freddie-mac-pmms'].expectedCadence}</dd></div>
          <div><dt>30-year fixed</dt><dd>{mortgageRateSnapshot.thirtyYearFixedPercent.toFixed(2)}%</dd></div>
          <div><dt>15-year fixed</dt><dd>{mortgageRateSnapshot.fifteenYearFixedPercent.toFixed(2)}%</dd></div>
        </dl>
        <p>{mortgageRateSnapshot.attribution}</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{mortgageRateSnapshot.snapshotId}</dd></div>
            <div><dt>Adapter</dt><dd>{mortgageRateSnapshot.adapterVersion}</dd></div>
            <div><dt>Schema</dt><dd>{mortgageRateSnapshot.schemaVersion}</dd></div>
          </dl>
          <ul>{mortgageRateSnapshot.validationReport.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
        <p className="dataset-links"><a href={mortgageRateSnapshot.sourceDocumentationUrl}>PMMS page ↗</a><a href={mortgageRateSnapshot.termsUrl}>Legal ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>BLS CPI-U all-items index</h2>
        <dl>
          <div><dt>Observation period</dt><dd>{cpiSnapshot.observationPeriod}</dd></div>
          {freshnessRows(cpiSource)}
          <div><dt>Source status</dt><dd>{cpiSnapshot.sourceStatus}</dd></div>
          <div><dt>Cadence</dt><dd>{DATASET_POLICIES['bls-cpi'].expectedCadence}</dd></div>
          <div><dt>Months</dt><dd>{cpiSnapshot.observations.length} published months since 1913</dd></div>
        </dl>
        <p>{cpiSnapshot.attribution}</p>
        {/*
          The stored snapshot carries the wording it was hashed with. Coverage
          is derived from the observations instead so the page reads correctly
          without reopening a sealed dataset.
        */}
        <ul>
          {cpiSnapshot.validationReport.slice(0, -1).map((item) => <li key={item}>{item}</li>)}
          <li>{cpiGaps.length === 0
            ? 'Every month in the range has a published CPI-U value.'
            : `${describeCpiMonths(cpiGaps)} not published by BLS, so ${cpiGaps.length === 1 ? 'it is' : 'they are'} not offered as a starting month.`}</li>
        </ul>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{cpiSnapshot.snapshotId}</dd></div>
            <div><dt>Adapter</dt><dd>{cpiSnapshot.adapterVersion}</dd></div>
            <div><dt>Schema</dt><dd>{cpiSnapshot.schemaVersion}</dd></div>
          </dl>
        </details>
        <p className="dataset-links"><a href={cpiSnapshot.sourceDocumentationUrl}>CPI overview ↗</a><a href={cpiSnapshot.termsUrl}>Linking policy ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>EIA residential electricity prices by state</h2>
        <dl>
          <div><dt>Observation period</dt><dd>{electricitySnapshot.observationPeriod}</dd></div>
          {freshnessRows(electricitySource)}
          <div><dt>Source status</dt><dd>{electricitySnapshot.sourceStatus}</dd></div>
          <div><dt>Cadence</dt><dd>{DATASET_POLICIES['eia-electricity'].expectedCadence}</dd></div>
          <div><dt>Geographies</dt><dd>{electricitySnapshot.states.length} states/DC rows</dd></div>
        </dl>
        <p>{electricitySnapshot.attribution}</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{electricitySnapshot.snapshotId}</dd></div>
            <div><dt>Adapter</dt><dd>{electricitySnapshot.adapterVersion}</dd></div>
            <div><dt>Schema</dt><dd>{electricitySnapshot.schemaVersion}</dd></div>
          </dl>
          <ul>{electricitySnapshot.validationReport.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
        <p className="dataset-links"><a href={electricitySnapshot.sourceDocumentationUrl}>API documentation ↗</a><a href={electricitySnapshot.termsUrl}>Terms of service ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>EIA weekly regular gasoline prices</h2>
        <dl>
          <div><dt>Observation period</dt><dd>{gasolineSnapshot.observationPeriod}</dd></div>
          {freshnessRows(gasolineSource)}
          <div><dt>Source status</dt><dd>{gasolineSnapshot.sourceStatus}</dd></div>
          <div><dt>Cadence</dt><dd>{DATASET_POLICIES['eia-gasoline'].expectedCadence}</dd></div>
          <div><dt>Geographies</dt><dd>{gasolineSnapshot.geographies.length} U.S., PADD and selected-state series</dd></div>
        </dl>
        <p>{gasolineSnapshot.attribution}</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{gasolineSnapshot.snapshotId}</dd></div>
            <div><dt>Adapter</dt><dd>{gasolineSnapshot.adapterVersion}</dd></div>
            <div><dt>Schema</dt><dd>{gasolineSnapshot.schemaVersion}</dd></div>
          </dl>
          <ul>{gasolineSnapshot.validationReport.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
        <p className="dataset-links"><a href={gasolineSnapshot.sourceDocumentationUrl}>Weekly gasoline page ↗</a><a href={gasolineSnapshot.termsUrl}>Reuse policy ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>BLS average grocery staple prices</h2>
        <dl>
          <div><dt>Observation period</dt><dd>{grocerySnapshot.observationPeriod}</dd></div>
          {freshnessRows(grocerySource)}
          <div><dt>Source status</dt><dd>{grocerySnapshot.sourceStatus}</dd></div>
          <div><dt>Cadence</dt><dd>{DATASET_POLICIES['bls-grocery'].expectedCadence}</dd></div>
          <div><dt>Items</dt><dd>{grocerySnapshot.items.length} national staples</dd></div>
        </dl>
        <p>{grocerySnapshot.attribution}</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{grocerySnapshot.snapshotId}</dd></div>
            <div><dt>Adapter</dt><dd>{grocerySnapshot.adapterVersion}</dd></div>
            <div><dt>Schema</dt><dd>{grocerySnapshot.schemaVersion}</dd></div>
          </dl>
          <ul>{grocerySnapshot.validationReport.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
        <p className="dataset-links"><a href={grocerySnapshot.sourceDocumentationUrl}>Average price documentation ↗</a><a href={grocerySnapshot.termsUrl}>Linking policy ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>U.S. tax year snapshots</h2>
        <dl>
          <div><dt>Tax year</dt><dd>{taxSnapshot.taxYear}</dd></div>
          {freshnessRows(taxSource)}
          <div><dt>Source status</dt><dd>{taxSnapshot.sourceStatus}</dd></div>
          <div><dt>Cadence</dt><dd>{DATASET_POLICIES['us-tax'].expectedCadence} / {DATASET_POLICIES['us-tax'].refreshMode}</dd></div>
          <div><dt>Federal</dt><dd>{taxSnapshot.federal.sourceName}</dd></div>
          <div><dt>Social Security wage base</dt><dd>${taxSnapshot.fica.socialSecurityWageBase.toLocaleString('en-US')}</dd></div>
          <div><dt>Supported states</dt><dd>{taxSnapshot.states.filter((row) => row.status === 'supported').length} of {taxSnapshot.states.length}</dd></div>
        </dl>
        <p>Federal brackets and the standard deduction come from the IRS. The Social Security wage base comes from SSA. State rows are either a verified agency/statute schedule or an explicit unsupported marker. Unsupported states are omitted from the state tax line; they are not guessed. A later tax year is a new year-keyed file; it does not replace 2026.</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{taxSnapshot.snapshotId}</dd></div>
            <div><dt>Adapter</dt><dd>{taxSnapshot.adapterVersion}</dd></div>
            <div><dt>Schema</dt><dd>{taxSnapshot.schemaVersion}</dd></div>
          </dl>
        </details>
        <p className="dataset-links"><a href={taxSnapshot.federal.sourceUrl}>IRS source ↗</a><a href={taxSnapshot.fica.sourceUrl}>SSA wage base ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>IRS retirement contribution limits</h2>
        <dl>
          <div><dt>Tax year</dt><dd>{irsRetirementSnapshot.observationPeriod}</dd></div>
          {freshnessRows(irsRetirementSource)}
          <div><dt>Source status</dt><dd>{irsRetirementSnapshot.sourceStatus}</dd></div>
          <div><dt>Cadence</dt><dd>{DATASET_POLICIES['irs-retirement-limits'].expectedCadence} / {DATASET_POLICIES['irs-retirement-limits'].refreshMode}</dd></div>
          <div><dt>401(k) elective deferral</dt><dd>${irsRetirementSnapshot.limits.electiveDeferral401k.toLocaleString('en-US')}</dd></div>
          <div><dt>Age 50+ catch-up</dt><dd>${irsRetirementSnapshot.limits.catchUp401kAge50.toLocaleString('en-US')}</dd></div>
          <div><dt>Ages 60–63 catch-up</dt><dd>${irsRetirementSnapshot.limits.catchUp401kAges60to63.toLocaleString('en-US')}</dd></div>
          <div><dt>Defined-contribution overall</dt><dd>${irsRetirementSnapshot.limits.definedContributionOverall.toLocaleString('en-US')}</dd></div>
          <div><dt>IRA</dt><dd>${irsRetirementSnapshot.limits.iraLimit.toLocaleString('en-US')} + ${irsRetirementSnapshot.limits.catchUpIraAge50.toLocaleString('en-US')} age 50+</dd></div>
          <div><dt>Roth catch-up wage threshold</dt><dd>${irsRetirementSnapshot.limits.rothCatchUpPriorYearFicaWageThreshold.toLocaleString('en-US')} prior-year FICA</dd></div>
        </dl>
        <p>{irsRetirementSnapshot.attribution}</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{irsRetirementSnapshot.snapshotId}</dd></div>
            <div><dt>Adapter</dt><dd>{irsRetirementSnapshot.adapterVersion}</dd></div>
            <div><dt>Schema</dt><dd>{irsRetirementSnapshot.schemaVersion}</dd></div>
          </dl>
          <ul>{irsRetirementSnapshot.validationReport.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
        <p className="dataset-links"><a href={irsRetirementSnapshot.sourceUrl}>IR-2025-111 ↗</a><a href={irsRetirementSnapshot.colaTableUrl}>COLA table ↗</a><a href={irsRetirementSnapshot.noticeUrl}>Notice 2025-67 ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>Census geography and ACS 5-Year estimates</h2>
        <dl>
          <div><dt>Geography snapshot</dt><dd>{geographySnapshot.snapshotId}</dd></div>
          <div><dt>ACS snapshot</dt><dd>{acsSnapshot.snapshotId}</dd></div>
          {freshnessRows(acsSource)}
          <div><dt>Survey years</dt><dd>{acsSnapshot.surveyYears}</dd></div>
          <div><dt>Searchable places</dt><dd>{geographySnapshot.places.length} OMB principal cities</dd></div>
        </dl>
        <p>ACS values are survey estimates for 2020–2024, not live counts. Population and median household income are context. Median household income is not the user’s salary. Sentinel Census values are stored as missing, not as zero. Names are never geographic identity; the engine uses FIPS, GEOID, CBSA, and HUD area codes.</p>
        <p className="dataset-links"><a href={acsSnapshot.sourceUrl}>ACS summary file ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>HUD Fair Market Rents</h2>
        <dl>
          <div><dt>Currently effective</dt><dd>{hudEffective.snapshotId}</dd></div>
          <div><dt>Latest published</dt><dd>{hudLatestPublishedSnapshot.snapshotId}</dd></div>
          {freshnessRows(hudSource)}
          <div><dt>Effective window</dt><dd>{hudEffective.effectiveFrom} to {hudEffective.effectiveTo}</dd></div>
        </dl>
        <p>HUD Fair Market Rent is a 40th-percentile gross-rent benchmark for a HUD FMR area. It is not average asking rent and not a typical listing. Gross rent includes shelter plus most tenant-paid utilities, so the cost-of-living model does not add a household electric bill on top. FY2027 can be published before it is effective; the calculator uses the currently effective fiscal year. HUD geography is not the same as city limits, and it is not automatically the same as a CBSA.</p>
        <p className="dataset-links"><a href={hudEffective.sourceDocumentationUrl}>HUD FMR datasets ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>BEA Regional Price Parities</h2>
        <dl>
          <div><dt>Reference year</dt><dd>{beaRppSnapshot.referenceYear}</dd></div>
          {freshnessRows(beaSource)}
          <div><dt>National</dt><dd>{beaRppSnapshot.national}</dd></div>
        </dl>
        <p>RPP is a regional price-level index for a given year. 100 is the U.S. average for that year. 106 means prices in BEA’s consumption mix are about 6% above the national level. It is not a household budget, and a change from 2023 to 2024 is not an inflation rate. The cost-of-living model shows RPP as context. It does not multiply HUD, EIA, or USDA dollar amounts by RPP.</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{beaRppSnapshot.snapshotId}</dd></div>
          </dl>
        </details>
        <p className="dataset-links"><a href={beaRppSnapshot.sourceUrl}>BEA state RPP ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>USDA Food Plans</h2>
        <dl>
          <div><dt>Report month</dt><dd>{usdaFoodSnapshot.reportMonth}</dd></div>
          {freshnessRows(usdaSource)}
          <div><dt>Default plan</dt><dd>Moderate-Cost</dd></div>
        </dl>
        <p>Food Plans are official food-at-home planning baskets, not restaurant spending and not all household food. Household-size adjustments are USDA’s published factors. Alaska and Hawaii official extras in this copy are for the Thrifty reference family only. BLS grocery staples remain a separate item-price dataset; they do not include household quantities, so they are not used as a city grocery budget.</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{usdaFoodSnapshot.snapshotId}</dd></div>
          </dl>
        </details>
        <p className="dataset-links"><a href={usdaFoodSnapshot.sourceUrl}>USDA monthly reports ↗</a></p>
      </section>
      <h2>How to read this</h2>
      <p>Electricity prices are average residential rates, not your utility rate. Gasoline prices are EIA weekly regular averages for a state or PADD region, not a pump. Grocery staples are BLS average retail prices for the U.S. city average or a census region; they are not a household food budget. Mortgage rates are Freddie Mac national weekly averages, not a lender quote. CPI-U is the average urban price level, not your personal basket. Tax results are estimated annual liability from published IRS, SSA, and state schedules, not a prepared return or employer withholding. HUD FMR is a gross-rent benchmark, not listing rent. BEA RPP is a spatial price index, not inflation. USDA Food Plans are food at home. None of this is Walmart, Kroger, Costco, or a weekly circular.</p>
      <h2>When it updates</h2>
      <p>A normal new period can go live after the checks pass. Odd unit changes, missing states, duplicates, or big jumps wait for a person to look. If a check fails, the last good copy stays on the site. Tax snapshots and IRS retirement-limit copies are yearly official releases, not a weekly fetch. Census, HUD, and BEA are annual; an old reference year is not automatically stale. HUD effectiveness is separate from publication: a future fiscal year can be on file without becoming the default. Source status (preliminary, final, revised, or verified) is not the same as freshness (fresh or stale).</p>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>GSA travel per diem, continental U.S.</h2>
        <dl>
          <div><dt>Observation period</dt><dd>FY{gsaPerDiemSnapshot.fiscalYear}</dd></div>
          {freshnessRows(perDiemSource)}
          <div><dt>Source status</dt><dd>{gsaPerDiemSnapshot.sourceStatus}</dd></div>
          <div><dt>Effective</dt><dd>{gsaPerDiemSnapshot.effectiveFrom} to {gsaPerDiemSnapshot.effectiveTo}</dd></div>
          <div><dt>Destinations</dt><dd>{gsaPerDiemSnapshot.destinations.length} CONUS localities and state standard rates</dd></div>
          <div><dt>M&amp;IE tiers</dt><dd>{gsaPerDiemSnapshot.mieBreakdowns.map((tier) => `$${tier.total}`).join(' · ')}</dd></div>
          <div><dt>First and last day</dt><dd>75% of the daily M&amp;IE rate, as published by GSA</dd></div>
        </dl>
        <p>{gsaPerDiemSnapshot.attribution}</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{gsaPerDiemSnapshot.snapshotId}</dd></div>
            <div><dt>Adapter</dt><dd>{gsaPerDiemSnapshot.adapterVersion}</dd></div>
            <div><dt>Schema</dt><dd>{gsaPerDiemSnapshot.schemaVersion}</dd></div>
          </dl>
          <ul>{gsaPerDiemSnapshot.validationReport.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
        <p className="dataset-links"><a href={gsaPerDiemSnapshot.sourceDocumentationUrl}>GSA per diem rates ↗</a><a href={gsaPerDiemSnapshot.mieBreakdownUrl}>M&amp;IE breakdown ↗</a></p>
      </section>
    </InfoPage>
  );
}
