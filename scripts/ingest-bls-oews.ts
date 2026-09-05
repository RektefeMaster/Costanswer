/**
 * Ingest one BLS OEWS release.
 *
 * OEWS ships as two ZIP archives per reference year — national and state — each
 * holding a single workbook. BLS names them by the two-digit reference year, so
 * the newest release is found by probing years downward rather than by parsing a
 * landing page that changes shape.
 *
 * Unlike the other official datasets, the normalized snapshot is 20 MB — larger
 * than the whole application — so it is not committed. What is committed is the
 * raw archives BLS served, a receipt fixing their digests, a manifest carrying
 * the normalized hash, and a small index the application imports. Running with
 * `--rebuild` regenerates the snapshot from those committed archives and refuses
 * to write it unless it hashes to the value the manifest already promised, which
 * is what keeps the uncommitted file auditable.
 */
import { mkdir, open, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  blsOewsIndexSchema,
  blsOewsSnapshotSchema,
  blsOewsWagesSchema,
  deriveOewsIndex,
  deriveOewsWages,
  verifyOewsWagesRoundTrip,
  normalizeOewsWorkbooks,
  type BlsOewsSnapshot,
  type OewsTable,
} from '../lib/data/bls-oews';
import { readWorkbook } from './xlsx';
import { readZipEntries } from './zip';
import {
  acquireIngestionLock,
  atomicWrite,
  evaluateRefreshDecision,
  fetchBytes,
  manifestTextFor,
  readJsonIfPresent,
  sealNormalizedSnapshot,
  sha256,
  sha256Bytes,
  writeImmutable,
} from './ingest-io';

const root = process.cwd();
const dataDirectory = path.join(root, 'data', 'bls-oews');

/** OEWS reference month. The survey is published once a year for May. */
const REFERENCE_MONTH = '05';
const RELEASE_BASE_URL = 'https://www.bls.gov/oes/special-requests';
/** How many reference years back to probe before giving up. */
const MAX_RELEASE_LOOKBACK = 3;
/** Local file header of the first entry, which every non-empty ZIP starts with. */
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

function releaseUrl(shortYear: string, scope: 'nat' | 'st'): string {
  return `${RELEASE_BASE_URL}/oesm${shortYear}${scope}.zip`;
}

function looksLikeZip(bytes: Uint8Array): boolean {
  return ZIP_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/** The one workbook inside an OEWS archive, read as a header plus data rows. */
function tableFromArchive(archive: Uint8Array, scope: 'national' | 'state'): OewsTable {
  const entries = [...readZipEntries(archive)].filter(([name]) => name.toLowerCase().endsWith('.xlsx'));
  if (entries.length !== 1) {
    throw new Error(`OEWS ${scope} archive holds ${entries.length} workbooks; expected exactly one.`);
  }
  const workbook = readWorkbook(entries[0][1]);
  const dataSheets = workbook.sheetNames.filter((name) => /_M\d{4}_dl$/.test(name));
  if (dataSheets.length !== 1) {
    throw new Error(`OEWS ${scope} workbook has ${dataSheets.length} data sheets; expected exactly one of ${workbook.sheetNames.join(', ')}.`);
  }
  const iterator = workbook.rows(dataSheets[0]);
  const first = iterator.next();
  if (first.done) throw new Error(`OEWS ${scope} sheet ${dataSheets[0]} is empty.`);
  return { header: first.value, rows: iterator };
}

type Archive = { url: string; bytes: number; sha256: string; lastModified: string | null };
type Receipt = { observationPeriod: string; fetchedAt: string; archives: Archive[]; combinedSha256: string };
type FetchedArchive = { url: string; bytes: Uint8Array; sha256: string; lastModified: string | null };
type Release = { shortYear: string; observationPeriod: string; national: FetchedArchive; state: FetchedArchive };

function receiptPath(observationPeriod: string): string {
  return path.join(dataDirectory, 'raw', `${observationPeriod}.receipt.json`);
}

function archivePath(shortYear: string, scope: 'nat' | 'st'): string {
  return path.join(dataDirectory, 'raw', `oesm${shortYear}${scope}.zip`);
}

/**
 * When BLS published this release.
 *
 * The archives carry a `Last-Modified` header and no publication date inside
 * the workbook, so the later of the two files is the release instant. A missing
 * header would otherwise silently date the snapshot to the day it was fetched.
 */
function publishedAtFrom(archives: Array<{ lastModified: string | null }>): string {
  const stamps = archives
    .map((archive) => archive.lastModified)
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));
  if (stamps.length === 0) {
    throw new Error('OEWS archives carried no Last-Modified header, so the release date cannot be established.');
  }
  return new Date(Math.max(...stamps)).toISOString();
}

