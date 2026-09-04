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
  'irs-retirement-limits',
] as const;

export type DatasetId = (typeof DATASET_IDS)[number];
export type DatasetCadence = 'weekly' | 'monthly' | 'yearly';
export type DatasetRefreshMode = 'scheduled' | 'manual';
export type DatasetPeriodKind = DatasetCadence | 'fiscal-year' | 'reference-year' | 'survey-vintage';
export type FreshnessAnchor = 'observation-end' | 'published-at';

export type DatasetPolicy = {
  datasetId: DatasetId;
  expectedCadence: DatasetCadence;
  /**
   * Grace period after a missed release before the copy is called stale.
   *
   * Measured from the expected release date, not from the observation period.
   * Measuring from the observation period made a dataset's own publication lag
   * count against it: EIA's Electric Power Monthly runs about two months
   * behind, so a correctly-updated June snapshot was being labelled stale in
   * mid-August while it was still the newest thing EIA had published.
   */
  staleAfterMissedDays: number;
  refreshMode: DatasetRefreshMode;
  providerShort: string;
  periodKind: DatasetPeriodKind;
  freshnessAnchor: FreshnessAnchor;
  /**
   * Days between one provider release and the next, or `null` when the provider
   * publishes on no fixed schedule.
   *
   * Age alone cannot tell a current snapshot from a superseded one: a weekly
   * series with a two-week stale window reads as fresh while a whole release
   * goes by. Modelling the provider's own calendar is what lets a snapshot say
   * "a newer figure is out" instead of "recent enough". Inventing a cadence for
   * a provider that has none is the opposite failure, so those say `null` and
   * stay current until something actually supersedes them.
   */
  releaseIntervalDays: number | null;
  /** Typical days from the end of an observation period to the provider publishing it. */
  publicationLagDays: number;
  /** How the provider describes its own release timing, shown on the data page. */
  releaseSchedule: string;
};

