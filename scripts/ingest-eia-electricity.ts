import path from 'node:path';
import { normalizeEiaElectricityResponse, eiaElectricitySnapshotSchema } from '../lib/data/eia-electricity';
import {
  abnormalRelativeChangeCodes,
  acquireIngestionLock,
  evaluateRefreshDecision,
  fetchJson,
  promoteSnapshotFiles,
  quarantineCandidate,
  readJsonIfPresent,
  sealNormalizedSnapshot,
  sha256,
  syncPromotionPointer,
} from './ingest-io';

const apiKey = process.env.EIA_API_KEY;
if (!apiKey) {
  throw new Error('EIA_API_KEY is required. Request a free key from https://www.eia.gov/opendata/register.php');
}

const root = process.cwd();
const dataDirectory = path.join(root, 'data', 'eia');
const MAX_MONTH_OVER_MONTH_CHANGE_PERCENT = 40;

function scrubSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        key.toLowerCase() === 'api_key' ? '[REDACTED]' : scrubSecrets(nested),
      ]),
    );
  }
  return value;
}

function buildUrl(options: { start?: string; length: number }): string {
  const url = new URL('https://api.eia.gov/v2/electricity/retail-sales/data/');
  url.searchParams.set('api_key', apiKey ?? '');
  url.searchParams.set('frequency', 'monthly');
  url.searchParams.set('data[0]', 'price');
  url.searchParams.set('data[1]', 'sales');
  url.searchParams.set('data[2]', 'revenue');
  url.searchParams.set('facets[sectorid][]', 'RES');
  url.searchParams.set('sort[0][column]', 'period');
  url.searchParams.set('sort[0][direction]', 'desc');
  url.searchParams.set('offset', '0');
  url.searchParams.set('length', String(options.length));
  if (options.start) {
    url.searchParams.set('start', options.start);
    url.searchParams.set('end', options.start);
  }
  return url.toString();
}

async function runIngestion(): Promise<void> {
  const probe = await fetchJson(buildUrl({ length: 1 })) as { response?: { data?: Array<{ period?: string }> } };
  const latestPeriod = probe.response?.data?.[0]?.period;
  if (!latestPeriod || !/^\d{4}-\d{2}$/.test(latestPeriod)) throw new Error('Could not determine the latest EIA period.');

  const raw = scrubSecrets(await fetchJson(buildUrl({ start: latestPeriod, length: 5000 })));
  const rawText = `${JSON.stringify(raw, null, 2)}\n`;
  const fetchedAt = new Date().toISOString();
  let candidate: ReturnType<typeof normalizeEiaElectricityResponse>;
  try {
    candidate = normalizeEiaElectricityResponse(raw, { fetchedAt, rawSha256: sha256(rawText) });
  } catch (error) {
    await quarantineCandidate(dataDirectory, 'eia-electricity', error instanceof Error ? error.message : 'Unknown normalization failure', raw);
    throw error;
  }
  const normalized = sealNormalizedSnapshot(candidate);
  eiaElectricitySnapshotSchema.parse(normalized);

  const previous = await readJsonIfPresent<typeof normalized>(path.join(dataDirectory, 'electricity-retail-sales.normalized.json'));
  let decision: ReturnType<typeof evaluateRefreshDecision> = 'promote';
  try {
    decision = evaluateRefreshDecision({
      previous,
      nextPeriod: normalized.observationPeriod,
      payloadUnchanged: previous ? JSON.stringify(normalized.states) === JSON.stringify(previous.states) : true,
    });
  } catch (error) {
    await quarantineCandidate(dataDirectory, 'eia-electricity', error instanceof Error ? error.message : 'Refresh rejected', normalized);
    throw error;
  }

  if (previous && normalized.observationPeriod > previous.observationPeriod) {
    const abnormalChanges = abnormalRelativeChangeCodes(
      previous.states,
      normalized.states,
      (row) => row.stateCode,
      (row) => row.priceCentsPerKwh,
      MAX_MONTH_OVER_MONTH_CHANGE_PERCENT,
    );
    if (abnormalChanges.length > 0) {
      await quarantineCandidate(dataDirectory, 'eia-electricity', `Abnormal month-over-month price changes: ${abnormalChanges.join(', ')}`, normalized);
      throw new Error(`Abnormal month-over-month EIA price changes require review: ${abnormalChanges.join(', ')}`);
    }
  }

  if (decision === 'already-current') {
    if (previous && await syncPromotionPointer(dataDirectory, previous)) {
      console.log(`Repaired the promotion pointer for ${previous.snapshotId}.`);
    } else {
      console.log(`${normalized.snapshotId} is already current; no files changed.`);
    }
    return;
  }

  await promoteSnapshotFiles({
    dataDirectory,
    snapshot: normalized,
    normalizedFileName: 'electricity-retail-sales.normalized.json',
    rawRelativePath: path.join('raw', `${latestPeriod}.json`),
    rawContents: rawText,
  });

  console.log(`Published ${normalized.snapshotId} with ${normalized.states.length} state/DC rows.`);
}

const releaseLock = await acquireIngestionLock(dataDirectory);
try {
  await runIngestion();
} finally {
  await releaseLock();
}
