import path from 'node:path';
import { blsGrocerySnapshotSchema, grocerySeriesIdBatches, mergeBlsApiResponses, normalizeBlsGroceryResponse } from '../lib/data/bls-grocery';
import {
  acquireIngestionLock,
  evaluateRefreshDecision,
  fetchJson,
  promoteSnapshotFiles,
  readJsonIfPresent,
  sealNormalizedSnapshot,
  sha256,
} from './ingest-io';

const root = process.cwd();
const dataDirectory = path.join(root, 'data', 'bls');
const BLS_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

async function fetchBlsBatch(seriesid: string[]): Promise<unknown> {
  return fetchJson(BLS_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      seriesid,
      startyear: '2025',
      endyear: '2026',
    }),
  });
}

async function fetchBls(): Promise<unknown> {
  const batches = grocerySeriesIdBatches();
  const payloads: unknown[] = [];
  for (const [index, seriesid] of batches.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 400));
    payloads.push(await fetchBlsBatch(seriesid));
  }
  return mergeBlsApiResponses(payloads);
}

async function runIngestion(): Promise<void> {
  const raw = await fetchBls();
  const rawText = `${JSON.stringify(raw, null, 2)}\n`;
  const fetchedAt = new Date().toISOString();
  const normalized = sealNormalizedSnapshot(normalizeBlsGroceryResponse(raw, { fetchedAt, rawSha256: sha256(rawText) }));
  blsGrocerySnapshotSchema.parse(normalized);

  const previous = await readJsonIfPresent<typeof normalized>(path.join(dataDirectory, 'grocery-apu.normalized.json'));
  const decision = evaluateRefreshDecision({
    previous,
    nextPeriod: normalized.observationPeriod,
    payloadUnchanged: previous ? JSON.stringify(normalized.items) === JSON.stringify(previous.items) : true,
  });
  if (decision === 'already-current') {
    console.log(`${normalized.snapshotId} is already current; no files changed.`);
    return;
  }

  await promoteSnapshotFiles({
    dataDirectory,
    snapshot: normalized,
    normalizedFileName: 'grocery-apu.normalized.json',
    rawRelativePath: path.join('raw', `${normalized.snapshotId}.json`),
    rawContents: rawText,
  });

  console.log(`Published ${normalized.snapshotId} with ${normalized.items.length} grocery staples.`);
}

const releaseLock = await acquireIngestionLock(dataDirectory);
try {
  await runIngestion();
} finally {
  await releaseLock();
}
