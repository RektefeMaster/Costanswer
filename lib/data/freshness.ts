import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import {
  DATASET_POLICIES,
  type DatasetCadence,
  type DatasetId,
  type DatasetPolicy,
} from './dataset-policy';

/**
 * What a deployed snapshot is, relative to the provider's own release calendar.
 *
 * `current`      the provider has not published anything newer yet
 * `update-due`   the next scheduled release date has passed, so a newer figure
 *                very likely exists and this copy has not caught up
 * `stale`        old enough that it should not be presented as a current figure
 *
 * Age alone cannot separate the first two. A weekly series with a two-week
 * stale window reads as fresh through an entire missed release, which is how a
 * mortgage rate could be described as "this week's" while being a week old.
 */
export type FreshnessStatus = 'current' | 'update-due' | 'stale';
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

function freshnessAnchor(policy: DatasetPolicy, input: FreshnessInput): string {
  return policy.freshnessAnchor === 'published-at'
    ? (input.publishedAt ?? input.verifiedAt ?? input.fetchedAt ?? `${observationPeriodEndDate(input.observationPeriod, policy.expectedCadence)}T00:00:00.000Z`).slice(0, 10)
    : freshnessAnchorDate(input, policy.expectedCadence);
}

/**
 * The date the provider is next expected to publish, after the release this
 * snapshot holds. Once that date passes, this copy is behind by construction.
 *
 * Which clock to count from depends on what the observation period means. For
 * a survey week or data month it is an elapsed window, so the next release is
 * one interval past its end plus the provider's own publication lag. For a
 * fiscal year or survey vintage the period is a label — HUD's FY2027 rents are
 * published in 2026 — so only the release date the provider stamped on it can
 * anchor the next one.
 */
export function nextExpectedReleaseDate(policy: DatasetPolicy, input: FreshnessInput): string | null {
  if (policy.releaseIntervalDays === null) return null;
  if (policy.freshnessAnchor === 'published-at') {
    return addUtcDays(freshnessAnchor(policy, input), policy.releaseIntervalDays);
  }
  const observationEnd = observationPeriodEndDate(input.observationPeriod, policy.expectedCadence);
  return addUtcDays(observationEnd, policy.releaseIntervalDays + policy.publicationLagDays);
}

export function evaluateFreshness(
  policy: DatasetPolicy,
  input: FreshnessInput,
  asOf: string = PUBLISHING_SNAPSHOT_DATE,
): FreshnessStatus {
  const expectedRelease = nextExpectedReleaseDate(policy, input);
  if (expectedRelease === null || asOf < expectedRelease) return 'current';
  return asOf < addUtcDays(expectedRelease, policy.staleAfterMissedDays) ? 'update-due' : 'stale';
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
