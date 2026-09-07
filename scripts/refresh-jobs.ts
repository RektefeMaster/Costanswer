import type { DatasetId } from '../lib/data/dataset-policy';

export type RefreshFamily = 'weekly' | 'monthly' | 'annual';

export type RefreshJob = {
  name: string;
  script: string;
  family: RefreshFamily;
  datasetIds: DatasetId[];
  requiredEnv?: string;
};

/**
 * Every `refreshMode: 'scheduled'` dataset must appear here. Weekly jobs run
 * Monday (EIA gasoline) and Thursday evening (PMMS); monthly mid-month; Tuesday
 * runs every family as a safety net so a missed cadence job is recovered within
 * a week. Location and USDA rows are due-checks, not fetches — USDA still needs
 * a maintainer ingest. Detection still wins: a job that finds nothing newer is
 * a no-op.
 */
export const REFRESH_JOBS: RefreshJob[] = [
  { name: 'EIA gasoline', script: 'scripts/ingest-eia-gasoline.ts', family: 'weekly', datasetIds: ['eia-gasoline'] },
  { name: 'Freddie Mac PMMS', script: 'scripts/ingest-freddie-mac-pmms.ts', family: 'weekly', datasetIds: ['freddie-mac-pmms'] },
  { name: 'BLS grocery', script: 'scripts/ingest-bls-grocery.ts', family: 'monthly', datasetIds: ['bls-grocery'] },
  { name: 'BLS CPI-U', script: 'scripts/ingest-bls-cpi.ts', family: 'monthly', datasetIds: ['bls-cpi'] },
  { name: 'EIA electricity', script: 'scripts/ingest-eia-electricity.ts', family: 'monthly', datasetIds: ['eia-electricity'], requiredEnv: 'EIA_API_KEY' },
  { name: 'BLS OEWS wages', script: 'scripts/ingest-bls-oews.ts', family: 'annual', datasetIds: ['bls-oews'] },
  {
    name: 'USDA food plans (due-check, not a fetch)',
    script: 'scripts/ingest-location-official.ts',
    family: 'monthly',
    datasetIds: ['usda-food-plans'],
  },
  {
    name: 'Official location datasets (due-check, not a fetch)',
    script: 'scripts/ingest-location-official.ts',
    family: 'annual',
    datasetIds: ['census-omb-geography', 'census-acs5', 'hud-fmr', 'bea-rpp'],
  },
  { name: 'GSA per diem', script: 'scripts/ingest-gsa-perdiem.ts', family: 'annual', datasetIds: ['gsa-perdiem'] },
];

export function refreshJobsFor(family: RefreshFamily | 'all'): RefreshJob[] {
  if (family === 'all') return REFRESH_JOBS;
  return REFRESH_JOBS.filter((job) => job.family === family);
}

export function scheduledDatasetsCoveredByRefresh(): DatasetId[] {
  return [...new Set(REFRESH_JOBS.flatMap((job) => job.datasetIds))];
}