function combinedDigest(nationalSha: string, stateSha: string): string {
  return sha256(JSON.stringify({ national: nationalSha, state: stateSha }));
}

async function findLatestRelease(notBefore: string | undefined): Promise<Release> {
  const attempted: string[] = [];
  const startYear = new Date().getUTCFullYear();
  for (let year = startYear; year > startYear - MAX_RELEASE_LOOKBACK - 1; year -= 1) {
    const observationPeriod = `${year}-${REFERENCE_MONTH}`;
    if (notBefore && observationPeriod < notBefore) break;
    const shortYear = String(year % 100).padStart(2, '0');
    const nationalUrl = releaseUrl(shortYear, 'nat');
    const stateUrl = releaseUrl(shortYear, 'st');
    try {
      // A reference year BLS has not published yet answers with a 301 to a
      // landing page, which `fetch` would otherwise follow to a 200 full of
      // HTML. Refusing the redirect turns "not published" into a clean miss.
      const [national, state] = await Promise.all([
        fetchBytes(nationalUrl, { timeoutMs: 120_000, redirect: 'manual' }),
        fetchBytes(stateUrl, { timeoutMs: 300_000, redirect: 'manual' }),
      ]);
      for (const [label, archive] of [['national', national], ['state', state]] as const) {
        if (!looksLikeZip(archive.bytes)) {
          throw new Error(`the ${label} response was not a ZIP archive (${archive.bytes.length} bytes)`);
        }
      }
      return {
        shortYear,
        observationPeriod,
        national: { url: nationalUrl, sha256: sha256Bytes(national.bytes), ...national },
        state: { url: stateUrl, sha256: sha256Bytes(state.bytes), ...state },
      };
    } catch (error) {
      attempted.push(`${observationPeriod}: ${(error as Error).message}`);
    }
  }
  throw new Error(`No OEWS release was reachable. Tried ${attempted.join(' | ')}`);
}