export const DATASET_POLICIES: Record<DatasetId, DatasetPolicy> = {
  'eia-electricity': {
    datasetId: 'eia-electricity',
    expectedCadence: 'monthly',
    staleAfterMissedDays: 30,
    refreshMode: 'scheduled',
    providerShort: 'EIA',
    periodKind: 'monthly',
    freshnessAnchor: 'observation-end',
    releaseIntervalDays: 30,
    publicationLagDays: 62,
    releaseSchedule: 'Electric Power Monthly, about two months after the data month',
  },
  'eia-gasoline': {
    datasetId: 'eia-gasoline',
    expectedCadence: 'weekly',
    staleAfterMissedDays: 7,
    refreshMode: 'scheduled',
    providerShort: 'EIA',
    periodKind: 'weekly',
    freshnessAnchor: 'observation-end',
    releaseIntervalDays: 7,
    publicationLagDays: 1,
    releaseSchedule: 'Weekly survey taken Monday, published the same day',
  },
  'bls-grocery': {
    datasetId: 'bls-grocery',
    expectedCadence: 'monthly',
    staleAfterMissedDays: 30,
    refreshMode: 'scheduled',
    providerShort: 'BLS',
    periodKind: 'monthly',
    freshnessAnchor: 'observation-end',
    releaseIntervalDays: 30,
    publicationLagDays: 13,
    releaseSchedule: 'Average Price Data, with the monthly CPI release',
  },
  'bls-cpi': {
    datasetId: 'bls-cpi',
    expectedCadence: 'monthly',
    staleAfterMissedDays: 30,
    refreshMode: 'scheduled',
    providerShort: 'BLS',
    periodKind: 'monthly',
    freshnessAnchor: 'observation-end',
    releaseIntervalDays: 30,
    publicationLagDays: 13,
    releaseSchedule: 'Monthly, mid-month for the prior month',
  },
  'freddie-mac-pmms': {
    datasetId: 'freddie-mac-pmms',
    expectedCadence: 'weekly',
    staleAfterMissedDays: 7,
    refreshMode: 'scheduled',
    providerShort: 'Freddie Mac',
    periodKind: 'weekly',
    freshnessAnchor: 'observation-end',
    releaseIntervalDays: 7,
    publicationLagDays: 0,
    releaseSchedule: 'Primary Mortgage Market Survey, Thursdays at noon ET',
  },
  'us-tax': {
    datasetId: 'us-tax',
    expectedCadence: 'yearly',
    staleAfterMissedDays: 90,
    refreshMode: 'manual',
    providerShort: 'IRS',
    periodKind: 'yearly',
    freshnessAnchor: 'observation-end',
    releaseIntervalDays: 365,
    publicationLagDays: 0,
    releaseSchedule: 'Annual inflation adjustments, published the preceding autumn',
  },
  'census-omb-geography': {
    datasetId: 'census-omb-geography',
    expectedCadence: 'yearly',
    staleAfterMissedDays: 90,
    refreshMode: 'scheduled',
    providerShort: 'Census',
    periodKind: 'reference-year',
    freshnessAnchor: 'published-at',
    releaseIntervalDays: null,
    publicationLagDays: 0,
    releaseSchedule: 'OMB delineation bulletins, issued irregularly (currently Bulletin 23-01)',
  },
  'census-acs5': {
    datasetId: 'census-acs5',
    expectedCadence: 'yearly',
    staleAfterMissedDays: 90,
    refreshMode: 'scheduled',
    providerShort: 'Census',
    periodKind: 'survey-vintage',
    freshnessAnchor: 'published-at',
    releaseIntervalDays: 365,
    publicationLagDays: 345,
    releaseSchedule: 'ACS 5-year estimates, each December',
  },
  'hud-fmr': {
    datasetId: 'hud-fmr',
    expectedCadence: 'yearly',
    staleAfterMissedDays: 90,
    refreshMode: 'scheduled',
    providerShort: 'HUD',
    periodKind: 'fiscal-year',
    freshnessAnchor: 'published-at',
    releaseIntervalDays: 365,
    publicationLagDays: 0,
    releaseSchedule: 'Fair Market Rents for the coming fiscal year, published late summer',
  },
  'bea-rpp': {
    datasetId: 'bea-rpp',
    expectedCadence: 'yearly',
    staleAfterMissedDays: 90,
    refreshMode: 'scheduled',
    providerShort: 'BEA',
    periodKind: 'reference-year',
    freshnessAnchor: 'published-at',
    releaseIntervalDays: 365,
    publicationLagDays: 415,
    releaseSchedule: 'Regional Price Parities, annual',
  },
  'usda-food-plans': {
    datasetId: 'usda-food-plans',
    expectedCadence: 'monthly',
    staleAfterMissedDays: 30,
    refreshMode: 'scheduled',
    providerShort: 'USDA',
    periodKind: 'monthly',
    freshnessAnchor: 'observation-end',
    releaseIntervalDays: 30,
    publicationLagDays: 1,
    releaseSchedule: 'Monthly food plan cost reports',
  },
  'irs-retirement-limits': {
    datasetId: 'irs-retirement-limits',
    expectedCadence: 'yearly',
    staleAfterMissedDays: 90,
    refreshMode: 'manual',
    providerShort: 'IRS',
    periodKind: 'yearly',
    freshnessAnchor: 'observation-end',
    releaseIntervalDays: 365,
    publicationLagDays: 0,
    releaseSchedule: 'Annual cost-of-living adjustments, published each autumn',
  },
};

export function getDatasetPolicy(datasetId: DatasetId): DatasetPolicy {
  return DATASET_POLICIES[datasetId];
}

export function scheduledDatasetIds(): DatasetId[] {
  return DATASET_IDS.filter((datasetId) => DATASET_POLICIES[datasetId].refreshMode === 'scheduled');
}
