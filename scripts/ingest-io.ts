import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function manifestTextFor(snapshot: { snapshotId: string; observationPeriod: string; normalizedSha256: string }): string {
  return `${JSON.stringify({
    currentSnapshotId: snapshot.snapshotId,
    observationPeriod: snapshot.observationPeriod,
    normalizedSha256: snapshot.normalizedSha256,
    validationStatus: 'passed',
  }, null, 2)}\n`;
}

export function currentEnvelopeTextFor(snapshot: { snapshotId: string; observationPeriod: string; normalizedSha256: string }): string {
  return `${JSON.stringify({ manifest: JSON.parse(manifestTextFor(snapshot)), snapshot }, null, 2)}\n`;
}

export function jsonDocumentsEqual(left: string, right: string): boolean {
  try {
    return JSON.stringify(JSON.parse(left)) === JSON.stringify(JSON.parse(right));
  } catch {
    return false;
  }
}

export function sealNormalizedSnapshot<T extends object>(candidate: T): T & { normalizedSha256: string } {
  return {
    ...candidate,
    normalizedSha256: sha256(JSON.stringify(candidate)),
  };
}

export type RefreshDecision = 'promote' | 'already-current';

export function evaluateRefreshDecision(input: {
  previous?: { observationPeriod: string; revisionId?: string };
  nextPeriod: string;
  payloadUnchanged: boolean;
  officialRevision?: { revisionId: string; publishedAt: string };
}): RefreshDecision {
  if (!input.previous) return 'promote';
  const periodChange = compareObservationPeriod(input.nextPeriod, input.previous.observationPeriod);
  if (periodChange === 'older') {
    throw new Error(`Latest period regressed from ${input.previous.observationPeriod} to ${input.nextPeriod}.`);
  }
  if (periodChange === 'same') {
    if (input.payloadUnchanged) return 'already-current';
    const previousRevision = input.previous.revisionId;
    const nextRevision = input.officialRevision?.revisionId;
    if (nextRevision && nextRevision !== previousRevision) {
      return 'promote';
    }
    throw new Error('Values in the latest published period changed. Review the official revision before replacing the snapshot.');
  }
  return 'promote';
}

