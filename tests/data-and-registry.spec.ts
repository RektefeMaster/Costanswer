import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import rawEiaFixture from '@/data/eia/raw/2026-06.json';
import normalizedEiaFixture from '@/data/eia/electricity-retail-sales.normalized.json';
import currentEiaFixture from '@/data/eia/current.json';
import currentGasolineFixture from '@/data/eia-gasoline/current.json';
import currentGroceryFixture from '@/data/bls/current.json';
import rawGroceryFixture from '@/data/bls/raw/bls-apu-grocery-2026-07-v2.json';
import { eiaElectricitySnapshotSchema, normalizeEiaElectricityResponse } from '@/lib/data/eia-electricity';
import { eiaGasolineSnapshotSchema, normalizeEiaGasolineHtml } from '@/lib/data/eia-gasoline';
import { blsGrocerySnapshotSchema, grocerySeriesIdBatches, GROCERY_ITEM_IDS, normalizeBlsGroceryResponse } from '@/lib/data/bls-grocery';
import { normalizeFreddieMacPmmsHtml } from '@/lib/data/freddie-mac-pmms';
import currentMortgageRateFixture from '@/data/freddie-mac/current.json';
import { mergeCpiObservations, nextMonthPeriod, observationsFromBlsTimeSeries } from '@/lib/data/bls-cpi';
import currentCpiFixture from '@/data/bls-cpi/current.json';
import {
  validateCpiEnvelope,
  validateElectricityEnvelope,
  validateGasolineEnvelope,
  validateGroceryEnvelope,
  validateMortgageRateEnvelope,
  verifyBundledSnapshots,
} from '@/lib/data/verify';
import { sha256 } from '@/lib/data/sha256';
import { PUBLISHING_SNAPSHOT_INSTANT } from '@/lib/publishing';
import { searchTools } from '@/lib/search';
import {
  evaluateToolIndexability,
  getRelatedTools,
  getTool,
  isCategoryHubIndexable,
  RELATED_TOOL_LIMIT,
  RELATED_TOOL_MINIMUM,
  tools,
} from '@/lib/tool-registry';
import { clustersForTool } from '@/lib/clusters';
import { getSitemapFamilies, paginateSitemapEntries, sitemapPageLastModified, SITEMAP_URL_LIMIT } from '@/lib/seo/sitemaps';
import { faqPageJsonLd, toolMetadata } from '@/lib/seo';
import { SITE_FAQ } from '@/lib/site-faq';
import { getToolEditorial, listToolEditorial } from '@/lib/tool-content';
import { affiliateUrl, isAffiliateEligible, offersForTool } from '@/lib/affiliates';

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

  it('recomputes the bundled hash and then enforces semantic invariants', () => {
    const staleHash = structuredClone(currentEiaFixture);
    staleHash.snapshot.states[0].priceCentsPerKwh = 99;
    expect(() => validateElectricityEnvelope(staleHash)).toThrow(/SHA-256/);

    const recomputedHash = structuredClone(staleHash);
    const hashable = { ...recomputedHash.snapshot } as Partial<typeof recomputedHash.snapshot>;
    delete hashable.normalizedSha256;
    const replacementHash = sha256(JSON.stringify(hashable));
    recomputedHash.snapshot.normalizedSha256 = replacementHash;
    recomputedHash.manifest.normalizedSha256 = replacementHash;
    expect(() => validateElectricityEnvelope(recomputedHash)).toThrow(/invariant/i);
  });

  it('binds snapshot identity and source URL to the observation period', () => {
    const badId = structuredClone(normalizedEiaFixture);
    badId.snapshotId = 'unrelated-snapshot';
    expect(() => eiaElectricitySnapshotSchema.parse(badId)).toThrow(/Snapshot ID/);
    const badUrl = structuredClone(normalizedEiaFixture);
    badUrl.sourceUrl = badUrl.sourceUrl.replace('period=2026-06', 'period=2026-05');
    expect(() => eiaElectricitySnapshotSchema.parse(badUrl)).toThrow(/period/);
  });

  it('matches the standard SHA-256 test vector in the runtime-neutral implementation', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('gasoline and grocery adapters', () => {
  it('parses the recorded EIA weekly gasoline table into required geographies', () => {
    const html = readFileSync(new URL('../data/eia-gasoline/raw/2026-08-31.html', import.meta.url), 'utf8');
    const snapshot = normalizeEiaGasolineHtml(html, { fetchedAt: '2026-09-02T00:00:00.000Z', rawSha256: 'a'.repeat(64) });
    expect(snapshot.observationPeriod).toBe('2026-08-31');
    expect(snapshot.geographies).toHaveLength(19);
    expect(snapshot.geographies.find((row) => row.code === 'STX')?.dollarsPerGallon).toBe(3.577);
    expect(snapshot.geographies.find((row) => row.code === 'SCA')?.dollarsPerGallon).toBe(5.52);
  });

  it('rejects a gasoline table that drops a required PADD series', () => {
    const html = readFileSync(new URL('../data/eia-gasoline/raw/2026-08-31.html', import.meta.url), 'utf8');
    expect(() => normalizeEiaGasolineHtml(html.replaceAll('EMM_EPMR_PTE_R30_DPG', 'EMM_EPMR_PTE_YTEST_DPG'), {
      fetchedAt: '2026-09-02T00:00:00.000Z', rawSha256: 'b'.repeat(64),
    })).toThrow(/R30/);
  });

  it('verifies the promoted gasoline envelope hash', () => {
    const parsed = eiaGasolineSnapshotSchema.parse(currentGasolineFixture.snapshot);
    const html = readFileSync(new URL('../data/eia-gasoline/raw/2026-08-31.html', import.meta.url), 'utf8');
    expect(createHash('sha256').update(html).digest('hex')).toBe(parsed.rawSha256);
    expect(() => validateGasolineEnvelope(currentGasolineFixture)).not.toThrow();
  });

  it('batches BLS grocery series under the unregistered public-API limit', () => {
    const batches = grocerySeriesIdBatches();
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.every((batch) => batch.length <= 25)).toBe(true);
    expect(batches.flat()).toHaveLength(batches.reduce((total, batch) => total + batch.length, 0));
  });

  it('normalizes BLS grocery staples and keeps incomplete regions off the ranking set', () => {
    const snapshot = normalizeBlsGroceryResponse(rawGroceryFixture, {
      fetchedAt: '2026-09-02T00:00:00.000Z', rawSha256: 'c'.repeat(64),
    });
    expect(snapshot.observationPeriod).toBe('2026-07');
    expect(snapshot.items).toHaveLength(GROCERY_ITEM_IDS.length);
    expect(snapshot.items.find((item) => item.id === 'milk-whole-gallon')?.regions).toBeUndefined();
    expect(snapshot.items.find((item) => item.id === 'ground-beef-lb')?.regions?.South?.dollars).toBe(6.449);
    expect(snapshot.items.find((item) => item.id === 'bacon-sliced-lb')?.regions?.South?.dollars).toBe(6.183);
    expect(snapshot.items.find((item) => item.id === 'coffee-ground-lb')?.regions).toBeUndefined();
    expect(() => validateGroceryEnvelope(currentGroceryFixture)).not.toThrow();
    expect(() => blsGrocerySnapshotSchema.parse(currentGroceryFixture.snapshot)).not.toThrow();
  });

  it('reads 15-year and 30-year PMMS rates from FinancialProduct JSON-LD', () => {
    const html = `
      <script type="application/ld+json">{"@type":"FinancialProduct","category":"Mortgage","name":"30 - Year","description":"Average rates as of August 27, 2026","interestRate":"6.66"}</script>
      <script type="application/ld+json">{"@type":"FinancialProduct","category":"Mortgage","name":"15 - Year","description":"Average rates as of August 27, 2026","interestRate":"5.98"}</script>
    `;
    const snapshot = normalizeFreddieMacPmmsHtml(html, { fetchedAt: '2026-09-03T00:00:00.000Z', rawSha256: 'a'.repeat(64) });
    expect(snapshot.observationPeriod).toBe('2026-08-27');
    expect(snapshot.thirtyYearFixedPercent).toBe(6.66);
    expect(snapshot.fifteenYearFixedPercent).toBe(5.98);
    expect(() => validateMortgageRateEnvelope(currentMortgageRateFixture)).not.toThrow();
  });

  it('reads PMMS JSON-LD when the date is lowercase and products share one script', () => {
    const html = `<script type="application/ld+json">[{"@type":"FinancialProduct","category":"Mortgage","name":"30-Year","description":"Average rates as of august 27, 2026","interestRate":6.66},{"@type":"FinancialProduct","category":"Mortgage","name":"15-Year","description":"Average rates as of AUGUST 27, 2026","interestRate":5.98}]</script>`;
    const snapshot = normalizeFreddieMacPmmsHtml(html, { fetchedAt: '2026-09-03T00:00:00.000Z', rawSha256: 'a'.repeat(64) });
    expect(snapshot.observationPeriod).toBe('2026-08-27');
    expect(snapshot.thirtyYearFixedPercent).toBe(6.66);
    expect(snapshot.fifteenYearFixedPercent).toBe(5.98);
  });

  it('rejects a PMMS page that is missing one of the two fixed-rate quotes', () => {
    const html = `<script type="application/ld+json">{"@type":"FinancialProduct","category":"Mortgage","name":"30 - Year","description":"Average rates as of August 27, 2026","interestRate":"6.66"}</script>`;
    expect(() => normalizeFreddieMacPmmsHtml(html, { fetchedAt: '2026-09-03T00:00:00.000Z', rawSha256: 'b'.repeat(64) })).toThrow(/15-year or 30-year/);
  });

  it('parses the official BLS CPI-U time-series file and refuses a silent revision in an overlapping month', () => {
    const text = [
      'series_id\tyear\tperiod\tvalue\tfootnote_codes',
      'CUUR0000SA0\t1913\tM01\t9.8\t',
      'CUUR0000SA0\t1913\tM02\t9.8\t',
      'CUSR0000SA0\t1947\tM01\t21.48\t',
      'CUUR0000SA0\t2025\tM10\t-\t',
      'CUUR0000SA0\t2026\tM07\t333.918\t',
    ].join('\n');
    const parsed = observationsFromBlsTimeSeries(text);
    expect(parsed[0]).toEqual({ period: '1913-01', index: 9.8 });
    expect(parsed.at(-1)).toEqual({ period: '2026-07', index: 333.918 });
    expect(parsed.some((row) => row.period === '2025-10')).toBe(false);
    expect(nextMonthPeriod('2025-09')).toBe('2025-10');
    expect(() => mergeCpiObservations(parsed, [{ period: '1913-01', index: 9.9 }])).toThrow(/1913-01/);
    expect(() => validateCpiEnvelope(currentCpiFixture)).not.toThrow();
    expect(currentCpiFixture.snapshot.observations.some((row: { period: string }) => row.period === '2025-10')).toBe(false);
  });
});

