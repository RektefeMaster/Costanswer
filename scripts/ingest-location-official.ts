import { evaluateDatasetFreshness, utcCalendarDate } from '../lib/data/freshness';
import { acsSnapshot } from '../lib/data/acs-snapshot';
import { beaRppSnapshot } from '../lib/data/bea-rpp-snapshot';
import { hudLatestPublishedSnapshot } from '../lib/data/hud-fmr-snapshot';
import { usdaFoodSnapshot } from '../lib/data/usda-food-snapshot';
import { geographySnapshot } from '../lib/data/geography-snapshot';

const checks = [
  { name: 'Census geography', datasetId: 'census-omb-geography' as const, observationPeriod: geographySnapshot.observationPeriod, publishedAt: geographySnapshot.publishedAt },
  { name: 'Census ACS 5-Year', datasetId: 'census-acs5' as const, observationPeriod: acsSnapshot.observationPeriod, publishedAt: acsSnapshot.publishedAt },
  { name: 'HUD FMR', datasetId: 'hud-fmr' as const, observationPeriod: String(hudLatestPublishedSnapshot.fiscalYear), publishedAt: hudLatestPublishedSnapshot.publishedAt },
  { name: 'BEA RPP', datasetId: 'bea-rpp' as const, observationPeriod: beaRppSnapshot.observationPeriod, publishedAt: beaRppSnapshot.publishedAt },
  { name: 'USDA Food Plans', datasetId: 'usda-food-plans' as const, observationPeriod: usdaFoodSnapshot.observationPeriod, publishedAt: usdaFoodSnapshot.publishedAt },
];

const asOf = utcCalendarDate();
const rows = checks.map((row) => ({
  ...row,
  status: evaluateDatasetFreshness(row.datasetId, {
    observationPeriod: row.observationPeriod,
    publishedAt: row.publishedAt,
  }, asOf),
}));
const updateDue = rows.filter((row) => row.status === 'update-due');
const stale = rows.filter((row) => row.status === 'stale');

if (updateDue.length === 0 && stale.length === 0) {
  console.log('Location datasets are current. Checked-in snapshots remain the calculator source.');
  process.exit(0);
}

if (updateDue.length > 0) {
  console.warn(`Location datasets update-due as of ${asOf}: ${updateDue.map((row) => row.name).join(', ')}.`);
}
if (stale.length > 0) {
  console.warn(`Location datasets stale as of ${asOf}: ${stale.map((row) => row.name).join(', ')}.`);
}
console.log('Re-run scripts/build-phase7-snapshots.py then scripts/promote-phase7-snapshots.ts after downloading official files.');
process.exit(0);
