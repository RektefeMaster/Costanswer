import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('bundle budget gate', () => {
  const source = readFileSync('scripts/check-bundle-budget.mjs', 'utf8');

  it('measures client chunks as gzip at the 150 KiB policy, not 200 KiB raw', () => {
    expect(source).toMatch(/clientChunkGzipBytes:\s*150 \* 1024/);
    expect(source).toMatch(/gzipSync\(readFileSync\(file\)\)/);
    expect(source).not.toMatch(/clientChunkBytes:\s*200 \* 1024/);
  });

  it('keeps the Worker budget in gzip', () => {
    expect(source).toMatch(/workerGzipBytes:\s*2\.8 \* 1024 \* 1024/);
  });
});