async function writeSnapshotArtifacts(snapshot: BlsOewsSnapshot): Promise<void> {
  await mkdir(path.join(dataDirectory, 'snapshots'), { recursive: true });
  const index = blsOewsIndexSchema.parse(deriveOewsIndex(snapshot));
  const wages = blsOewsWagesSchema.parse(deriveOewsWages(snapshot));
  verifyOewsWagesRoundTrip(snapshot, wages);
  await atomicWrite(path.join(dataDirectory, 'snapshots', `${snapshot.snapshotId}.json`), `${JSON.stringify(snapshot)}\n`);
  await atomicWrite(path.join(dataDirectory, 'manifest.json'), manifestTextFor(snapshot));
  await atomicWrite(path.join(dataDirectory, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  // Packed columns, not pretty-printed: this file is 2.7 MB and is read by the
  // application, never by a person.
  await atomicWrite(path.join(dataDirectory, 'wages.json'), `${JSON.stringify(wages)}\n`);
}

/** Regenerate the uncommitted snapshot from the committed archives. */
async function rebuildFromCommittedArchives(): Promise<void> {
  const manifest = await readJsonIfPresent<{ currentSnapshotId: string; observationPeriod: string; normalizedSha256: string }>(
    path.join(dataDirectory, 'manifest.json'),
  );
  if (!manifest) throw new Error('There is no promoted OEWS manifest to rebuild from. Run the ingest without --rebuild first.');
  const receipt = await readJsonIfPresent<Receipt>(receiptPath(manifest.observationPeriod));
  if (!receipt) throw new Error(`OEWS receipt for ${manifest.observationPeriod} is missing; the archives cannot be verified.`);

  const shortYear = String(Number(manifest.observationPeriod.slice(0, 4)) % 100).padStart(2, '0');
  const archives = await Promise.all((['nat', 'st'] as const).map(async (scope) => {
    const filePath = archivePath(shortYear, scope);
    const bytes = new Uint8Array(await readFile(filePath));
    const digest = sha256Bytes(bytes);
    const declared = receipt.archives.find((archive) => archive.url.endsWith(`oesm${shortYear}${scope}.zip`));
    if (!declared) throw new Error(`The receipt does not describe oesm${shortYear}${scope}.zip.`);
    if (declared.sha256 !== digest) throw new Error(`${path.basename(filePath)} does not match the digest in the receipt.`);
    return { scope, bytes, lastModified: declared.lastModified, url: declared.url };
  }));
  const national = archives.find((archive) => archive.scope === 'nat')!;
  const state = archives.find((archive) => archive.scope === 'st')!;

  const snapshot = sealNormalizedSnapshot(normalizeOewsWorkbooks({
    national: tableFromArchive(national.bytes, 'national'),
    state: tableFromArchive(state.bytes, 'state'),
    observationPeriod: manifest.observationPeriod,
    fetchedAt: receipt.fetchedAt,
    publishedAt: publishedAtFrom(archives),
    rawSha256: receipt.combinedSha256,
    sourceUrl: state.url,
    nationalSourceUrl: national.url,
  }));
  if (snapshot.normalizedSha256 !== manifest.normalizedSha256) {
    throw new Error(`Rebuilt OEWS snapshot hashes to ${snapshot.normalizedSha256}, not the promoted ${manifest.normalizedSha256}.`);
  }
  blsOewsSnapshotSchema.parse(snapshot);
  await writeSnapshotArtifacts(snapshot);
  console.log(`Rebuilt ${snapshot.snapshotId} from committed archives; hash matches the manifest.`);
}

async function runIngestion(): Promise<void> {
  const manifest = await readJsonIfPresent<{ observationPeriod: string }>(path.join(dataDirectory, 'manifest.json'));
  const previousReceipt = manifest ? await readJsonIfPresent<Receipt>(receiptPath(manifest.observationPeriod)) : undefined;
  const release = await findLatestRelease(manifest?.observationPeriod);
  const fetchedAt = new Date().toISOString();
  const rawSha256 = combinedDigest(release.national.sha256, release.state.sha256);

  const decision = evaluateRefreshDecision({
    previous: manifest,
    nextPeriod: release.observationPeriod,
    payloadUnchanged: previousReceipt?.combinedSha256 === rawSha256,
  });
  if (decision === 'already-current') {
    console.log(`OEWS ${release.observationPeriod} is already current; no files changed.`);
    return;
  }

  const snapshot = sealNormalizedSnapshot(normalizeOewsWorkbooks({
    national: tableFromArchive(release.national.bytes, 'national'),
    state: tableFromArchive(release.state.bytes, 'state'),
    observationPeriod: release.observationPeriod,
    fetchedAt,
    publishedAt: publishedAtFrom([release.national, release.state]),
    rawSha256,
    sourceUrl: release.state.url,
    nationalSourceUrl: release.national.url,
  }));
  blsOewsSnapshotSchema.parse(snapshot);

  await mkdir(path.join(dataDirectory, 'raw'), { recursive: true });
  for (const [scope, archive] of [['nat', release.national], ['st', release.state]] as const) {
    // Immutable: an agency that silently reissues an archive under the same
    // name must be reviewed, not absorbed.
    await writeImmutableBytes(archivePath(release.shortYear, scope), archive.bytes);
  }
  const receipt: Receipt = {
    observationPeriod: release.observationPeriod,
    fetchedAt,
    archives: [release.national, release.state].map((archive) => ({
      url: archive.url,
      bytes: archive.bytes.length,
      sha256: archive.sha256,
      lastModified: archive.lastModified,
    })),
    combinedSha256: rawSha256,
  };
  await writeImmutable(receiptPath(release.observationPeriod), `${JSON.stringify(receipt, null, 2)}\n`);
  await writeSnapshotArtifacts(snapshot);

  const detailed = snapshot.occupations.filter((occupation) => occupation.group === 'detailed').length;
  console.log(`Published ${snapshot.snapshotId}: ${detailed} detailed occupations, ${snapshot.estimates.length.toLocaleString('en-US')} area estimates.`);
}

async function writeImmutableBytes(targetPath: string, bytes: Uint8Array): Promise<void> {
  try {
    const handle = await open(targetPath, 'wx');
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const existing = new Uint8Array(await readFile(targetPath));
    if (sha256Bytes(existing) !== sha256Bytes(bytes)) {
      throw new Error(`Refusing to overwrite immutable archive ${path.basename(targetPath)} with different bytes.`);
    }
  }
}

const releaseLock = await acquireIngestionLock(dataDirectory);
try {
  if (process.argv.includes('--rebuild')) await rebuildFromCommittedArchives();
  else await runIngestion();
} finally {
  await releaseLock();
}

export {};