export async function atomicWrite(targetPath: string, contents: string): Promise<void> {
  const candidatePath = `${targetPath}.candidate-${process.pid}-${Date.now()}`;
  let promoted = false;
  try {
    const handle = await open(candidatePath, 'wx');
    try {
      await handle.writeFile(contents, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(candidatePath, targetPath);
    promoted = true;
  } finally {
    if (!promoted) await unlink(candidatePath).catch(() => undefined);
  }
}

export async function writeImmutable(targetPath: string, contents: string): Promise<void> {
  try {
    const handle = await open(targetPath, 'wx');
    try {
      await handle.writeFile(contents, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const existing = await readFile(targetPath, 'utf8');
    if (existing !== contents) throw new Error(`Refusing to overwrite immutable artifact ${path.basename(targetPath)}.`);
  }
}

export async function readJsonIfPresent<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export function compareObservationPeriod(next: string, previous: string): 'older' | 'same' | 'newer' {
  if (next < previous) return 'older';
  if (next > previous) return 'newer';
  return 'same';
}

export async function fetchWithRetry(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 20_000, headers, ...rest } = init;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...rest,
        headers: {
          'user-agent': 'CostAnswer ingest/1.0',
          ...headers,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return response;
      if (![408, 425, 429].includes(response.status) && response.status < 500) {
        throw Object.assign(new Error(`Request failed with non-retryable HTTP ${response.status}`), { retryable: false });
      }
      if (attempt === 3) throw new Error(`Request failed with HTTP ${response.status} after ${attempt} attempts`);
    } catch (error) {
      if ((error as { retryable?: boolean }).retryable === false) throw error;
      if (attempt === 3) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
  throw new Error('Request failed unexpectedly.');
}

export async function fetchText(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<string> {
  return (await fetchWithRetry(url, init)).text();
}

export async function fetchJson(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<unknown> {
  return (await fetchWithRetry(url, {
    ...init,
    headers: { accept: 'application/json', ...init?.headers },
  })).json();
}

export async function quarantineCandidate(dataDirectory: string, prefix: string, reason: string, payload: unknown): Promise<void> {
  const quarantineDirectory = path.join(dataDirectory, 'quarantine');
  await mkdir(quarantineDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const target = path.join(quarantineDirectory, `${prefix}-${timestamp}.json`);
  await atomicWrite(target, `${JSON.stringify({ quarantinedAt: new Date().toISOString(), reason, payload }, null, 2)}\n`);
}

export function abnormalRelativeChangeCodes<T>(
  previous: T[],
  next: T[],
  key: (row: T) => string,
  value: (row: T) => number,
  maxPercent: number,
): string[] {
  const previousByKey = new Map(previous.map((row) => [key(row), value(row)]));
  return next.filter((row) => {
    const oldValue = previousByKey.get(key(row));
    if (oldValue === undefined || oldValue === 0) return true;
    return Math.abs((value(row) - oldValue) / oldValue) * 100 > maxPercent;
  }).map(key);
}

export async function promoteSnapshotFiles(input: {
  dataDirectory: string;
  snapshot: { snapshotId: string; observationPeriod: string; normalizedSha256: string };
  normalizedFileName: string;
  rawRelativePath: string;
  rawContents: string;
}): Promise<void> {
  await mkdir(path.join(input.dataDirectory, 'raw'), { recursive: true });
  await mkdir(path.join(input.dataDirectory, 'snapshots'), { recursive: true });
  const normalizedText = `${JSON.stringify(input.snapshot, null, 2)}\n`;
  await writeImmutable(path.join(input.dataDirectory, input.rawRelativePath), input.rawContents);
  await writeImmutable(path.join(input.dataDirectory, 'snapshots', `${input.snapshot.snapshotId}.json`), normalizedText);
  await atomicWrite(path.join(input.dataDirectory, input.normalizedFileName), normalizedText);
  await atomicWrite(path.join(input.dataDirectory, 'manifest.json'), manifestTextFor(input.snapshot));
  await atomicWrite(path.join(input.dataDirectory, 'current.json'), currentEnvelopeTextFor(input.snapshot));
}

export async function syncPromotionPointer(
  dataDirectory: string,
  snapshot: { snapshotId: string; observationPeriod: string; normalizedSha256: string },
): Promise<boolean> {
  const currentPath = path.join(dataDirectory, 'current.json');
  const manifestPath = path.join(dataDirectory, 'manifest.json');
  const expectedManifest = manifestTextFor(snapshot);
  const expectedCurrent = currentEnvelopeTextFor(snapshot);
  const existingManifest = await readFile(manifestPath, 'utf8').catch(() => '');
  const existingCurrent = await readFile(currentPath, 'utf8').catch(() => '');
  let repaired = false;
  if (!jsonDocumentsEqual(existingManifest, expectedManifest)) {
    await atomicWrite(manifestPath, expectedManifest);
    repaired = true;
  }
  if (!jsonDocumentsEqual(existingCurrent, expectedCurrent)) {
    await atomicWrite(currentPath, expectedCurrent);
    repaired = true;
  }
  return repaired;
}

export async function acquireIngestionLock(dataDirectory: string): Promise<() => Promise<void>> {
  await mkdir(dataDirectory, { recursive: true });
  const lockPath = path.join(dataDirectory, '.ingest.lock');
  let handle;
  try {
    handle = await open(lockPath, 'wx');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`Ingest is already locked at ${lockPath}. Inspect the lock before removing it.`);
    }
    throw error;
  }
  await handle.writeFile(`${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`, 'utf8');
  await handle.sync();
  return async () => {
    await handle.close();
    await unlink(lockPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  };
}
