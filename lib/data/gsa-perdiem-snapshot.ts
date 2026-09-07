import gsaReleasesJson from '@/data/gsa-perdiem/releases.json';
import { gsaPerDiemSnapshotDocuments } from './gsa-perdiem-catalog';
import { MONTH_KEYS, isDuplicateDcMetroRow, resolveEffectivePerDiemRelease, resolveLatestPublishedPerDiemRelease, type GsaPerDiemSnapshot, type MieBreakdown, type MonthKey, type PerDiemDestination, type PerDiemRelease } from './gsa-perdiem';
import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';

export const gsaPerDiemReleases = (gsaReleasesJson as { releases: PerDiemRelease[] }).releases;

/**
 * Named fiscal-year files, like HUD. `current.json` is a pointer for ingest
 * and verify — do not import it here or the Worker ships the tables twice.
 * Ingest regenerates `gsa-perdiem-catalog.ts` when a new FY file lands.
 */
const snapshotsById = new Map<string, GsaPerDiemSnapshot>(
  gsaPerDiemSnapshotDocuments.map((snapshot) => [snapshot.snapshotId, snapshot]),
);

export function getGsaPerDiemSnapshotById(snapshotId: string): GsaPerDiemSnapshot {
  const snapshot = snapshotsById.get(snapshotId);
  if (!snapshot) throw new Error(`Unknown GSA per diem snapshot ${snapshotId}.`);
  return snapshot;
}

export function resolveGsaPerDiemSnapshot(asOf: string = PUBLISHING_SNAPSHOT_DATE): GsaPerDiemSnapshot {
  return getGsaPerDiemSnapshotById(resolveEffectivePerDiemRelease(gsaPerDiemReleases, asOf).snapshotId);
}

export function latestPublishedGsaPerDiemSnapshot(): GsaPerDiemSnapshot {
  return getGsaPerDiemSnapshotById(resolveLatestPublishedPerDiemRelease(gsaPerDiemReleases).snapshotId);
}

/** Calculator default: the rates effective on the publishing clock. Trip dates pick their own FY. */
export const gsaPerDiemSnapshot = resolveGsaPerDiemSnapshot();

const byKey = new Map(gsaPerDiemSnapshot.destinations.map((row) => [row.key, row]));
const standardByState = new Map<string, PerDiemDestination>(
  gsaPerDiemSnapshot.destinations.filter((row) => row.isStandardRate).map((row) => [row.state as string, row]),
);
const mieByTotal = new Map(gsaPerDiemSnapshot.mieBreakdowns.map((row) => [row.total, row]));

export function getPerDiemDestination(key: string): PerDiemDestination | undefined {
  return byKey.get(key);
}

/**
 * GSA lists specific cities and counties, and gives every state one standard
 * rate for everywhere else. A trip to a town that is not listed is not
 * unpriced; it takes its state's standard rate.
 */
export function getStandardRateForState(state: string): PerDiemDestination | undefined {
  return standardByState.get(state);
}

export function getMieBreakdown(total: number): MieBreakdown {
  const row = mieByTotal.get(total);
  if (!row) throw new Error(`No published M&IE breakdown for a ${total} total.`);
  return row;
}

/** Month key for a calendar date, so each night is priced in its own month. */
export function monthKeyForDate(isoDate: string): MonthKey {
  const month = Number(isoDate.slice(5, 7));
  const key = MONTH_KEYS[month - 1];
  if (!key) throw new Error(`Invalid month in date ${isoDate}.`);
  return key;
}

/**
 * Destinations a reader can pick.
 *
 * GSA repeats the Washington DC metro rate under Maryland and Virginia. Those
 * clones stay in the snapshot — they are what the API published — but they are
 * not offered as separate places, because they are the same ceiling.
 */
export function listPerDiemDestinations(): PerDiemDestination[] {
  return gsaPerDiemSnapshot.destinations.filter((row) => !isDuplicateDcMetroRow(row));
}
