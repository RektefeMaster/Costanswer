import hudReleasesJson from '@/data/hud-fmr/releases.json';
import hudFy2026Json from '@/data/hud-fmr/snapshots/hud-fmr-fy2026-revised-2026-05-21-v1.json';
import hudFy2027Json from '@/data/hud-fmr/snapshots/hud-fmr-fy2027-v1.json';
import {
  resolveEffectiveHudRelease,
  resolveLatestPublishedHudRelease,
  type HudFmrArea,
  type HudFmrSnapshot,
  type HudRelease,
} from './hud-fmr';
import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';

const snapshotsById = new Map<string, HudFmrSnapshot>(
  [hudFy2026Json, hudFy2027Json].map((raw) => {
    const snapshot = raw as unknown as HudFmrSnapshot;
    return [snapshot.snapshotId, snapshot];
  }),
);

export const hudReleases = (hudReleasesJson as { releases: HudRelease[] }).releases;

export function getHudSnapshotById(snapshotId: string): HudFmrSnapshot {
  const snapshot = snapshotsById.get(snapshotId);
  if (!snapshot) throw new Error(`Unknown HUD FMR snapshot ${snapshotId}.`);
  return snapshot;
}

export function resolveHudFmrSnapshot(asOf: string = PUBLISHING_SNAPSHOT_DATE): HudFmrSnapshot {
  const release = resolveEffectiveHudRelease(hudReleases, asOf);
  return getHudSnapshotById(release.snapshotId);
}

export function latestPublishedHudSnapshot(): HudFmrSnapshot {
  return getHudSnapshotById(resolveLatestPublishedHudRelease(hudReleases).snapshotId);
}

/**
 * `data/hud-fmr/current.json` wraps a byte-identical copy of the latest
 * published release, so the runtime reads that release out of the snapshot map
 * instead of importing the duplicate — the bundler was otherwise shipping the
 * same 1.4 MB of FMR tables twice.
 */
export const hudLatestPublishedSnapshot = latestPublishedHudSnapshot();

export const hudManifest = {
  currentSnapshotId: hudLatestPublishedSnapshot.snapshotId,
  observationPeriod: hudLatestPublishedSnapshot.observationPeriod,
  normalizedSha256: hudLatestPublishedSnapshot.normalizedSha256,
  validationStatus: 'passed' as const,
};

export function getHudArea(snapshot: HudFmrSnapshot, hudAreaCode: string): HudFmrArea | undefined {
  return snapshot.areas.find((area) => area.hudAreaCode === hudAreaCode);
}

export function uniqueHudAreaForCounty(snapshot: HudFmrSnapshot, countyGeoid: string): HudFmrArea | 'ambiguous' | undefined {
  if (snapshot.ambiguousCounties.some((row) => row.countyGeoid === countyGeoid)) return 'ambiguous';
  const mapped = snapshot.countyMaps.find((row) => row.countyGeoid === countyGeoid);
  if (!mapped) return undefined;
  return getHudArea(snapshot, mapped.hudAreaCode);
}
