import { sha256 } from './sha256';

export function assertNormalizedHash(snapshotRecord: object, label: string): string {
  if (!('normalizedSha256' in snapshotRecord)) {
    throw new Error(`${label} is missing its normalized hash.`);
  }
  const { normalizedSha256: embeddedNormalizedHash, ...hashableSnapshot } = snapshotRecord as Record<string, unknown>;
  const computedNormalizedHash = sha256(JSON.stringify(hashableSnapshot));
  if (computedNormalizedHash !== embeddedNormalizedHash) {
    throw new Error(`${label} failed its normalized SHA-256 integrity check.`);
  }
  return computedNormalizedHash;
}

export function assertManifestMatchesSnapshot(
  manifest: { currentSnapshotId: string; observationPeriod: string; normalizedSha256: string },
  snapshot: { snapshotId: string; observationPeriod: string; normalizedSha256: string },
  computedHash: string,
  label: string,
): void {
  if (
    manifest.currentSnapshotId !== snapshot.snapshotId
    || manifest.observationPeriod !== snapshot.observationPeriod
    || manifest.normalizedSha256 !== snapshot.normalizedSha256
    || manifest.normalizedSha256 !== computedHash
  ) {
    throw new Error(`${label} manifest does not match the promoted snapshot. Publication is incomplete.`);
  }
}

export function snapshotRecordFromEnvelope(rawEnvelope: unknown, label: string): object {
  if (!rawEnvelope || typeof rawEnvelope !== 'object' || !('snapshot' in rawEnvelope)) {
    throw new Error(`${label} publication envelope is missing a snapshot.`);
  }
  const snapshotRecord = (rawEnvelope as { snapshot?: unknown }).snapshot;
  if (!snapshotRecord || typeof snapshotRecord !== 'object') {
    throw new Error(`${label} snapshot is missing.`);
  }
  return snapshotRecord;
}

/** Manifest that publication writes next to every snapshot. */
export type SnapshotManifest = {
  currentSnapshotId: string;
  observationPeriod: string;
  normalizedSha256: string;
  validationStatus: 'passed';
  /**
   * When someone last checked the provider and found nothing newer published.
   *
   * It lives in the manifest rather than the snapshot because it is a fact
   * about our checking, not about the data: the snapshot's bytes and its hash
   * must not change because a human looked at a web page. See
   * `FreshnessInput.confirmedLatestAt` for what it suppresses.
   */
  confirmedLatestAt?: string;
};

export type SnapshotEnvelope<Snapshot> = { manifest: SnapshotManifest; snapshot: Snapshot };

/**
 * Read a snapshot whose bytes publication already verified.
 *
 * The hash and schema checks live in `lib/data/verify.ts` and run in
 * `npm run verify:data` and the test suite. Runtime reads the committed JSON
 * directly: re-hashing and re-parsing it on every page load moved that work
 * into the browser, where it blocked hydration for hundreds of milliseconds on
 * the larger datasets.
 */
export function readVerifiedEnvelope<Snapshot>(rawEnvelope: unknown): SnapshotEnvelope<Snapshot> {
  return rawEnvelope as SnapshotEnvelope<Snapshot>;
}
