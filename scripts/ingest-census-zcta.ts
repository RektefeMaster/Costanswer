import path from 'node:path';
import {
  ZCTA_COUNTY_SOURCE_URL,
  normalizeZctaCountyRelationship,
  zctaCountySnapshotSchema,
  type ZctaCountySnapshot,
} from '../lib/data/zcta-county';
import {
  acquireIngestionLock,
  evaluateRefreshDecision,
  fetchText,
  promoteSnapshotFiles,
  readJsonIfPresent,
  sealNormalizedSnapshot,
  sha256,
} from './ingest-io';

const root = process.cwd();
const dataDirectory = path.join(root, 'data', 'zcta-county');

/** Census geography vintage the relationship file describes. */
const VINTAGE = Number(process.env.ZCTA_VINTAGE ?? 2020);

async function runIngestion(): Promise<void> {
  const fileText = await fetchText(ZCTA_COUNTY_SOURCE_URL, { headers: { accept: 'text/plain' }, timeoutMs: 120_000 });
  const fetchedAt = new Date().toISOString();
  const normalized = sealNormalizedSnapshot(
    normalizeZctaCountyRelationship(fileText, { vintage: VINTAGE, fetchedAt, rawSha256: sha256(fileText) }),
  );
  zctaCountySnapshotSchema.parse(normalized);

  const previous = await readJsonIfPresent<ZctaCountySnapshot>(path.join(dataDirectory, 'zcta-county.normalized.json'));
  const decision = evaluateRefreshDecision({
    previous,
    nextPeriod: normalized.observationPeriod,
    payloadUnchanged: previous ? JSON.stringify(normalized.areas) === JSON.stringify(previous.areas) : true,
  });
  if (decision === 'already-current') {
    console.log(`${normalized.snapshotId} is already current; no files changed.`);
    return;
  }

  await promoteSnapshotFiles({
    dataDirectory,
    snapshot: normalized,
    normalizedFileName: 'zcta-county.normalized.json',
    rawRelativePath: path.join('raw', `${VINTAGE}.txt`),
    rawContents: fileText,
  });

  console.log(`Published ${normalized.snapshotId} with ${normalized.areas.length} ZCTAs.`);
}

const releaseLock = await acquireIngestionLock(dataDirectory);
try {
  await runIngestion();
} finally {
  await releaseLock();
}
