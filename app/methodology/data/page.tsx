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
import { findEffectivePerDiemRelease } from '@/lib/data/gsa-perdiem';
import {
  gsaPerDiemReleases,
  getGsaPerDiemSnapshotById,
  latestPublishedGsaPerDiemSnapshot,
} from '@/lib/data/gsa-perdiem-snapshot';
import { irsRetirementSnapshot } from '@/lib/data/irs-retirement-snapshot';
import { insuranceSnapshot } from '@/lib/data/insurance-snapshot';
import { cmsMarketplaceIndex } from '@/lib/data/cms-marketplace-snapshot';
import { acaSubsidySnapshot } from '@/lib/data/aca-subsidy';
import { medicareSnapshot } from '@/lib/data/medicare';
import { geographySnapshot } from '@/lib/data/geography-snapshot';
import { datasetSourceDisplay, officialDatasetJsonLd } from '@/lib/data/source-display';
import { DATASET_POLICIES } from '@/lib/data/dataset-policy';
import { pageMetadata } from '@/lib/seo';
import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import { jobCostDatasetCards } from '@/lib/job/dataset-cards';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata(
  'Data sources',
  'EIA, BLS, HUD, Census, BEA, USDA, NAIC, CMS, IRS, and Freddie Mac copies used by CostAnswer, with observation dates.',
  '/methodology/data',
);

