/**
 * What a tool may claim today, given the copies of data actually on disk.
 *
 * The manifest states the contract; this evaluates it. Kept pure and given its
 * inputs rather than importing snapshots, because a tool page that pulled in
 * every snapshot to ask one question about its own source would put the whole
 * data platform into that page's bundle.
 */
import { DATASET_POLICIES, type DatasetId } from '../data/dataset-policy';
import { getDataSource, type DataSourceId } from '../data/data-sources';
import { observationPeriodEndDate, utcCalendarDate } from '../data/freshness';
import type { ToolDataManifest } from './types';

export type SourceAge = {
  sourceId: DataSourceId;
  /** Days since the period this copy describes ended. */
  ageDays: number;
  /** Present only when this copy is on disk at all. */
  present: boolean;
};

export type ToolDataReadiness = {
  /** False when a required source is missing or past the tool's staleness limit. */
  complete: boolean;
  /** Reader-facing reasons the answer cannot be presented as complete. */
  blockedBy: string[];
  /** Optional sources that dropped out. The answer stands; a benchmark does not. */
  degradedBy: string[];
  /** What the page should do about it, taken from the manifest. */
  fallback: ToolDataManifest['fallbackBehavior'];
};

function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const from = Date.parse(`${fromIsoDate.slice(0, 10)}T00:00:00.000Z`);
  const to = Date.parse(`${toIsoDate.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) throw new Error(`Cannot measure ${fromIsoDate} to ${toIsoDate}.`);
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

export type PresentSource = {
  /** The period the copy describes, in the shape its policy expects. */
  observationPeriod: string;
  /** When the provider published it, for sources whose period lags publication. */
  publishedAt?: string;
};

/**
 * Age a copy by the more forgiving of two clocks.
 *
 * Some providers describe a period long before they publish it — OEWS's May
 * 2025 reference month reached the public in May 2026, and BEA's parities run
 * further behind than that. Ageing those from the observation period alone
 * would blank a page over data that is the newest in existence. Where a
 * publication date is recorded, the copy is as old as the later of the two.
 */
function pinnedPeriodEndDate(period: string): string {
  if (/^\d{4}$/.test(period)) return observationPeriodEndDate(period, 'yearly');
  if (/^\d{4}-\d{2}$/.test(period)) return observationPeriodEndDate(period, 'monthly');
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return period;
  throw new Error(`A pinned source period must be YYYY, YYYY-MM or YYYY-MM-DD, got ${period}.`);
}

function ageOf(sourceId: DataSourceId, present: PresentSource, asOf: string): number {
  const policyId = getDataSource(sourceId).policyId;
  const periodEnd = policyId === null
    ? pinnedPeriodEndDate(present.observationPeriod)
    : observationPeriodEndDate(present.observationPeriod, DATASET_POLICIES[policyId].expectedCadence);
  const byPeriod = daysBetween(periodEnd, asOf);
  if (!present.publishedAt) return byPeriod;
  return Math.min(byPeriod, daysBetween(present.publishedAt, asOf));
}

export function evaluateToolDataReadiness(input: {
  manifest: ToolDataManifest;
  /** Copies that are actually on disk. A source absent from the map is missing. */
  present: Partial<Record<DataSourceId, PresentSource>>;
  asOf?: string;
}): ToolDataReadiness {
  const asOf = input.asOf ?? utcCalendarDate();
  const { manifest } = input;
  const blockedBy: string[] = [];
  const degradedBy: string[] = [];

  for (const sourceId of manifest.requiredDatasets) {
    const source = getDataSource(sourceId);
    const present = input.present[sourceId];
    if (!present) {
      blockedBy.push(`${source.label} is not available.`);
      continue;
    }
    const limit = manifest.maxStalenessDays;
    if (limit !== null && ageOf(sourceId, present, asOf) > limit) {
      blockedBy.push(`${source.label} is older than the ${limit} days this answer allows.`);
    }
  }

  for (const sourceId of manifest.optionalDatasets) {
    if (!input.present[sourceId]) degradedBy.push(`${getDataSource(sourceId).label} is not available.`);
  }

  return {
    complete: blockedBy.length === 0,
    blockedBy,
    degradedBy,
    fallback: manifest.fallbackBehavior,
  };
}

/** Tracked datasets this manifest depends on, so a freshness run can name the pages it breaks. */
export function requiredDatasetIds(manifest: ToolDataManifest, trackedIds: readonly DatasetId[]): DatasetId[] {
  const tracked = new Set<string>(trackedIds);
  return manifest.requiredDatasets.filter((id): id is DatasetId => tracked.has(id));
}
