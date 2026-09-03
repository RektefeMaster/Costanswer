import path from 'node:path';
import { FREDDIE_MAC_PMMS_SOURCE_URL, freddieMacPmmsSnapshotSchema, normalizeFreddieMacPmmsHtml } from '../lib/data/freddie-mac-pmms';
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
const dataDirectory = path.join(root, 'data', 'freddie-mac');

async function runIngestion(): Promise<void> {
  const html = await fetchText(FREDDIE_MAC_PMMS_SOURCE_URL, { headers: { accept: 'text/html' } });
  const fetchedAt = new Date().toISOString();
  const normalized = sealNormalizedSnapshot(normalizeFreddieMacPmmsHtml(html, { fetchedAt, rawSha256: sha256(html) }));
  freddieMacPmmsSnapshotSchema.parse(normalized);

  const previous = await readJsonIfPresent<typeof normalized>(path.join(dataDirectory, 'pmms.normalized.json'));
  const decision = evaluateRefreshDecision({
    previous,
    nextPeriod: normalized.observationPeriod,
    payloadUnchanged: previous
      ? normalized.thirtyYearFixedPercent === previous.thirtyYearFixedPercent
        && normalized.fifteenYearFixedPercent === previous.fifteenYearFixedPercent
      : true,
  });
  if (decision === 'already-current') {
    console.log(`${normalized.snapshotId} is already current; no files changed.`);
    return;
  }

  await promoteSnapshotFiles({
    dataDirectory,
    snapshot: normalized,
    normalizedFileName: 'pmms.normalized.json',
    rawRelativePath: path.join('raw', `${normalized.observationPeriod}.html`),
    rawContents: html,
  });

  console.log(`Published ${normalized.snapshotId}: 30-year ${normalized.thirtyYearFixedPercent}% / 15-year ${normalized.fifteenYearFixedPercent}%.`);
}

const releaseLock = await acquireIngestionLock(dataDirectory);
try {
  await runIngestion();
} finally {
  await releaseLock();
}
