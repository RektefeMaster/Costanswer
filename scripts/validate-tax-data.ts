import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateTaxYearSnapshot } from '../lib/data/verify';

const snapshot = validateTaxYearSnapshot(JSON.parse(await readFile(path.join(process.cwd(), 'data', 'tax', '2026.json'), 'utf8')) as unknown);
if (snapshot.taxYear !== 2026) throw new Error('Expected the published tax snapshot to be tax year 2026.');
if (snapshot.states.filter((row) => row.status === 'unsupported').length === 0) {
  throw new Error('Expected unsupported states to remain explicit in the tax snapshot.');
}
console.log(`Tax snapshot ${snapshot.snapshotId} passed validation.`);
