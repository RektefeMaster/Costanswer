import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STORE_CATALOG, type StoreObjectId, storeObject } from './catalog';

const memory = new Map<StoreObjectId, unknown>();

/**
 * Tier-2 snapshots are server-only. A client island that needs a figure asks
 * a route, the same way marketplace premiums already do.
 */
export function assertServerStore(): void {
  if (typeof window !== 'undefined') {
    throw new Error('lib/data/store is for the server. A client island must ask a route, not import a tier-2 snapshot.');
  }
}

function firstExistingFile(entry: ReturnType<typeof storeObject>): string | null {
  const roots = [...new Set([
    process.cwd(),
    process.env.PWD,
    process.env.INIT_CWD,
  ].filter((value): value is string => Boolean(value)))];
  const relative = [
    entry.sourcePath,
    join('public', entry.assetPath.replace(/^\//, '')),
    join('dist', 'client', entry.assetPath.replace(/^\//, '')),
  ];
  for (const root of roots) {
    for (const rel of relative) {
      const path = join(root, rel.replace(/^\//, ''));
      if (existsSync(path)) return path;
    }
  }
  return null;
}

function parseJson<T>(raw: string, id: StoreObjectId): T {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`Store object "${id}" is not JSON: ${error instanceof Error ? error.message : 'parse failed'}`);
  }
}

/**
 * Read a tier-2 snapshot without bundling it into Worker or client JS.
 *
 * Node (tests, scripts, local SSR with a disk) reads `sourcePath`. The
 * Cloudflare Worker reads the promoted asset via the ASSETS binding. Missing
 * optional objects return `null` so Job Cost can ship an incomplete estimate
 * rather than invent a table.
 */
export async function readStoreJson<T>(id: StoreObjectId, origin?: string): Promise<T | null> {
  assertServerStore();
  if (memory.has(id)) return memory.get(id) as T;

  const entry = storeObject(id);
  const fromAssets = await readFromWorkerAssets(entry.assetPath, origin);
  if (fromAssets !== null) {
    const parsed = parseJson<T>(fromAssets, id);
    memory.set(id, parsed);
    return parsed;
  }

  const path = firstExistingFile(entry);
  if (path === null) {
    if (entry.optional) return null;
    throw new Error(`Store object "${id}" is missing at ${entry.sourcePath} and ${entry.assetPath}.`);
  }

  const parsed = parseJson<T>(readFileSync(path, 'utf8'), id);
  memory.set(id, parsed);
  return parsed;
}

export function readStoreJsonSync<T>(id: StoreObjectId): T | null {
  assertServerStore();
  if (memory.has(id)) return memory.get(id) as T;
  const entry = storeObject(id);
  const path = firstExistingFile(entry);
  if (path === null) {
    if (entry.optional) return null;
    throw new Error(`Store object "${id}" is missing at ${entry.sourcePath} and ${entry.assetPath}.`);
  }
  const parsed = parseJson<T>(readFileSync(path, 'utf8'), id);
  memory.set(id, parsed);
  return parsed;
}

async function readFromWorkerAssets(assetPath: string, origin?: string): Promise<string | null> {
  // Worker-only binding. A static import would break Node tests; absence
  // means we are on disk and the caller falls through to sourcePath.
  const bases = [...new Set([
    origin,
    'https://assets.local',
    'http://localhost',
    'http://127.0.0.1:3000',
  ].filter((value): value is string => Boolean(value)))];

  try {
    const { env } = await import('cloudflare:workers');
    const assets = (env as { ASSETS?: { fetch: (input: Request) => Promise<Response> } }).ASSETS;
    if (assets) {
      for (const base of bases) {
        const text = await readJsonResponse(assets.fetch(new Request(new URL(assetPath, base))));
        if (text) return text;
      }
    }
  } catch {
    // Node tests, or a Worker without ASSETS. Fall through to disk.
  }
  return null;
}

async function readJsonResponse(pending: Promise<Response>): Promise<string | null> {
  try {
    const response = await pending;
    if (!response.ok) return null;
    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
    return text;
  } catch {
    return null;
  }
}

export function clearStoreCache(): void {
  memory.clear();
}

export function storeCatalogSize(): number {
  return Object.keys(STORE_CATALOG).length;
}