describe('bundled snapshot integrity', () => {
  /**
   * The runtime modules read these snapshots without re-hashing them, so this is
   * the check that keeps a corrupted or hand-edited file from shipping.
   */
  it('re-verifies every snapshot the app reads at runtime', () => {
    expect(() => verifyBundledSnapshots()).not.toThrow();
  });
});

describe('registry and intent search', () => {
  it('keeps every launch tool above the indexability threshold and on a unique route', () => {
    expect(tools).toHaveLength(55);
    expect(tools.every((tool) => evaluateToolIndexability(tool).indexable)).toBe(true);
    expect(new Set(tools.map((tool) => tool.id)).size).toBe(tools.length);
    expect(new Set(tools.map((tool) => tool.path)).size).toBe(tools.length);
    expect(tools.some((tool) => /kg-to-|lbs-to-|days-from-today\/|percent-of-/.test(tool.path))).toBe(false);
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

  it('uses a versioned publishing date instead of the runtime clock', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);
    try {
      expect(tools.every((tool) => evaluateToolIndexability(tool).indexable)).toBe(true);
      expect(tools.every((tool) => (toolMetadata(tool).robots as { index?: boolean }).index === true)).toBe(true);
      expect(getSitemapFamilies().pages.map((entry) => entry.path)).toEqual([
        '/', '/about', '/methodology', '/methodology/data', '/privacy', '/terms', '/contact', '/faq',
      ]);
      expect(getSitemapFamilies().pages.every((entry) => entry.lastModified === PUBLISHING_SNAPSHOT_INSTANT)).toBe(true);
      expect(getSitemapFamilies().tools).toHaveLength(tools.length);
    } finally {
      now.mockRestore();
    }
  });

  it('enforces explicit review validity boundaries and real calendar dates', () => {
    const reviewed = structuredClone(tools[0]);
    reviewed.indexability.reviewValidUntil = '2027-10-06';
    expect(evaluateToolIndexability(reviewed, '2026-08-31').indexable).toBe(false);
    expect(evaluateToolIndexability(reviewed, '2027-10-06').indexable).toBe(true);
    expect(evaluateToolIndexability(reviewed, '2027-10-07').indexable).toBe(false);
    reviewed.indexability.reviewedAt = '2026-02-31';
    expect(evaluateToolIndexability(reviewed, '2026-09-02').indexable).toBe(false);
  });

  it('only indexes topic hubs with enough independently useful tools', () => {
    expect(isCategoryHubIndexable('home')).toBe(true);
    expect(isCategoryHubIndexable('shopping')).toBe(true);
    expect(isCategoryHubIndexable('money')).toBe(true);
    expect(isCategoryHubIndexable('car')).toBe(true);
    expect(isCategoryHubIndexable('food')).toBe(false);
    expect(isCategoryHubIndexable('everyday')).toBe(true);
    expect(isCategoryHubIndexable('health')).toBe(true);
    expect(isCategoryHubIndexable('math')).toBe(true);
    expect(isCategoryHubIndexable('education')).toBe(true);
  });

  it('matches natural-language intent rather than requiring exact titles', () => {
    expect(searchTools('how much concrete do I need')[0].tool.id).toBe('concrete');
    expect(searchTools('which package is cheaper')[0].tool.id).toBe('unit-price');
    expect(searchTools('where is it cheaper')[0].tool.id).toBe('where-cheaper');
    expect(searchTools('cheapest state for gas')[0].tool.id).toBe('where-cheaper');
    expect(searchTools('mortgage calculator')[0].tool.id).toBe('mortgage-payment');
    expect(searchTools('loan calculator')[0].tool.id).toBe('loan');
    expect(searchTools('compound interest calculator')[0].tool.id).toBe('compound-interest');
    expect(searchTools('debt snowball')[0].tool.id).toBe('debt-payoff');
    expect(searchTools('can I afford this house')[0].tool.id).toBe('home-affordability');
    expect(searchTools('how much house can I afford')[0].tool.id).toBe('home-affordability');
    expect(searchTools('inflation calculator')[0].tool.id).toBe('inflation');
    expect(searchTools('road trip fuel cost')[0].tool.id).toBe('road-trip-fuel');
    expect(searchTools('gas cost calculator')[0].tool.id).toBe('road-trip-fuel');
    expect(searchTools('cheapest state for gas')[0].tool.id).toBe('where-cheaper');
    expect(searchTools('what is 100 dollars in 1990 worth today')[0].tool.id).toBe('inflation');
    expect(searchTools('salary after tax')[0].tool.id).toBe('salary-after-tax');
    expect(searchTools('paycheck calculator')[0].tool.id).toBe('paycheck');
    expect(searchTools('electric bill calculator')[0].tool.id).toBe('electricity-cost');
    expect(searchTools('appliance electricity')[0].tool.id).toBe('appliance-electricity');
    expect(searchTools('device electricity cost')[0].tool.id).toBe('appliance-electricity');
    expect(searchTools('electricity usage')[0].tool.id).toBe('appliance-electricity');
    expect(searchTools('how much car can I afford')[0].tool.id).toBe('car-affordability');
    expect(searchTools('can I afford this car')[0].tool.id).toBe('car-affordability');
    expect(searchTools('true cost of owning a car')[0].tool.id).toBe('car-affordability');
    expect(searchTools('monthly car cost')[0].tool.id).toBe('car-affordability');
    expect(searchTools('car affordability calculator')[0].tool.id).toBe('car-affordability');
    expect(searchTools('how much should I spend on a car')[0].tool.id).toBe('car-affordability');
    expect(searchTools('car loan')[0].tool.id).toBe('car-loan');
    expect(searchTools('car loan calculator')[0].tool.id).toBe('car-loan');
    expect(searchTools('auto loan calculator')[0].tool.id).toBe('car-loan');
    expect(searchTools('car payment calculator')[0].tool.id).toBe('car-loan');
    expect(searchTools('vehicle loan calculator')[0].tool.id).toBe('car-loan');
    expect(searchTools('bmi calculator')[0].tool.id).toBe('bmi');
    expect(searchTools('tdee calculator')[0].tool.id).toBe('tdee');
    expect(searchTools('percentage calculator')[0].tool.id).toBe('percentage');
    expect(searchTools('percent change calculator')[0].tool.id).toBe('percent-change');
    expect(searchTools('days from today')[0].tool.id).toBe('days-from-today');
    expect(searchTools('time card calculator')[0].tool.id).toBe('time-card');
    expect(searchTools('simple interest')[0].tool.id).toBe('interest');
    expect(searchTools('investment calculator')[0].tool.id).toBe('investment');
    expect(searchTools('cost of living')[0].tool.id).toBe('cost-of-living');
    expect(searchTools('living cost')[0].tool.id).toBe('cost-of-living');
    expect(searchTools('cost to live')[0].tool.id).toBe('cost-of-living');
    expect(searchTools('living expenses')[0].tool.id).toBe('cost-of-living');
    expect(searchTools('city cost of living')[0].tool.id).toBe('cost-of-living');
    expect(searchTools('state cost of living')[0].tool.id).toBe('cost-of-living');
  });

  it('returns no false-positive tool for unsupported or stop-word-only intent', () => {
    expect(searchTools('how much paint do I need')).toEqual([]);
    expect(searchTools('roof cost')).toEqual([]);
    expect(searchTools('do I need')).toEqual([]);
    expect(searchTools('concrete paint')).toEqual([]);
    expect(searchTools('concrete slab paint')[0].tool.id).toBe('concrete');
  });

  it('keeps featured fallback exclusive to a truly empty query', () => {
    const empty = searchTools('');
    expect(empty).toHaveLength(8);
    expect(empty.every((result) => result.matchedOn === 'featured')).toBe(true);
    expect(new Set(empty.map((result) => result.tool.category)).size).toBe(8);
    expect(searchTools('', tools.length)).toHaveLength(tools.length);
    expect(searchTools('how much')).toEqual([]);
  });
});

