import currentHudJson from '@/data/hud-fmr/current.json';
import hudReleasesJson from '@/data/hud-fmr/releases.json';
import hudFy2026Json from '@/data/hud-fmr/snapshots/hud-fmr-fy2026-revised-2026-05-21-v1.json';
import hudFy2027Json from '@/data/hud-fmr/snapshots/hud-fmr-fy2027-v1.json';
import {
  hudFmrSnapshotSchema,
  resolveEffectiveHudRelease,
  resolveLatestPublishedHudRelease,
  type HudFmrArea,
  type HudFmrSnapshot,
  type HudRelease,
} from './hud-fmr';
import { assertManifestMatchesSnapshot, assertNormalizedHash, snapshotRecordFromEnvelope } from './envelope';
import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import { z } from 'zod';

const manifestSchema = z.object({
  currentSnapshotId: z.string(),
  observationPeriod: z.string(),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
}).strict();

const envelopeSchema = z.object({
  manifest: manifestSchema,
  snapshot: hudFmrSnapshotSchema,
}).strict();

const releasesSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  releases: z.array(z.object({
    snapshotId: z.string(),
    fiscalYear: z.number().int(),
    publishedAt: z.string(),
    effectiveFrom: z.string(),
    effectiveTo: z.string(),
    revisionId: z.string(),
    latestPublished: z.boolean(),
  }).strict()).min(1),
}).strict();

export function validateHudEnvelope(rawEnvelope: unknown) {
  const computed = assertNormalizedHash(snapshotRecordFromEnvelope(rawEnvelope, 'Bundled HUD FMR'), 'Bundled HUD FMR data');
  const envelope = envelopeSchema.parse(rawEnvelope);
  assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computed, 'HUD FMR');
  return envelope;
}

const publishedEnvelope = validateHudEnvelope(currentHudJson);
export const hudLatestPublishedSnapshot = publishedEnvelope.snapshot;
export const hudManifest = publishedEnvelope.manifest;
export const hudReleases = releasesSchema.parse(hudReleasesJson).releases as HudRelease[];

const snapshotsById = new Map<string, HudFmrSnapshot>([
  [hudFmrSnapshotSchema.parse(hudFy2026Json).snapshotId, hudFmrSnapshotSchema.parse(hudFy2026Json)],
  [hudFmrSnapshotSchema.parse(hudFy2027Json).snapshotId, hudFmrSnapshotSchema.parse(hudFy2027Json)],
]);

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

export function getHudArea(snapshot: HudFmrSnapshot, hudAreaCode: string): HudFmrArea | undefined {
  return snapshot.areas.find((area) => area.hudAreaCode === hudAreaCode);
}

export function uniqueHudAreaForCounty(snapshot: HudFmrSnapshot, countyGeoid: string): HudFmrArea | 'ambiguous' | undefined {
  if (snapshot.ambiguousCounties.some((row) => row.countyGeoid === countyGeoid)) return 'ambiguous';
  const mapped = snapshot.countyMaps.find((row) => row.countyGeoid === countyGeoid);
  if (!mapped) return undefined;
  return getHudArea(snapshot, mapped.hudAreaCode);
}
