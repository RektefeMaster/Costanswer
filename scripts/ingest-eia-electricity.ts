import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeEiaElectricityResponse, eiaElectricitySnapshotSchema } from '../lib/data/eia-electricity';

const apiKey = process.env.EIA_API_KEY;
if (!apiKey) {
  throw new Error('EIA_API_KEY is required. Request a free key from https://www.eia.gov/opendata/register.php');
}

const root = process.cwd();
const dataDirectory = path.join(root, 'data', 'eia');
const MAX_MONTH_OVER_MONTH_CHANGE_PERCENT = 40;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function manifestTextFor(snapshot: { snapshotId: string; observationPeriod: string; normalizedSha256: string }): string {
  return `${JSON.stringify({
    currentSnapshotId: snapshot.snapshotId,
    observationPeriod: snapshot.observationPeriod,
    normalizedSha256: snapshot.normalizedSha256,
    validationStatus: 'passed',
  }, null, 2)}\n`;
}

async function atomicWrite(targetPath: string, contents: string): Promise<void> {
  const candidatePath = `${targetPath}.candidate-${process.pid}`;
  await writeFile(candidatePath, contents, 'utf8');
  await rename(candidatePath, targetPath);
}

async function quarantineCandidate(reason: string, payload: unknown): Promise<void> {
  const quarantineDirectory = path.join(dataDirectory, 'quarantine');
  await mkdir(quarantineDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const target = path.join(quarantineDirectory, `eia-electricity-${timestamp}.json`);
  await atomicWrite(target, `${JSON.stringify({ quarantinedAt: new Date().toISOString(), reason, payload }, null, 2)}\n`);
}

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

function buildUrl(options: { start?: string; length: number }): URL {
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
  return url;
}

async function fetchJson(url: URL): Promise<unknown> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
      if (response.ok) return response.json();
      if (response.status !== 429 && response.status < 500) throw new Error(`EIA request failed with HTTP ${response.status}`);
      if (attempt === 3) throw new Error(`EIA request failed with HTTP ${response.status} after ${attempt} attempts`);
    } catch (error) {
      if (attempt === 3) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
  throw new Error('EIA request failed unexpectedly.');
}

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
  await quarantineCandidate(error instanceof Error ? error.message : 'Unknown normalization failure', raw);
  throw error;
}
const candidateText = JSON.stringify(candidate);
const normalized = {
  ...candidate,
  normalizedSha256: sha256(candidateText),
};
eiaElectricitySnapshotSchema.parse(normalized);
let alreadyCurrent = false;

try {
  const previousText = await readFile(path.join(dataDirectory, 'electricity-retail-sales.normalized.json'), 'utf8');
  const previous = eiaElectricitySnapshotSchema.parse(JSON.parse(previousText));
  if (normalized.observationPeriod < previous.observationPeriod) {
    await quarantineCandidate(`Latest period regressed from ${previous.observationPeriod} to ${normalized.observationPeriod}.`, normalized);
    throw new Error(`Latest period regressed from ${previous.observationPeriod} to ${normalized.observationPeriod}.`);
  }
  if (
    normalized.observationPeriod === previous.observationPeriod
    && JSON.stringify(normalized.states) !== JSON.stringify(previous.states)
  ) {
    await quarantineCandidate('Values in the latest published period changed.', normalized);
    throw new Error('Values in the latest published period changed. Review the official revision before replacing the snapshot.');
  }
  if (
    normalized.observationPeriod === previous.observationPeriod
    && JSON.stringify(normalized.states) === JSON.stringify(previous.states)
  ) {
    let manifestMatchesPrevious = false;
    try {
      const manifest = JSON.parse(await readFile(path.join(dataDirectory, 'manifest.json'), 'utf8')) as Record<string, unknown>;
      manifestMatchesPrevious = manifest.currentSnapshotId === previous.snapshotId
        && manifest.observationPeriod === previous.observationPeriod
        && manifest.normalizedSha256 === previous.normalizedSha256
        && manifest.validationStatus === 'passed';
    } catch {
      manifestMatchesPrevious = false;
    }
    if (!manifestMatchesPrevious) {
      const versionedText = await readFile(path.join(dataDirectory, 'snapshots', `${previous.snapshotId}.json`), 'utf8');
      const versioned = eiaElectricitySnapshotSchema.parse(JSON.parse(versionedText));
      if (versioned.normalizedSha256 !== previous.normalizedSha256) {
        throw new Error('Cannot repair the EIA promotion pointer because the versioned snapshot does not match the current snapshot.');
      }
      await atomicWrite(path.join(dataDirectory, 'manifest.json'), manifestTextFor(previous));
      console.log(`Repaired the promotion pointer for ${previous.snapshotId}.`);
    }
    alreadyCurrent = true;
  }
  if (normalized.observationPeriod > previous.observationPeriod) {
    const previousByState = new Map(previous.states.map((row) => [row.stateCode, row.priceCentsPerKwh]));
    const abnormalChanges = normalized.states.filter((row) => {
      const oldPrice = previousByState.get(row.stateCode);
      if (!oldPrice) return true;
      return Math.abs((row.priceCentsPerKwh - oldPrice) / oldPrice) * 100 > MAX_MONTH_OVER_MONTH_CHANGE_PERCENT;
    });
    if (abnormalChanges.length > 0) {
      await quarantineCandidate(`Abnormal month-over-month price changes: ${abnormalChanges.map((row) => row.stateCode).join(', ')}`, normalized);
      throw new Error(`Abnormal month-over-month EIA price changes require review: ${abnormalChanges.map((row) => row.stateCode).join(', ')}`);
    }
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

if (alreadyCurrent) {
  console.log(`${normalized.snapshotId} is already current; no files changed.`);
  process.exit(0);
}

await mkdir(path.join(dataDirectory, 'raw'), { recursive: true });
await mkdir(path.join(dataDirectory, 'snapshots'), { recursive: true });
const normalizedText = `${JSON.stringify(normalized, null, 2)}\n`;
const manifestText = manifestTextFor(normalized);

await atomicWrite(path.join(dataDirectory, 'raw', `${latestPeriod}.json`), rawText);
await atomicWrite(path.join(dataDirectory, 'snapshots', `${normalized.snapshotId}.json`), normalizedText);
await atomicWrite(path.join(dataDirectory, 'electricity-retail-sales.normalized.json'), normalizedText);
// The manifest is the promotion pointer and is intentionally replaced last.
await atomicWrite(path.join(dataDirectory, 'manifest.json'), manifestText);

console.log(`Published ${normalized.snapshotId} with ${normalized.states.length} state/DC rows.`);
