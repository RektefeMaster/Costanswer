/**
 * Copy tier-2 snapshots from `data/` into `public/store/` so the Worker can
 * serve them as static assets instead of bundling them into JS.
 *
 * Source of truth stays under `data/`. This directory is generated.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { STORE_OBJECT_IDS, storeObject } from '../lib/data/store/catalog';
import { sha256 as hashUtf8 } from '../lib/data/sha256';

const root = process.cwd();
const publicStore = join(root, 'public', 'store');

mkdirSync(publicStore, { recursive: true });

const promoted: Array<{ id: string; assetPath: string; sha256: string; bytes: number }> = [];

for (const id of STORE_OBJECT_IDS) {
  const entry = storeObject(id);
  const source = join(root, entry.sourcePath);
  if (!existsSync(source)) {
    if (entry.optional) continue;
    throw new Error(`Required store object "${id}" is missing at ${entry.sourcePath}.`);
  }
  const target = join(root, 'public', entry.assetPath.replace(/^\//, ''));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  const bytes = readFileSync(source);
  promoted.push({
    id,
    assetPath: entry.assetPath,
    sha256: hashUtf8(new TextDecoder().decode(bytes)),
    bytes: bytes.length,
  });
}

writeFileSync(join(publicStore, 'manifest.json'), `${JSON.stringify({ promoted, generatedAt: new Date().toISOString() }, null, 2)}\n`);
console.log(`Promoted ${promoted.length} store objects to public/store.`);
