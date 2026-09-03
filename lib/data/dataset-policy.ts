export const DATASET_IDS = [
  'eia-electricity',
  'eia-gasoline',
  'bls-grocery',
  'bls-cpi',
  'freddie-mac-pmms',
  'us-tax',
  'census-omb-geography',
  'census-acs5',
  'hud-fmr',
  'bea-rpp',
  'usda-food-plans',
] as const;

export type DatasetId = (typeof DATASET_IDS)[number];
export type DatasetCadence = 'weekly' | 'monthly' | 'yearly';
export type DatasetRefreshMode = 'scheduled' | 'manual';
export type DatasetPeriodKind = DatasetCadence | 'fiscal-year' | 'reference-year' | 'survey-vintage';
export type FreshnessAnchor = 'observation-end' | 'published-at';

export type DatasetPolicy = {
  datasetId: DatasetId;
  expectedCadence: DatasetCadence;
  staleAfterDays: number;
  refreshMode: DatasetRefreshMode;
  providerShort: string;
  periodKind: DatasetPeriodKind;
  freshnessAnchor: FreshnessAnchor;
};

export const DATASET_POLICIES: Record<DatasetId, DatasetPolicy> = {
  'eia-electricity': {
    datasetId: 'eia-electricity',
    expectedCadence: 'monthly',
    staleAfterDays: 45,
    refreshMode: 'scheduled',
    providerShort: 'EIA',
    periodKind: 'monthly',
    freshnessAnchor: 'observation-end',
  },
  'eia-gasoline': {
    datasetId: 'eia-gasoline',
    expectedCadence: 'weekly',
    staleAfterDays: 14,
    refreshMode: 'scheduled',
    providerShort: 'EIA',
    periodKind: 'weekly',
    freshnessAnchor: 'observation-end',
  },
  'bls-grocery': {
    datasetId: 'bls-grocery',
    expectedCadence: 'monthly',
    staleAfterDays: 45,
    refreshMode: 'scheduled',
    providerShort: 'BLS',
    periodKind: 'monthly',
    freshnessAnchor: 'observation-end',
  },
  'bls-cpi': {
    datasetId: 'bls-cpi',
    expectedCadence: 'monthly',
    staleAfterDays: 45,
    refreshMode: 'scheduled',
    providerShort: 'BLS',
    periodKind: 'monthly',
    freshnessAnchor: 'observation-end',
  },
  'freddie-mac-pmms': {
    datasetId: 'freddie-mac-pmms',
    expectedCadence: 'weekly',
    staleAfterDays: 14,
    refreshMode: 'scheduled',
    providerShort: 'Freddie Mac',
    periodKind: 'weekly',
    freshnessAnchor: 'observation-end',
  },
  'us-tax': {
    datasetId: 'us-tax',
    expectedCadence: 'yearly',
    staleAfterDays: 400,
    refreshMode: 'manual',
    providerShort: 'IRS',
    periodKind: 'yearly',
    freshnessAnchor: 'observation-end',
  },
  'census-omb-geography': {
    datasetId: 'census-omb-geography',
    expectedCadence: 'yearly',
    staleAfterDays: 500,
    refreshMode: 'scheduled',
    providerShort: 'Census',
    periodKind: 'reference-year',
    freshnessAnchor: 'published-at',
  },
  'census-acs5': {
    datasetId: 'census-acs5',
    expectedCadence: 'yearly',
    staleAfterDays: 500,
    refreshMode: 'scheduled',
    providerShort: 'Census',
    periodKind: 'survey-vintage',
    freshnessAnchor: 'published-at',
  },
  'hud-fmr': {
    datasetId: 'hud-fmr',
    expectedCadence: 'yearly',
    staleAfterDays: 400,
    refreshMode: 'scheduled',
    providerShort: 'HUD',
    periodKind: 'fiscal-year',
    freshnessAnchor: 'published-at',
  },
  'bea-rpp': {
    datasetId: 'bea-rpp',
    expectedCadence: 'yearly',
    staleAfterDays: 500,
    refreshMode: 'scheduled',
    providerShort: 'BEA',
    periodKind: 'reference-year',
    freshnessAnchor: 'published-at',
  },
  'usda-food-plans': {
    datasetId: 'usda-food-plans',
    expectedCadence: 'monthly',
    staleAfterDays: 45,
    refreshMode: 'scheduled',
    providerShort: 'USDA',
    periodKind: 'monthly',
    freshnessAnchor: 'observation-end',
  },
};

export function getDatasetPolicy(datasetId: DatasetId): DatasetPolicy {
  return DATASET_POLICIES[datasetId];
}

export function scheduledDatasetIds(): DatasetId[] {
  return DATASET_IDS.filter((datasetId) => DATASET_POLICIES[datasetId].refreshMode === 'scheduled');
}
