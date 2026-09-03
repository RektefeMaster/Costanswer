import { evaluateDatasetFreshness } from '../lib/data/freshness';
import { acsSnapshot } from '../lib/data/acs-snapshot';
import { beaRppSnapshot } from '../lib/data/bea-rpp-snapshot';
import { hudLatestPublishedSnapshot } from '../lib/data/hud-fmr-snapshot';
import { usdaFoodSnapshot } from '../lib/data/usda-food-snapshot';
import { geographySnapshot } from '../lib/data/geography-snapshot';
import { PUBLISHING_SNAPSHOT_DATE } from '../lib/publishing';

const checks = [
  { name: 'Census geography', datasetId: 'census-omb-geography' as const, observationPeriod: geographySnapshot.observationPeriod, publishedAt: geographySnapshot.publishedAt },
  { name: 'Census ACS 5-Year', datasetId: 'census-acs5' as const, observationPeriod: acsSnapshot.observationPeriod, publishedAt: acsSnapshot.publishedAt },
  { name: 'HUD FMR', datasetId: 'hud-fmr' as const, observationPeriod: String(hudLatestPublishedSnapshot.fiscalYear), publishedAt: hudLatestPublishedSnapshot.publishedAt },
  { name: 'BEA RPP', datasetId: 'bea-rpp' as const, observationPeriod: beaRppSnapshot.observationPeriod, publishedAt: beaRppSnapshot.publishedAt },
  { name: 'USDA Food Plans', datasetId: 'usda-food-plans' as const, observationPeriod: usdaFoodSnapshot.observationPeriod, publishedAt: usdaFoodSnapshot.publishedAt },
];

const due = checks.filter((row) => evaluateDatasetFreshness(row.datasetId, {
  observationPeriod: row.observationPeriod,
  publishedAt: row.publishedAt,
}, PUBLISHING_SNAPSHOT_DATE) === 'stale');

if (due.length === 0) {
  console.log('Annual location datasets are not due. Checked-in snapshots remain the calculator source.');
  process.exit(0);
}

console.log(`Location datasets due for review: ${due.map((row) => row.name).join(', ')}. Re-run scripts/build-phase7-snapshots.py then scripts/promote-phase7-snapshots.ts after downloading official files.`);
process.exit(0);
