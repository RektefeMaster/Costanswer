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
import { tools } from '../lib/tool-registry';
import { evaluateToolDataReadiness } from '../lib/tools/data-readiness';
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
import { usdaFoodManifest, usdaFoodSnapshot } from '../lib/data/usda-food-snapshot';
import { irsRetirementSnapshot } from '../lib/data/irs-retirement-snapshot';
import { latestPublishedGsaPerDiemSnapshot } from '../lib/data/gsa-perdiem-snapshot';
import { insuranceSnapshot } from '../lib/data/insurance-snapshot';
import { cmsMarketplaceIndex } from '../lib/data/cms-marketplace-snapshot';
import { fhfaLoanLimitSnapshot } from '../lib/data/fhfa-loan-limits-snapshot';
import { irsHsaSnapshot } from '../lib/data/irs-hsa';
import { vaFundingFeeSnapshot } from '../lib/data/va-funding-fee';
import { irsRmdSnapshot } from '../lib/data/irs-rmd';
import { acaSubsidySnapshot } from '../lib/data/aca-subsidy';
import { medicareSnapshot } from '../lib/data/medicare';
import type { DataSourceId } from '../lib/data/data-sources';

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
    'usda-food-plans': {
      ...inputFrom(usdaFoodSnapshot),
      // Checked 2026-09-07 against the FNS report index: July 2026 is still the
      // newest report USDA has published, so the lateness is theirs, not ours.
      confirmedLatestAt: usdaFoodManifest.confirmedLatestAt,
    },
    'irs-retirement-limits': inputFrom(irsRetirementSnapshot),
    'gsa-perdiem': inputFrom(latestPublishedGsaPerDiemSnapshot()),
    'naic-insurance': {
      observationPeriod: insuranceSnapshot.observationPeriod,
      verifiedAt: insuranceSnapshot.verifiedAt,
      fetchedAt: insuranceSnapshot.fetchedAt,
    },
    'fhfa-loan-limits': {
      observationPeriod: fhfaLoanLimitSnapshot.observationPeriod,
      verifiedAt: fhfaLoanLimitSnapshot.verifiedAt,
      fetchedAt: fhfaLoanLimitSnapshot.fetchedAt,
    },
    'irs-hsa-limits': {
      observationPeriod: irsHsaSnapshot.observationPeriod,
      publishedAt: `${irsHsaSnapshot.publishedAt}T00:00:00.000Z`,
      verifiedAt: irsHsaSnapshot.verifiedAt,
      fetchedAt: irsHsaSnapshot.fetchedAt,
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

/**
 * Which pages a stale copy actually takes down.
 *
 * "bea-rpp is stale" is a fact about a file. "cost-of-living cannot present a
 * complete answer" is the consequence, and it is the one worth waking somebody
 * for. Each tool is measured against its own `maxStalenessDays`, not against
 * the dataset's global window, because a weekly survey and a yearly table
 * cannot share one deadline.
 */
export function toolsBlockedByStaleData(asOf: string = utcCalendarDate()): Array<{ toolId: string; reasons: string[] }> {
  const inputs = liveFreshnessInputs();
  const present: Partial<Record<DataSourceId, { observationPeriod: string; publishedAt?: string }>> = {
    ...Object.fromEntries(
      DATASET_IDS.map((datasetId) => [datasetId, {
        observationPeriod: inputs[datasetId].observationPeriod,
        publishedAt: inputs[datasetId].publishedAt ?? inputs[datasetId].verifiedAt,
      }]),
    ),
    /*
     * Pinned rule documents have no release cadence to miss, so they are not in
     * `DATASET_IDS`. They are still required by pages that would be wrong
     * without them, so they belong in this map or the gate reports every tax
     * credit page as blocked on the day it runs.
     */
    'aca-subsidy-rules': {
      observationPeriod: String(acaSubsidySnapshot.coverageYear),
      publishedAt: acaSubsidySnapshot.verifiedAt,
    },
    'medicare-rules': {
      observationPeriod: String(medicareSnapshot.coverageYear),
      publishedAt: medicareSnapshot.verifiedAt,
    },
    'va-funding-fee': {
      observationPeriod: vaFundingFeeSnapshot.observationPeriod,
      publishedAt: vaFundingFeeSnapshot.verifiedAt,
    },
    'irs-rmd-tables': {
      observationPeriod: irsRmdSnapshot.observationPeriod,
      publishedAt: irsRmdSnapshot.verifiedAt,
    },
  };
  const blocked: Array<{ toolId: string; reasons: string[] }> = [];
  for (const tool of tools) {
    if (!tool.data.requiresData) continue;
    const readiness = evaluateToolDataReadiness({ manifest: tool.data, present, asOf });
    if (!readiness.complete) blocked.push({ toolId: tool.id, reasons: readiness.blockedBy });
  }
  return blocked;
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
  const blocked = toolsBlockedByStaleData(asOf);
  if (blocked.length > 0) {
    console.error(`\nTools that cannot present a complete answer (${blocked.length}):`);
    for (const row of blocked) console.error(`  ${row.toolId}: ${row.reasons.join(' ')}`);
  }

  if (stale.length > 0 || blocked.length > 0) {
    if (stale.length > 0) {
      console.error(`\nstale (${stale.length}) as of ${asOf}: ${stale.map((row) => row.datasetId).join(', ')}`);
    }
    process.exit(1);
  }

  console.log(`\nNo stale datasets as of ${asOf}, and every tool that requires data has it.`);
}
