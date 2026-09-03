import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import {
  DATASET_POLICIES,
  type DatasetCadence,
  type DatasetId,
  type DatasetPolicy,
} from './dataset-policy';

export type FreshnessStatus = 'fresh' | 'stale';
export type PublicationSourceStatus = 'preliminary' | 'final' | 'revised' | 'verified' | 'unsupported';

export type FreshnessInput = {
  observationPeriod: string;
  publishedAt?: string;
  verifiedAt?: string;
  fetchedAt?: string;
};

const UTC_DAY_MS = 24 * 60 * 60 * 1000;

function utcDate(isoDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error(`Invalid calendar date: ${isoDate}`);
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== isoDate) throw new Error(`Invalid calendar date: ${isoDate}`);
  return date;
}

function lastDayOfMonth(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 0));
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(isoDate: string, days: number): string {
  return new Date(utcDate(isoDate).getTime() + days * UTC_DAY_MS).toISOString().slice(0, 10);
}

export function observationPeriodEndDate(period: string, cadence: DatasetCadence): string {
  if (cadence === 'weekly') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) throw new Error(`Weekly observation period must be YYYY-MM-DD, got ${period}.`);
    return utcDate(period).toISOString().slice(0, 10);
  }
  if (cadence === 'monthly') {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
    if (!match) throw new Error(`Monthly observation period must be YYYY-MM, got ${period}.`);
    return lastDayOfMonth(Number(match[1]), Number(match[2]));
  }
  if (cadence === 'yearly') {
    if (!/^\d{4}$/.test(period)) throw new Error(`Yearly observation period must be YYYY, got ${period}.`);
    return `${period}-12-31`;
  }
  const exhaustive: never = cadence;
  throw new Error(`Unhandled cadence: ${exhaustive}`);
}

export function freshnessAnchorDate(input: FreshnessInput, cadence: DatasetCadence): string {
  return observationPeriodEndDate(input.observationPeriod, cadence);
}

export function evaluateFreshness(
  policy: DatasetPolicy,
  input: FreshnessInput,
  asOf: string = PUBLISHING_SNAPSHOT_DATE,
): FreshnessStatus {
  const anchor = policy.freshnessAnchor === 'published-at'
    ? (input.publishedAt ?? input.verifiedAt ?? input.fetchedAt ?? `${observationPeriodEndDate(input.observationPeriod, policy.expectedCadence)}T00:00:00.000Z`).slice(0, 10)
    : freshnessAnchorDate(input, policy.expectedCadence);
  const staleOn = addUtcDays(anchor, policy.staleAfterDays + 1);
  return asOf < staleOn ? 'fresh' : 'stale';
}

export function evaluateDatasetFreshness(
  datasetId: DatasetId,
  input: FreshnessInput,
  asOf: string = PUBLISHING_SNAPSHOT_DATE,
): FreshnessStatus {
  return evaluateFreshness(DATASET_POLICIES[datasetId], input, asOf);
}

export function isPublicationSourceStatus(value: string): value is PublicationSourceStatus {
  return value === 'preliminary' || value === 'final' || value === 'revised' || value === 'verified' || value === 'unsupported';
}