describe('search reaches the tool a reader asked for', () => {
  it('answers the phrasings people actually type', () => {
    // Ten of these returned nothing before: a converter that did not match
    // "kg to lbs", an area tool that did not match "sq ft", and so on.
    const expectations: Array<[string, string]> = [
      ['convert kg to lbs', 'unit-conversion'],
      ['kg to lbs', 'unit-conversion'],
      ['sq ft', 'square-footage'],
      ['percent off', 'percentage'],
      ['discount', 'percentage'],
      ['cd rate', 'cd'],
      ['student loan', 'loan'],
      ['days until', 'days-from-today'],
      ['w2', 'paycheck'],
      ['refinance', 'refinance'],
      ['take home pay', 'paycheck'],
      ['how much house can i afford', 'home-affordability'],
      ['how old am i', 'age'],
      ['cheapest state', 'where-cheaper'],
      ['overtime', 'hourly-to-salary'],
      ['gsa per diem', 'per-diem'],
      ['per diem by zip code', 'per-diem'],
      ['standard conus rate', 'per-diem'],
      ['texas teacher salary after taxes', 'salary-after-tax'],
      ['mortgage payment from a quoted rate', 'mortgage-payment'],
      ['days between dates', 'date'],
    ];
    for (const [query, expected] of expectations) {
      const hits = searchTools(query, 3).map((result) => result.tool.id);
      expect(hits, `"${query}" should reach ${expected}, got ${hits.join(', ') || 'nothing'}`).toContain(expected);
    }
  });
});

