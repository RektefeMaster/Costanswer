import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import rawEiaFixture from '@/data/eia/raw/2026-06.json';
import normalizedEiaFixture from '@/data/eia/electricity-retail-sales.normalized.json';
import { eiaElectricitySnapshotSchema, normalizeEiaElectricityResponse } from '@/lib/data/eia-electricity';
import { searchTools } from '@/lib/search';
import { evaluateToolIndexability, isCategoryHubIndexable, tools } from '@/lib/tool-registry';
import { paginateSitemapEntries, SITEMAP_URL_LIMIT } from '@/lib/seo/sitemaps';

describe('EIA adapter contract', () => {
  it('normalizes the recorded official response into 51 state/DC rows', () => {
    const snapshot = normalizeEiaElectricityResponse(rawEiaFixture, {
      fetchedAt: '2026-09-01T00:00:00.000Z',
      rawSha256: 'a'.repeat(64),
    });
    expect(snapshot.observationPeriod).toBe('2026-06');
    expect(snapshot.states).toHaveLength(51);
    expect(snapshot.states.find((row) => row.stateCode === 'TX')?.priceCentsPerKwh).toBe(15.94);
  });

  it('fails closed when an expected unit changes', () => {
    const changed = structuredClone(rawEiaFixture);
    changed.response.data[0]['price-units'] = 'dollars per kilowatt-hour';
    expect(() => normalizeEiaElectricityResponse(changed, {
      fetchedAt: '2026-09-01T00:00:00.000Z', rawSha256: 'b'.repeat(64),
    })).toThrow();
  });

  it('verifies the promoted snapshot schema and both hashes', () => {
    const parsed = eiaElectricitySnapshotSchema.parse(normalizedEiaFixture);
    const rawText = readFileSync(new URL('../data/eia/raw/2026-06.json', import.meta.url), 'utf8');
    expect(createHash('sha256').update(rawText).digest('hex')).toBe(parsed.rawSha256);
    const candidate = { ...parsed } as Partial<typeof parsed>;
    delete candidate.normalizedSha256;
    expect(createHash('sha256').update(JSON.stringify(candidate)).digest('hex')).toBe(parsed.normalizedSha256);
  });

  it('rejects duplicate or mislabeled geography in a promoted snapshot', () => {
    const duplicate = structuredClone(normalizedEiaFixture);
    duplicate.states[1] = structuredClone(duplicate.states[0]);
    expect(() => eiaElectricitySnapshotSchema.parse(duplicate)).toThrow();

    const mislabeled = structuredClone(normalizedEiaFixture);
    mislabeled.states[0].stateName = 'Not the official state name';
    expect(() => eiaElectricitySnapshotSchema.parse(mislabeled)).toThrow();
  });
});

describe('registry and intent search', () => {
  it('keeps every launch tool above the indexability threshold and on a unique route', () => {
    expect(tools.every((tool) => evaluateToolIndexability(tool).indexable)).toBe(true);
    expect(new Set(tools.map((tool) => tool.id)).size).toBe(tools.length);
    expect(new Set(tools.map((tool) => tool.path)).size).toBe(tools.length);
  });

  it('fails closed for invalid scores, stale reviews, and dangling link evidence', () => {
    const invalid = structuredClone(tools[0]);
    invalid.indexability.scores.answerDepth = 100;
    invalid.indexability.reviewedAt = '2020-01-01';
    invalid.relationships = [
      { toolId: 'missing-a', type: 'sibling' },
      { toolId: 'missing-b', type: 'sibling' },
    ];
    const evaluation = evaluateToolIndexability(invalid);
    expect(evaluation.indexable).toBe(false);
    expect(evaluation.reasons.join(' ')).toContain('answerDepth');
    expect(evaluation.reasons.join(' ')).toContain('400 days');
    expect(evaluation.reasons.join(' ')).toContain('valid, distinct');
  });

  it('only indexes topic hubs with enough independently useful tools', () => {
    expect(isCategoryHubIndexable('home')).toBe(true);
    expect(isCategoryHubIndexable('money')).toBe(false);
  });

  it('matches natural-language intent rather than requiring exact titles', () => {
    expect(searchTools('how much concrete do I need')[0].tool.id).toBe('concrete');
    expect(searchTools('which package is cheaper')[0].tool.id).toBe('unit-price');
  });
});

describe('sitemap scale contract', () => {
  it('splits more than 100,000 records without exceeding the protocol limit', () => {
    const records = Array.from({ length: 100_001 }, (_, index) => index);
    const pages = paginateSitemapEntries(records);
    expect(pages.map((page) => page.length)).toEqual([SITEMAP_URL_LIMIT, SITEMAP_URL_LIMIT, 1]);
  });
});