function dataPageSources() {
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
  const hudSource = datasetSourceDisplay({
    datasetId: 'hud-fmr',
    observationPeriod: String(hudLatestPublishedSnapshot.fiscalYear),
    sourceStatus: hudLatestPublishedSnapshot.sourceStatus,
    publishedAt: hudLatestPublishedSnapshot.publishedAt,
    verifiedAt: hudLatestPublishedSnapshot.verifiedAt,
    fetchedAt: hudLatestPublishedSnapshot.fetchedAt,
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
  // Same publication clock as the Cost of Living calculator — not utcCalendarDate() —
  // so "currently effective" on this page cannot disagree with the live engine.
  const hudEffective = resolveHudFmrSnapshot(PUBLISHING_SNAPSHOT_DATE);
  const gsaLatest = latestPublishedGsaPerDiemSnapshot();
  const gsaEffectiveRelease = findEffectivePerDiemRelease(gsaPerDiemReleases, PUBLISHING_SNAPSHOT_DATE);
  const gsaEffective = gsaEffectiveRelease
    ? getGsaPerDiemSnapshotById(gsaEffectiveRelease.snapshotId)
    : null;
  const perDiemSource = datasetSourceDisplay({
    datasetId: 'gsa-perdiem',
    observationPeriod: gsaLatest.observationPeriod,
    sourceStatus: gsaLatest.sourceStatus,
    publishedAt: gsaLatest.publishedAt,
    verifiedAt: gsaLatest.verifiedAt,
    fetchedAt: gsaLatest.fetchedAt,
  });
  const irsRetirementSource = datasetSourceDisplay({
    datasetId: 'irs-retirement-limits',
    observationPeriod: irsRetirementSnapshot.observationPeriod,
    sourceStatus: irsRetirementSnapshot.sourceStatus,
    publishedAt: irsRetirementSnapshot.publishedAt,
    verifiedAt: irsRetirementSnapshot.verifiedAt,
    fetchedAt: irsRetirementSnapshot.fetchedAt,
  });
  const insuranceSource = datasetSourceDisplay({
    datasetId: 'naic-insurance',
    observationPeriod: insuranceSnapshot.observationPeriod,
    sourceStatus: insuranceSnapshot.sourceStatus,
    verifiedAt: insuranceSnapshot.verifiedAt,
    fetchedAt: insuranceSnapshot.fetchedAt,
  });
  const cmsSource = datasetSourceDisplay({
    datasetId: 'cms-marketplace',
    observationPeriod: cmsMarketplaceIndex.observationPeriod,
    sourceStatus: cmsMarketplaceIndex.sourceStatus,
    verifiedAt: cmsMarketplaceIndex.verifiedAt,
    fetchedAt: cmsMarketplaceIndex.fetchedAt,
  });
  const allSources = [
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
    { label: 'NAIC insurance averages', source: insuranceSource },
    { label: 'CMS Marketplace plan premiums', source: cmsSource },
  ];
  return {
    electricitySource,
    gasolineSource,
    grocerySource,
    cpiSource,
    mortgageSource,
    taxSource,
    hudEffective,
    hudSource,
    acsSource,
    beaSource,
    usdaSource,
    gsaEffective,
    gsaLatest,
    perDiemSource,
    irsRetirementSource,
    insuranceSource,
    cmsSource,
    allSources,
  };
}

const hudEffectiveSeo = resolveHudFmrSnapshot(PUBLISHING_SNAPSHOT_DATE);

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
    description: hudEffectiveSeo.attribution,
    temporalCoverage: `FY${hudEffectiveSeo.fiscalYear}`,
    dateModified: hudEffectiveSeo.verifiedAt,
    creatorName: hudEffectiveSeo.provider,
    sourceUrl: hudEffectiveSeo.sourceUrl,
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
    name: `CMS ${cmsMarketplaceIndex.observationPeriod} individual market medical landscape`,
    description: cmsMarketplaceIndex.attribution,
    temporalCoverage: cmsMarketplaceIndex.observationPeriod,
    dateModified: cmsMarketplaceIndex.verifiedAt,
    creatorName: cmsMarketplaceIndex.provider,
    sourceUrl: cmsMarketplaceIndex.sourceUrl,
  }),
  officialDatasetJsonLd({
    name: `NAIC ${insuranceSnapshot.observationPeriod} homeowners, renters and auto insurance averages`,
    description: insuranceSnapshot.attribution,
    temporalCoverage: insuranceSnapshot.observationPeriod,
    dateModified: insuranceSnapshot.verifiedAt,
    creatorName: insuranceSnapshot.provider,
    sourceUrl: insuranceSnapshot.sourceUrl,
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

export default function DataSourcesPage() {
  const {
    electricitySource,
    gasolineSource,
    grocerySource,
    cpiSource,
    mortgageSource,
    taxSource,
    hudEffective,
    hudSource,
    acsSource,
    beaSource,
    usdaSource,
    gsaEffective,
    gsaLatest,
    perDiemSource,
    irsRetirementSource,
    insuranceSource,
    cmsSource,
    allSources,
  } = dataPageSources();
  const jobDatasets = jobCostDatasetCards();
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
          {allSources.map((entry) => (
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
      <p>Electricity prices are average residential rates, not your utility rate. Gasoline prices are EIA weekly regular averages for a state or PADD region, not a pump. Grocery staples are BLS average retail prices for the U.S. city average or a census region; they are not a household food budget. Mortgage rates are Freddie Mac national weekly averages, not a lender quote. CPI-U is the average urban price level, not your personal basket. Tax results are estimated annual liability from published IRS, SSA, and state schedules, not a prepared return or employer withholding. HUD FMR is a gross-rent benchmark, not listing rent. BEA RPP is a spatial price index, not inflation. USDA Food Plans are food at home. NAIC insurance figures are state averages over policies already written, not a quote, an offer of coverage, or a prediction of your renewal. None of this is Walmart, Kroger, Costco, or a weekly circular.</p>
      <h2>When it updates</h2>
      <p>A normal new period can go live after the checks pass. Odd unit changes, missing states, duplicates, or big jumps wait for a person to look. If a check fails, the last good copy stays on the site. Tax snapshots and IRS retirement-limit copies are yearly official releases, not a weekly fetch. Census, HUD, and BEA are annual; an old reference year is not automatically stale. NAIC publishes each data year two to three years later, so its copy is measured against the release we last confirmed is the newest, not against the year the figures describe. HUD effectiveness is separate from publication: a future fiscal year can be on file without becoming the default. Source status (preliminary, final, revised, or verified) is not the same as freshness (fresh or stale).</p>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>GSA travel per diem, continental U.S.</h2>
        <dl>
          <div><dt>Currently effective</dt><dd>{gsaEffective ? gsaEffective.snapshotId : `No GSA per diem release is effective on ${PUBLISHING_SNAPSHOT_DATE}.`}</dd></div>
          <div><dt>Latest published</dt><dd>{gsaLatest.snapshotId}</dd></div>
          {freshnessRows(perDiemSource)}
          <div><dt>Source status</dt><dd>{gsaLatest.sourceStatus}</dd></div>
          <div><dt>Effective window</dt><dd>{gsaEffective ? `${gsaEffective.effectiveFrom} to ${gsaEffective.effectiveTo}` : `${gsaLatest.effectiveFrom} to ${gsaLatest.effectiveTo} (latest published, not yet or no longer in force)`}</dd></div>
          <div><dt>Destinations</dt><dd>{(gsaEffective ?? gsaLatest).destinations.length} CONUS localities and state standard rates</dd></div>
          <div><dt>M&amp;IE tiers</dt><dd>{(gsaEffective ?? gsaLatest).mieBreakdowns.map((tier) => `$${tier.total}`).join(' · ')}</dd></div>
          <div><dt>First and last day</dt><dd>75% of the daily M&amp;IE rate, as published by GSA</dd></div>
        </dl>
        <p>{(gsaEffective ?? gsaLatest).attribution} A ZIP code is not a GSA field: it is mapped through the Census ZCTA-to-county file, and a county GSA does not list on its own takes that state’s standard CONUS rate. When GSA carves a city out of a county, a ZIP cannot tell them apart, so both rates are offered. FY tables can be on file before 1 October; the calculator uses the currently effective fiscal year.</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{(gsaEffective ?? gsaLatest).snapshotId}</dd></div>
            <div><dt>Adapter</dt><dd>{(gsaEffective ?? gsaLatest).adapterVersion}</dd></div>
            <div><dt>Schema</dt><dd>{(gsaEffective ?? gsaLatest).schemaVersion}</dd></div>
          </dl>
          <ul>{(gsaEffective ?? gsaLatest).validationReport.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
        <p className="dataset-links"><a href={(gsaEffective ?? gsaLatest).sourceDocumentationUrl}>GSA per diem rates ↗</a><a href={(gsaEffective ?? gsaLatest).mieBreakdownUrl}>M&amp;IE breakdown ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>CMS Marketplace plan premiums by county</h2>
        <dl>
          <div><dt>Observation period</dt><dd>{cmsMarketplaceIndex.observationPeriod} plan year</dd></div>
          {freshnessRows(cmsSource)}
          <div><dt>Source status</dt><dd>{cmsMarketplaceIndex.sourceStatus}</dd></div>
          <div><dt>Cadence</dt><dd>{DATASET_POLICIES['cms-marketplace'].expectedCadence} / {DATASET_POLICIES['cms-marketplace'].refreshMode}</dd></div>
          <div><dt>Geographies</dt><dd>{cmsMarketplaceIndex.counties.length.toLocaleString('en-US')} counties across {cmsMarketplaceIndex.coveredStateCodes.length} HealthCare.gov states</dd></div>
          <div><dt>Published ages</dt><dd>{cmsMarketplaceIndex.publishedAges.join(', ')}</dd></div>
          <div><dt>Adult age curve</dt><dd>{cmsMarketplaceIndex.counties.filter((county) => county.ageCurve === 'federal-default').length.toLocaleString('en-US')} counties on the federal default, {cmsMarketplaceIndex.counties.filter((county) => county.ageCurve === 'state-filed').length} state-filed</dd></div>
          <div><dt>Under-21 age curve</dt><dd>{cmsMarketplaceIndex.counties.filter((county) => county.childAgeCurve === 'federal-default').length.toLocaleString('en-US')} counties on the federal default, {cmsMarketplaceIndex.counties.filter((county) => county.childAgeCurve === 'state-filed').length} state-filed</dd></div>
        </dl>
        <p>{cmsMarketplaceIndex.attribution} A state running its own Marketplace files premiums separately and is absent from this file rather than having no plans, which is a difference the pages using it have to state.</p>
        <ul>{cmsMarketplaceIndex.caveats.map((item) => <li key={item}>{item}</li>)}</ul>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{cmsMarketplaceIndex.snapshotId}</dd></div>
            <div><dt>Adapter</dt><dd>{cmsMarketplaceIndex.adapterVersion}</dd></div>
            <div><dt>Schema</dt><dd>{cmsMarketplaceIndex.schemaVersion}</dd></div>
            <div><dt>Packing</dt><dd>{cmsMarketplaceIndex.columnsPerCounty} integer columns per county</dd></div>
          </dl>
          <ul>{cmsMarketplaceIndex.validationReport.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
        <p className="dataset-links"><a href={cmsMarketplaceIndex.sourceDocumentationUrl}>Landscape file ↗</a><a href={cmsMarketplaceIndex.sourceUrl}>CMS public use files ↗</a></p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>2026 ACA premium tax credit rules</h2>
        <dl>
          <div><dt>Coverage year</dt><dd>{acaSubsidySnapshot.coverageYear}</dd></div>
          <div><dt>Poverty guidelines</dt><dd>{acaSubsidySnapshot.povertyGuidelineYear} HHS, including separate Alaska and Hawaii figures</dd></div>
          <div><dt>Income range</dt><dd>{acaSubsidySnapshot.minimumIncomePercentFpl}%–{acaSubsidySnapshot.maximumIncomePercentFpl}% of the guideline</dd></div>
          <div><dt>Employer affordability</dt><dd>{acaSubsidySnapshot.employerAffordabilityPercent}% of household income</dd></div>
          <div><dt>Excess-credit repayment cap</dt><dd>None for {acaSubsidySnapshot.coverageYear}</dd></div>
          <div><dt>Verified</dt><dd>{acaSubsidySnapshot.verifiedAt}</dd></div>
        </dl>
        <p>The IRS contribution table and HHS poverty guidelines are a hashed official-rules snapshot, not a fetched series. The schema proves the table is shaped like the IRS one; the hash is what fails the build on a single wrong digit.</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{acaSubsidySnapshot.snapshotId}</dd></div>
            <div><dt>Source status</dt><dd>{acaSubsidySnapshot.sourceStatus}</dd></div>
          </dl>
        </details>
        <p className="dataset-links">{acaSubsidySnapshot.sources.map((source) => <a key={source.id} href={source.url}>{source.name} ↗</a>)}</p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>2026 Medicare premiums and IRMAA</h2>
        <dl>
          <div><dt>Coverage year</dt><dd>{medicareSnapshot.coverageYear}</dd></div>
          <div><dt>IRMAA income year</dt><dd>{medicareSnapshot.irmaaIncomeTaxYear} MAGI</dd></div>
          <div><dt>Part B standard premium</dt><dd>${medicareSnapshot.partB.standardMonthlyPremium.toFixed(2)} a month</dd></div>
          <div><dt>Part B deductible</dt><dd>${medicareSnapshot.partB.annualDeductible} a year</dd></div>
          <div><dt>Part A deductible</dt><dd>${medicareSnapshot.partA.inpatientDeductiblePerBenefitPeriod} per benefit period</dd></div>
          <div><dt>Verified</dt><dd>{medicareSnapshot.verifiedAt}</dd></div>
        </dl>
        <p>Figures are transcribed from the CMS fact sheet. Most IRMAA rungs are “more than”; the top rung is “greater than or equal to”. Married filing separately skips the middle rungs. Part D IRMAA is owed only with Part D or Medicare Advantage drug coverage.</p>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{medicareSnapshot.snapshotId}</dd></div>
            <div><dt>Source status</dt><dd>{medicareSnapshot.sourceStatus}</dd></div>
          </dl>
        </details>
        <p className="dataset-links">{medicareSnapshot.sources.map((source) => <a key={source.id} href={source.url}>{source.name} ↗</a>)}</p>
      </section>
      <section className="dataset-card">
        <p><span className="status-dot" /> Current copy</p>
        <h2>NAIC homeowners, renters and auto insurance averages</h2>
        <dl>
          <div><dt>Observation period</dt><dd>{insuranceSnapshot.observationPeriod} insurance experience</dd></div>
          {freshnessRows(insuranceSource)}
          <div><dt>Source status</dt><dd>{insuranceSnapshot.sourceStatus}</dd></div>
          <div><dt>Cadence</dt><dd>{DATASET_POLICIES['naic-insurance'].expectedCadence} / {DATASET_POLICIES['naic-insurance'].refreshMode}</dd></div>
          <div><dt>Reports</dt><dd>{insuranceSnapshot.sources.homeowners.publicationLabel} homeowners report · {insuranceSnapshot.sources.auto.publicationLabel} auto database report</dd></div>
          <div><dt>Geographies</dt><dd>{insuranceSnapshot.states.length} states/DC rows plus a countrywide row</dd></div>
          <div><dt>Homeowners, countrywide</dt><dd>${insuranceSnapshot.national.homeownersAnnualPremium.toLocaleString('en-US')} a year, {insuranceSnapshot.homeownersPolicyForm} average premium</dd></div>
          <div><dt>Renters, countrywide</dt><dd>${insuranceSnapshot.national.rentersAnnualPremium.toLocaleString('en-US')} a year, {insuranceSnapshot.rentersPolicyForm} average premium</dd></div>
          <div><dt>Auto, countrywide</dt><dd>${insuranceSnapshot.national.autoAnnualExpenditure.toLocaleString('en-US')} average expenditure per {insuranceSnapshot.autoExpenditureDenominator.replace('liability-insured car-years', 'liability-insured car-year')}</dd></div>
        </dl>
        <p>{insuranceSnapshot.attribution} The publication year is not the price year: these are {insuranceSnapshot.observationPeriod} averages across different properties, vehicles, limits, deductibles and policyholders, so they are a budgeting benchmark rather than a quote. Average expenditure counts vehicles that carry only some of the three coverages, so it is not a standardized full-coverage price.</p>
        <ul>{insuranceSnapshot.caveats.map((item) => <li key={item}>{item}</li>)}</ul>
        <details className="dataset-technical">
          <summary>Technical validation</summary>
          <dl>
            <div><dt>Snapshot</dt><dd>{insuranceSnapshot.snapshotId}</dd></div>
            <div><dt>Adapter</dt><dd>{insuranceSnapshot.adapterVersion}</dd></div>
            <div><dt>Schema</dt><dd>{insuranceSnapshot.schemaVersion}</dd></div>
          </dl>
          <ul>{insuranceSnapshot.validationReport.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
        <p className="dataset-links"><a href={insuranceSnapshot.sources.homeowners.sourceUrl}>Homeowners report ↗</a><a href={insuranceSnapshot.sources.auto.sourceUrl}>Auto database report ↗</a><a href={insuranceSnapshot.termsUrl}>Terms ↗</a></p>
      </section>
      {jobDatasets.map((dataset) => (
        <section className="dataset-card" key={dataset.id}>
          <p><span className="status-dot" /> Job Cost Engine</p>
          <h2>{dataset.title}</h2>
          <dl>
            <div><dt>Observation period</dt><dd>{dataset.observationPeriod}</dd></div>
            <div><dt>Snapshot</dt><dd>{dataset.snapshotId}</dd></div>
            <div><dt>Cadence</dt><dd>Not on the DATASET_IDS freshness SLA. Refreshed with the Job Cost ingest.</dd></div>
          </dl>
          <p>{dataset.body}</p>
          <p>{dataset.attribution}</p>
          {dataset.sourceUrl && (
            <p className="dataset-links"><a href={dataset.sourceUrl}>Source ↗</a></p>
          )}
        </section>
      ))}
    </InfoPage>
  );
}
