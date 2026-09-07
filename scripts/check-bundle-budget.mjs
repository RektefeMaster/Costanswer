/**
 * Bundle budgets, enforced.
 *
 * A 3.8 MB chunk of county premium columns shipped to every visitor who opened
 * either ACA calculator, and nothing noticed because nothing measured. This is
 * the check that would have caught it on the first pull request.
 *
 * The budgets are deliberately close to today's numbers rather than generous.
 * A budget with room in it is a budget that gets used, and the whole point is
 * that the next dataset someone imports into a client island fails here rather
 * than on a phone.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

/*
 * These are our budgets, not the platform's ceiling.
 *
 * Cloudflare's own Worker size limit is far above this, so nothing here is
 * about staying deployable. It is about startup time, deploy time and the
 * discipline that keeps a dataset from drifting into the bundle: a budget set
 * at the platform limit is a budget that never fires, and the failure it would
 * have caught arrives on somebody's phone instead.
 */
const BUDGETS = {
  /** Any single chunk a browser downloads. */
  clientChunkBytes: 200 * 1024,
  /** Everything the Worker holds, gzipped. Ours, for cold-start and deploy time. */
  workerGzipBytes: 2.8 * 1024 * 1024,
};

/**
 * Chunks allowed past the per-chunk budget, each with a reason.
 *
 * A dataset never belongs here. Framework code does, because it is downloaded
 * once and cached across every page.
 */
const ALLOWED = [
  { pattern: /^framework-/, reason: 'React and the runtime, cached across the whole site.' },
];

function walk(directory) {
  const out = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (entry.endsWith('.js')) out.push(path);
  }
  return out;
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

const clientFiles = walk('dist/client/_next');
if (clientFiles.length === 0) {
  fail('No client bundle found. Run `npm run build` first.');
  process.exit(1);
}

let worstChunk = 0;
for (const file of clientFiles) {
  const size = statSync(file).size;
  const name = file.split('/').pop();
  worstChunk = Math.max(worstChunk, size);
  if (size <= BUDGETS.clientChunkBytes) continue;
  if (ALLOWED.some((entry) => entry.pattern.test(name))) continue;
  fail(
    `${name} is ${(size / 1024).toFixed(0)} KB, over the ${(BUDGETS.clientChunkBytes / 1024).toFixed(0)} KB per-chunk budget. `
    + 'If this is a dataset, it belongs on the server: give the page a route to ask, not a copy to carry.',
  );
}

const workerFiles = walk('dist/server').filter((file) => !file.includes('/ssr/'));
const workerGzip = gzipSync(Buffer.concat(workerFiles.map((file) => readFileSync(file)))).length;
if (workerGzip > BUDGETS.workerGzipBytes) {
  fail(
    `The Worker is ${(workerGzip / 1024 / 1024).toFixed(2)} MB gzipped, over the `
    + `${(BUDGETS.workerGzipBytes / 1024 / 1024).toFixed(2)} MB budget. That budget is ours: it protects `
    + 'cold-start and deploy time, and it is what stops a dataset drifting into the bundle.',
  );
}

console.log(
  `Largest client chunk ${(worstChunk / 1024).toFixed(0)} KB `
  + `(budget ${(BUDGETS.clientChunkBytes / 1024).toFixed(0)} KB) · `
  + `Worker ${(workerGzip / 1024 / 1024).toFixed(2)} MB gzipped `
  + `(budget ${(BUDGETS.workerGzipBytes / 1024 / 1024).toFixed(2)} MB)`,
);