describe('internal linking graph', () => {
  it('gives every calculator real neighbours and keeps the whole catalogue reachable', () => {
    for (const tool of tools) {
      const related = getRelatedTools(tool);
      expect(related.length, `${tool.id} has too few related tools`).toBeGreaterThanOrEqual(RELATED_TOOL_MINIMUM);
      expect(related.length).toBeLessThanOrEqual(RELATED_TOOL_LIMIT);
      expect(related.map((candidate) => candidate.id)).not.toContain(tool.id);
      expect(new Set(related.map((candidate) => candidate.id)).size).toBe(related.length);
      expect(clustersForTool(tool.id).length, `${tool.id} is in no cluster`).toBeGreaterThan(0);
    }

    // A crawler landing anywhere should be able to walk to everything. Related
    // lists used to be authored one way, which stranded whole corners.
    const start = tools[0];
    const seen = new Set<string>([start.id]);
    let frontier = [start];
    while (frontier.length > 0) {
      const next: typeof tools = [];
      for (const tool of frontier) {
        for (const candidate of getRelatedTools(tool)) {
          if (seen.has(candidate.id)) continue;
          seen.add(candidate.id);
          next.push(candidate);
        }
      }
      frontier = next;
    }
    expect(seen.size).toBe(tools.length);
  });

  it('walks the pay-to-mortgage journey the clusters describe', () => {
    const step = (from: string, to: string) =>
      getRelatedTools(getTool(from)).some((candidate) => candidate.id === to);
    expect(step('hourly-to-salary', 'salary-after-tax')).toBe(true);
    expect(step('salary-after-tax', 'paycheck')).toBe(true);
    expect(step('paycheck', '401k')).toBe(true);
    expect(step('home-affordability', 'mortgage-payment')).toBe(true);
    expect(step('mortgage-payment', 'mortgage-payoff')).toBe(true);
  });
});

