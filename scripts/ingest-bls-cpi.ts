import path from 'node:path';
import {
  BLS_CPI_API_URL,
  BLS_CPI_SERIES_ID,
  BLS_CPI_TIMESERIES_URL,
  blsCpiSnapshotSchema,
  blsCpiYearWindows,
  mergeCpiObservations,
  normalizeBlsCpiObservations,
  observationsFromBlsCpiResponse,
  observationsFromBlsTimeSeries,
  type BlsCpiSnapshot,
  type CpiObservation,
} from '../lib/data/bls-cpi';
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
const dataDirectory = path.join(root, 'data', 'bls-cpi');

async function fetchBlsLatestWindow(): Promise<{ payload: unknown; observations: CpiObservation[] } | undefined> {
  const latestYear = new Date().getUTCFullYear();
  const window = blsCpiYearWindows(Math.max(1913, latestYear - 9), latestYear).at(-1);
  if (!window) return undefined;
  const body = JSON.stringify({
    seriesid: [BLS_CPI_SERIES_ID],
    startyear: window.startyear,
    endyear: window.endyear,
  });
  const text = await fetchText(BLS_CPI_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body,
  });
  const payload = JSON.parse(text) as { status?: string; message?: string[] };
  if (payload.status !== 'REQUEST_SUCCEEDED') {
    console.log(`Skipping BLS CPI API overlay: ${payload.message?.join(' ') ?? payload.status ?? 'unknown status'}`);
    return undefined;
  }
  return { payload, observations: observationsFromBlsCpiResponse(payload) };
}

async function runIngestion(): Promise<void> {
  const previous = await readJsonIfPresent<BlsCpiSnapshot>(path.join(dataDirectory, 'cpi-u-nsa.normalized.json'));
  const seriesText = await fetchText(BLS_CPI_TIMESERIES_URL, {
    headers: { accept: 'text/plain' },
  });
  let observations = observationsFromBlsTimeSeries(seriesText);
  const rawParts: unknown[] = [{ source: BLS_CPI_TIMESERIES_URL, seriesId: BLS_CPI_SERIES_ID, text: seriesText }];

  try {
    const bls = await fetchBlsLatestWindow();
    if (bls) {
      observations = mergeCpiObservations(observations, bls.observations);
      rawParts.push({ source: BLS_CPI_API_URL, payload: bls.payload });
    }
  } catch (error) {
    console.log(`BLS CPI API overlay failed; continuing from the official time-series file. ${error instanceof Error ? error.message : error}`);
  }

  if (previous) observations = mergeCpiObservations(previous.observations, observations);

  const fetchedAt = new Date().toISOString();
  const rawText = `${JSON.stringify(rawParts, null, 2)}\n`;
  const normalized = sealNormalizedSnapshot(normalizeBlsCpiObservations(observations, { fetchedAt, rawSha256: sha256(rawText) }));
  blsCpiSnapshotSchema.parse(normalized);

  const decision = evaluateRefreshDecision({
    previous,
    nextPeriod: normalized.observationPeriod,
    payloadUnchanged: previous ? JSON.stringify(normalized.observations) === JSON.stringify(previous.observations) : true,
  });
  if (decision === 'already-current') {
    console.log(`${normalized.snapshotId} is already current; no files changed.`);
    return;
  }

  await promoteSnapshotFiles({
    dataDirectory,
    snapshot: normalized,
    normalizedFileName: 'cpi-u-nsa.normalized.json',
    rawRelativePath: path.join('raw', `${normalized.observationPeriod}.json`),
    rawContents: rawText,
  });

  console.log(`Published ${normalized.snapshotId} with ${normalized.observations.length} monthly CPI-U observations.`);
}

const releaseLock = await acquireIngestionLock(dataDirectory);
try {
  await runIngestion();
} finally {
  await releaseLock();
}
