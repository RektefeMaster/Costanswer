import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  STORE_CATALOG,
  readStoreJson,
  readStoreJsonSync,
  type StoreObjectId,
} from '@/lib/data/store';

const ROOT = process.cwd();
const PROBE_TOKEN = 'costanswer-store-probe-9f3c2a';
const TIER_TWO_IMPORTS = [
  'bls-oews/wages.json',
  'cms-marketplace/premiums.json',
  'material-basket/',
  'bls-ecec/',
  'bls-ppi/',
  'fema-equipment/',
];

function walk(directory: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      out.push(...walk(path));
      continue;
    }
    if (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.mjs')) out.push(path);
  }
  return out;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('tier-2 data store', () => {
  it('reads the probe from disk without a static JSON import', async () => {
    const probe = await readStoreJson<{ probe: string; kind: string }>('store-probe');
    expect(probe).toEqual({ probe: PROBE_TOKEN, kind: 'tier-2-probe' });
    expect(readStoreJsonSync<{ probe: string }>('store-probe')?.probe).toBe(PROBE_TOKEN);
  });

  it('returns null or a JSON object for optional job datasets', async () => {
    for (const id of ['job-material-basket', 'bls-ecec', 'bls-ppi', 'fema-equipment'] as const) {
      const value = await readStoreJson(id);
      expect(value === null || (typeof value === 'object' && value !== null)).toBe(true);
    }
  });

  it('names every catalog object and keeps asset paths under /store/', () => {
    for (const [id, entry] of Object.entries(STORE_CATALOG) as Array<[StoreObjectId, (typeof STORE_CATALOG)[StoreObjectId]]>) {
      expect(id.length).toBeGreaterThan(0);
      expect(entry.assetPath.startsWith('/store/')).toBe(true);
      expect(entry.sourcePath.startsWith('data/')).toBe(true);
    }
  });

  it('keeps client islands from importing tier-2 snapshots or the store', () => {
    const clientFiles = [
      ...walk(join(ROOT, 'components')),
      ...walk(join(ROOT, 'app')),
    ].filter((file) => readFileSync(file, 'utf8').includes("'use client'"));
    const offenders: string[] = [];
    for (const file of clientFiles) {
      const source = stripComments(readFileSync(file, 'utf8'));
      if (source.includes('lib/data/store') || source.includes('@/lib/data/store')) {
        offenders.push(`${relative(ROOT, file)} imports the server store`);
      }
      for (const fragment of TIER_TWO_IMPORTS) {
        if (source.includes(fragment)) offenders.push(`${relative(ROOT, file)} mentions ${fragment}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /*
   * Source-scanning tests read every file under a directory, so their runtime
   * is the machine's disk rather than the assertion's difficulty. At the 5s
   * default they timed out inside `npm run verify` — where a build and a
   * browser suite are competing for the same disk — and passed in 1.5s when run
   * alone. A gate that fails when the machine is busy is a gate people learn to
   * re-run and then to ignore, so these two say what they are actually waiting
   * for.
   */
  it('keeps Job Cost modules from statically importing material or labor tables', { timeout: 30_000 }, () => {
    const jobDir = join(ROOT, 'lib', 'job');
    let files: string[] = [];
    try {
      files = walk(jobDir);
    } catch {
      return;
    }
    const offenders: string[] = [];
    for (const file of files) {
      const source = stripComments(readFileSync(file, 'utf8'));
      if (/from ['"][^'"]+\.json['"]/.test(source)) {
        offenders.push(`${relative(ROOT, file)} statically imports JSON`);
      }
      for (const fragment of TIER_TWO_IMPORTS) {
        if (source.includes(fragment) && !source.includes('lib/data/store')) {
          offenders.push(`${relative(ROOT, file)} reaches ${fragment} without the store`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