describe('sitemap scale contract', () => {
  it('splits more than 100,000 records without exceeding the protocol limit', () => {
    const records = Array.from({ length: 100_001 }, (_, index) => index);
    const pages = paginateSitemapEntries(records);
    expect(pages.map((page) => page.length)).toEqual([SITEMAP_URL_LIMIT, SITEMAP_URL_LIMIT, 1]);
  });

  it('uses each child sitemap maximum timestamp in the sitemap index contract', () => {
    const families = getSitemapFamilies();
    for (const [family, entries] of Object.entries(families)) {
      const expected = entries.reduce((latest, entry) => entry.lastModified > latest ? entry.lastModified : latest, entries[0].lastModified);
      expect(sitemapPageLastModified(family as keyof typeof families, 1)).toBe(expected);
      expect(Number.isFinite(Date.parse(expected))).toBe(true);
    }
    expect(families.tools.map((entry) => entry.path)).not.toContain('/search');
  });
});

describe('site FAQ', () => {
  it('keeps FAQPage JSON-LD aligned with the visible questions', () => {
    const schema = faqPageJsonLd(SITE_FAQ);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.inLanguage).toBe('en-US');
    expect(schema.mainEntity).toHaveLength(SITE_FAQ.length);
    expect(new Set(SITE_FAQ.map((entry) => entry.id)).size).toBe(SITE_FAQ.length);
    expect(new Set(SITE_FAQ.map((entry) => entry.question)).size).toBe(SITE_FAQ.length);

    const entities = schema.mainEntity as Array<{
      '@type': string;
      name: string;
      acceptedAnswer: { '@type': string; text: string };
    }>;
    for (const [index, entry] of SITE_FAQ.entries()) {
      expect(entities[index]?.['@type']).toBe('Question');
      expect(entities[index]?.name).toBe(entry.question);
      expect(entities[index]?.acceptedAnswer.text).toBe(entry.answer.join(' '));
      expect(entry.answer.every((paragraph) => paragraph.length > 40)).toBe(true);
    }
  });

  it('only links related pages that exist', () => {
    const staticPaths = new Set([
      '/about', '/methodology', '/methodology/data', '/privacy', '/terms', '/contact', '/faq',
    ]);
    const toolPaths = new Set(tools.map((tool) => tool.path));
    for (const entry of SITE_FAQ) {
      for (const related of entry.related ?? []) {
        expect(
          staticPaths.has(related.href) || toolPaths.has(related.href),
          `${entry.id} related ${related.href}`,
        ).toBe(true);
      }
    }
  });
});

