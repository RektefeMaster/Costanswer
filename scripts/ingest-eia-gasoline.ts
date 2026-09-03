import path from 'node:path';
import {
  EIA_GASOLINE_API_ROUTE,
  EIA_GASOLINE_SERIES_BY_CODE,
  EIA_GASOLINE_SOURCE_URL,
  eiaGasolineSnapshotSchema,
  normalizeEiaGasolineApiResponse,
  normalizeEiaGasolineHtml,
} from '../lib/data/eia-gasoline';
import { EIA_GASOLINE_GEOGRAPHY_CODES } from '../lib/location/gasoline-geography';
import {
  abnormalRelativeChangeCodes,
  acquireIngestionLock,
  evaluateRefreshDecision,
  fetchJson,
  fetchText,
  promoteSnapshotFiles,
  readJsonIfPresent,
  sealNormalizedSnapshot,
  sha256,
} from './ingest-io';

const root = process.cwd();
const dataDirectory = path.join(root, 'data', 'eia-gasoline');
const MAX_WEEK_OVER_WEEK_CHANGE_PERCENT = 80;

function envPresent(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim() && !value.startsWith('replace-with-'));
}

function buildGasolineApiUrl(apiKey: string): string {
  const url = new URL(EIA_GASOLINE_API_ROUTE);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('frequency', 'weekly');
  url.searchParams.set('data[0]', 'value');
  url.searchParams.set('sort[0][column]', 'period');
  url.searchParams.set('sort[0][direction]', 'desc');
  url.searchParams.set('length', '5000');
  for (const code of EIA_GASOLINE_GEOGRAPHY_CODES) {
    url.searchParams.append('facets[series][]', EIA_GASOLINE_SERIES_BY_CODE[code]);
  }
  return url.toString();
}

async function loadCandidate(): Promise<{ rawContents: string; rawRelativePath: string; snapshot: ReturnType<typeof normalizeEiaGasolineHtml> }> {
  const fetchedAt = new Date().toISOString();
  if (envPresent('EIA_API_KEY')) {
    try {
      const raw = await fetchJson(buildGasolineApiUrl(process.env.EIA_API_KEY ?? ''));
      const rawContents = `${JSON.stringify(raw, null, 2)}\n`;
      const snapshot = normalizeEiaGasolineApiResponse(raw, { fetchedAt, rawSha256: sha256(rawContents) });
      return { rawContents, rawRelativePath: path.join('raw', `${snapshot.observationPeriod}.json`), snapshot };
    } catch (error) {
      console.log(`EIA gasoline API ingest incomplete; falling back to the official HTML table. ${error instanceof Error ? error.message : error}`);
    }
  }
  const html = await fetchText(EIA_GASOLINE_SOURCE_URL, { headers: { accept: 'text/html' } });
  const snapshot = normalizeEiaGasolineHtml(html, { fetchedAt, rawSha256: sha256(html) });
  return { rawContents: html, rawRelativePath: path.join('raw', `${snapshot.observationPeriod}.html`), snapshot };
}

async function runIngestion(): Promise<void> {
  const loaded = await loadCandidate();
  const normalized = sealNormalizedSnapshot(loaded.snapshot);
  eiaGasolineSnapshotSchema.parse(normalized);

  const previous = await readJsonIfPresent<typeof normalized>(path.join(dataDirectory, 'gasoline-weekly.normalized.json'));
  const decision = evaluateRefreshDecision({
    previous,
    nextPeriod: normalized.observationPeriod,
    payloadUnchanged: previous ? JSON.stringify(normalized.geographies) === JSON.stringify(previous.geographies) : true,
  });

  if (previous && normalized.observationPeriod > previous.observationPeriod) {
    const abnormalChanges = abnormalRelativeChangeCodes(
      previous.geographies,
      normalized.geographies,
      (row) => row.code,
      (row) => row.dollarsPerGallon,
      MAX_WEEK_OVER_WEEK_CHANGE_PERCENT,
    );
    if (abnormalChanges.length > 0) {
      throw new Error(`Abnormal week-over-week gasoline price changes require review: ${abnormalChanges.join(', ')}`);
    }
  }

  if (decision === 'already-current') {
    console.log(`${normalized.snapshotId} is already current; no files changed.`);
    return;
  }

  await promoteSnapshotFiles({
    dataDirectory,
    snapshot: normalized,
    normalizedFileName: 'gasoline-weekly.normalized.json',
    rawRelativePath: loaded.rawRelativePath,
    rawContents: loaded.rawContents,
  });

  console.log(`Published ${normalized.snapshotId} with ${normalized.geographies.length} gasoline geographies.`);
}

const releaseLock = await acquireIngestionLock(dataDirectory);
try {
  await runIngestion();
} finally {
  await releaseLock();
}
