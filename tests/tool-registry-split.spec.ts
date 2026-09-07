import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { importAlias, renderIndex } from '@/scripts/generate-tool-index';
import { registryTools } from '@/lib/tools/registry';
import { tools } from '@/lib/tool-registry';

const REGISTRY_DIR = path.join(process.cwd(), 'lib', 'tools', 'registry');

function fragmentFiles(): string[] {
  return readdirSync(REGISTRY_DIR).filter((file) => file.endsWith('.ts') && file !== 'index.ts');
}

describe('registry fragments', () => {
  it('gives every tool its own file, named for its id', () => {
    const files = new Set(fragmentFiles().map((file) => file.slice(0, -3)));
    const ids = new Set(registryTools.map((tool) => tool.id));
    expect([...ids].filter((id) => !files.has(id)), 'tools with no fragment file').toEqual([]);
    expect([...files].filter((file) => !ids.has(file)), 'fragment files in no index').toEqual([]);
  });

  it('exports the same catalogue through the public entry point', () => {
    // The seventy-odd consumers import `tools`, not the fragments. If the two
    // ever drift, every one of them is reading something different from what
    // the directory says ships.
    expect(tools).toEqual(registryTools);
  });

  /*
   * The index is generated, so it can go stale the moment someone adds a
   * fragment and forgets to run the generator. That failure is silent — the new
   * tool simply does not exist — so the check is here rather than left to
   * whoever notices the missing page.
   */
  it('keeps the generated index in step with the files on disk', () => {
    const current = readFileSync(path.join(REGISTRY_DIR, 'index.ts'), 'utf8');
    const listed = [...current.matchAll(/from '\.\/([^']+)'/g)].map((match) => match[1]);
    expect(renderIndex(listed), 'run `npm run tools:index`').toBe(current);

    const onDisk = new Set(fragmentFiles().map((file) => file.slice(0, -3)));
    expect([...onDisk].filter((id) => !listed.includes(id)), 'fragments missing from the index').toEqual([]);
  });

  it('turns an id that starts with a digit into a usable identifier', () => {
    expect(importAlias('hourly-to-salary')).toBe('hourlyToSalary');
    expect(importAlias('401k')).toBe('tool401k');
    expect(importAlias('cd')).toBe('cd');
  });

  it('declares each tool once, so nothing is registered twice', () => {
    const ids = registryTools.map((tool) => tool.id);
    expect(new Set(ids).size).toBe(ids.length);
    const paths = registryTools.map((tool) => tool.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