describe('tool editorial content', () => {
  it('covers every calculator with unique indexable copy', () => {
    const ledges = new Set<string>();
    const questions = new Set<string>();
    const firstParagraphs = new Set<string>();
    const glossarySets = new Set<string>();
    expect(listToolEditorial()).toHaveLength(tools.length);
    for (const tool of tools) {
      const content = getToolEditorial(tool.id);
      expect(content.toolId).toBe(tool.id);
      expect(content.guide.heading.length).toBeGreaterThan(20);
      expect(content.guide.lede.length).toBeGreaterThan(80);
      expect(content.guide.sections.length).toBeGreaterThan(0);
      expect(content.faq.length).toBeGreaterThanOrEqual(1);
      expect(content.glossary.length).toBeGreaterThanOrEqual(1);
      expect(content.tips.length).toBeGreaterThanOrEqual(1);
      expect(content.caveats.length).toBeGreaterThanOrEqual(1);
      expect(ledges.has(content.guide.lede), `${tool.id} reuses another lede`).toBe(false);
      ledges.add(content.guide.lede);
      const firstParagraph = content.guide.sections[0]?.paragraphs[0];
      expect(firstParagraph, `${tool.id} missing first guide paragraph`).toBeTruthy();
      expect(firstParagraphs.has(firstParagraph!), `${tool.id} reuses another first paragraph`).toBe(false);
      firstParagraphs.add(firstParagraph!);
      const glossaryKey = content.glossary.map((item) => item.term).sort().join('|');
      expect(glossarySets.has(glossaryKey), `${tool.id} reuses another glossary set`).toBe(false);
      glossarySets.add(glossaryKey);
      for (const entry of content.faq) {
        expect(entry.question.length).toBeGreaterThan(12);
        expect(entry.answer.join(' ').length).toBeGreaterThan(40);
        expect(questions.has(entry.question), `duplicate FAQ: ${entry.question}`).toBe(false);
        questions.add(entry.question);
      }
    }
  });

  it('gives YMYL health calorie tools at least three FAQs', () => {
    for (const id of ['bmi', 'calorie', 'tdee'] as const) {
      expect(getToolEditorial(id).faq.length, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps honest long-tail notes on refinance, car-loan, paycheck, and 401(k)', () => {
    for (const id of ['refinance', 'car-loan', 'paycheck', '401k'] as const) {
      expect(getToolEditorial(id).longTail?.length, id).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps long-tail meta titles from replacing the on-page product name', () => {
    const mortgage = getTool('mortgage-payment');
    expect(mortgage.title).toBe('Mortgage Payment Calculator');
    expect(mortgage.metaTitle).toMatch(/30-Year/);
    expect(toolMetadata(mortgage).title).toBe(mortgage.metaTitle);
  });
});

describe('affiliate architecture', () => {
  it('keys offers to money and credit tools without inventing tracking URLs', () => {
    expect(isAffiliateEligible('mortgage-payment')).toBe(true);
    expect(isAffiliateEligible('credit-card-payoff')).toBe(true);
    expect(isAffiliateEligible('salary-after-tax')).toBe(false);
    expect(isAffiliateEligible('hourly-to-salary')).toBe(false);
    expect(isAffiliateEligible('bmi')).toBe(false);
    expect(offersForTool('mortgage-payment').length).toBeGreaterThan(0);
    expect(affiliateUrl('lendingtree', {})).toBeUndefined();
    expect(affiliateUrl('lendingtree', { NEXT_PUBLIC_AFFILIATE_LENDINGTREE_URL: 'https://example.com/lenders' })).toBe('https://example.com/lenders');
    expect(affiliateUrl('sofi', { NEXT_PUBLIC_AFFILIATE_SOFI_URL: 'not-a-url' })).toBeUndefined();
  });
});
