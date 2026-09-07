/**
 * Evaluate every shipped dataset against today's UTC calendar date.
 *
 * User-facing freshness uses this clock, not the build timestamp. Exit 1 if
 * any dataset is stale. update-due prints a warning; it does not fail a
 * deploy — a government site publishing late is not a CostAnswer code defect.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { DATASET_IDS, DATASET_POLICIES, type DatasetId } from '../lib/data/dataset-policy';
import { evaluateDatasetFreshness, utcCalendarDate, type FreshnessInput, type FreshnessStatus } from '../lib/data/freshness';
import { electricitySnapshot } from '../lib/data/electricity-snapshot';
import { gasolineSnapshot } from '../lib/data/gasoline-snapshot';
import { grocerySnapshot } from '../lib/data/grocery-snapshot';
import { cpiSnapshot } from '../lib/data/cpi-snapshot';
import { oewsIndex } from '../lib/data/bls-oews-snapshot';
import { mortgageRateSnapshot } from '../lib/data/mortgage-rate-snapshot';
import { taxSnapshot } from '../lib/data/tax/snapshot';
import { geographySnapshot } from '../lib/data/geography-snapshot';
import { acsSnapshot } from '../lib/data/acs-snapshot';
import { hudLatestPublishedSnapshot } from '../lib/data/hud-fmr-snapshot';
import { beaRppSnapshot } from '../lib/data/bea-rpp-snapshot';
import { usdaFoodSnapshot } from '../lib/data/usda-food-snapshot';
import { irsRetirementSnapshot } from '../lib/data/irs-retirement-snapshot';
import { latestPublishedGsaPerDiemSnapshot } from '../lib/data/gsa-perdiem-snapshot';
import { insuranceSnapshot } from '../lib/data/insurance-snapshot';
import { cmsMarketplaceIndex } from '../lib/data/cms-marketplace-snapshot';

function inputFrom(snapshot: {
  observationPeriod: string;
  publishedAt?: string;
  verifiedAt?: string;
  fetchedAt?: string;
}): FreshnessInput {
  return {
    observationPeriod: snapshot.observationPeriod,
    publishedAt: snapshot.publishedAt,
    verifiedAt: snapshot.verifiedAt,
    fetchedAt: snapshot.fetchedAt,
  };
}

export function liveFreshnessInputs(): Record<DatasetId, FreshnessInput> {
  return {
    'eia-electricity': inputFrom(electricitySnapshot),
    'eia-gasoline': inputFrom(gasolineSnapshot),
    'bls-grocery': inputFrom(grocerySnapshot),
    'bls-cpi': inputFrom(cpiSnapshot),
    'bls-oews': inputFrom(oewsIndex),
    'freddie-mac-pmms': inputFrom(mortgageRateSnapshot),
    'us-tax': {
      observationPeriod: String(taxSnapshot.taxYear),
      publishedAt: taxSnapshot.publishedAt,
      verifiedAt: taxSnapshot.verifiedAt,
    },
    'census-omb-geography': inputFrom(geographySnapshot),
    'census-acs5': inputFrom(acsSnapshot),
    'hud-fmr': inputFrom({
      observationPeriod: String(hudLatestPublishedSnapshot.fiscalYear),
      publishedAt: hudLatestPublishedSnapshot.publishedAt,
      verifiedAt: hudLatestPublishedSnapshot.verifiedAt,
      fetchedAt: hudLatestPublishedSnapshot.fetchedAt,
    }),
    'bea-rpp': inputFrom(beaRppSnapshot),
    'usda-food-plans': inputFrom(usdaFoodSnapshot),
    'irs-retirement-limits': inputFrom(irsRetirementSnapshot),
    'gsa-perdiem': inputFrom(latestPublishedGsaPerDiemSnapshot()),
    'naic-insurance': {
      observationPeriod: insuranceSnapshot.observationPeriod,
      verifiedAt: insuranceSnapshot.verifiedAt,
      fetchedAt: insuranceSnapshot.fetchedAt,
    },
    'cms-marketplace': {
      observationPeriod: cmsMarketplaceIndex.observationPeriod,
      verifiedAt: cmsMarketplaceIndex.verifiedAt,
      fetchedAt: cmsMarketplaceIndex.fetchedAt,
    },
  };
}

export function evaluateLiveFreshness(asOf: string = utcCalendarDate()): { status: FreshnessStatus; datasetId: DatasetId }[] {
  const inputs = liveFreshnessInputs();
  return DATASET_IDS.map((datasetId) => ({
    datasetId,
    status: evaluateDatasetFreshness(datasetId, inputs[datasetId], asOf),
  }));
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  const asOf = utcCalendarDate();
  const rows = evaluateLiveFreshness(asOf);
  const stale = rows.filter((row) => row.status === 'stale');
  const due = rows.filter((row) => row.status === 'update-due');

  for (const row of rows) {
    const cadence = DATASET_POLICIES[row.datasetId].releaseSchedule;
    console.log(`${row.status.padEnd(11)} ${row.datasetId}  (${cadence})`);
  }

  if (due.length > 0) {
    console.warn(`\nupdate-due (${due.length}) as of ${asOf}: ${due.map((row) => row.datasetId).join(', ')}`);
  }
  if (stale.length > 0) {
    console.error(`\nstale (${stale.length}) as of ${asOf}: ${stale.map((row) => row.datasetId).join(', ')}`);
    process.exit(1);
  }

  console.log(`\nNo stale datasets as of ${asOf}.`);
}
