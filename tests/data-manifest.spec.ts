import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATASET_IDS, DATASET_POLICIES } from '@/lib/data/dataset-policy';
import {
  DATA_SOURCES,
  DATA_SOURCE_IDS,
  PROVENANCE_CLASS_WORDS,
  getDataSource,
  provenanceClassForTier,
  type DataSourceId,
} from '@/lib/data/data-sources';
import { tools } from '@/lib/tool-registry';
import {
  assertToolDataManifest,
  defaultStalenessDays,
  formulaOnly,
  formulaWithBenchmark,
  formulaWithDefault,
  manifestDatasetIds,
  manifestSourceIds,
  requiresOfficialData,
} from '@/lib/tools/data-manifest';
import { evaluateToolDataReadiness } from '@/lib/tools/data-readiness';
import { calculationReceipt, receiptSummary } from '@/lib/tools/receipt';
import type { ToolDataManifest } from '@/lib/tools/types';

const registry = JSON.parse(
  readFileSync(join(process.cwd(), 'data/source-registry.json'), 'utf8'),
) as {
  tiers: Record<string, string>;
  sources: Array<{ id: string; tier: string; status: string; license: string; commercialUse: string; limitations: string[]; partOf?: string }>;
};

const registryById = new Map(registry.sources.map((row) => [row.id, row]));

describe('data source tiers', () => {
  it('gives every shipped source a tier and a registry row that agrees with it', () => {
    for (const id of DATA_SOURCE_IDS) {
      const source = getDataSource(id);
      const row = registryById.get(source.registryId);
      expect(row, `${id} names registry row ${source.registryId}`).toBeDefined();
      expect(row!.tier, `${id} tier`).toBe(source.tier);
    }
  });

  it('never ships a source whose licence does not permit commercial use', () => {
    const shipped = new Set(DATA_SOURCE_IDS.map((id) => getDataSource(id).registryId));
    for (const row of registry.sources) {
      if (!shipped.has(row.id) && !(row.partOf && shipped.has(row.partOf))) continue;
      expect(row.commercialUse, `${row.id} commercial use`).toBe('permitted');
    }
  });

  it('records how each source would be misused, in the registry and in code', () => {
    for (const id of DATA_SOURCE_IDS) {
      const source = getDataSource(id);
      expect(source.misuse.length, `${id} misuse`).toBeGreaterThan(20);
      expect(registryById.get(source.registryId)!.limitations.length, `${id} limitations`).toBeGreaterThan(0);
    }
  });

  it('keeps a registry row that is not tiered out of the shipped set', () => {
    const shipped = new Set(DATA_SOURCE_IDS.map((id) => getDataSource(id).registryId));
    for (const row of registry.sources) {
      if (row.tier === 'none') {
        expect(shipped.has(row.id), `${row.id} is tier none but shipped`).toBe(false);
        expect(row.partOf, `${row.id} is tier none and cannot be part of a shipped source`).toBeUndefined();
        continue;
      }
      // A compiled source ships once and names the documents it was built from.
      const reachable = shipped.has(row.id) || (row.partOf !== undefined && shipped.has(row.partOf));
      expect(reachable, `${row.id} is tiered but unused`).toBe(true);
      if (row.partOf) {
        expect(registryById.get(row.partOf)?.tier, `${row.id} tier matches ${row.partOf}`).toBe(row.tier);
      }
    }
  });

  it('maps each tier to exactly one reader-facing word', () => {
    expect(PROVENANCE_CLASS_WORDS[provenanceClassForTier('A')]).toBe('VERIFIED');
    expect(PROVENANCE_CLASS_WORDS[provenanceClassForTier('B')]).toBe('OBSERVED');
    expect(PROVENANCE_CLASS_WORDS[provenanceClassForTier('C')]).toBe('MODELED');
    expect(PROVENANCE_CLASS_WORDS[provenanceClassForTier('D')]).toBe('MODELED');
  });

  it('gives every tracked dataset a policy and a tier', () => {
    for (const datasetId of DATASET_IDS) {
      expect(DATASET_POLICIES[datasetId]).toBeDefined();
      expect(DATA_SOURCES[datasetId]?.policyId).toBe(datasetId);
    }
  });
});

describe('tool data manifests', () => {
  it('gives every tool a manifest that satisfies its own rules', () => {
    expect(tools.length).toBeGreaterThan(60);
    for (const tool of tools) expect(() => assertToolDataManifest(tool)).not.toThrow();
  });

  it('names only sources that exist', () => {
    for (const tool of tools) {
      for (const id of manifestSourceIds(tool.data)) expect(() => getDataSource(id)).not.toThrow();
    }
  });

  it('lets most of the catalogue answer without any dataset at all', () => {
    /*
     * The point of the manifest. If a majority of the catalogue turned out to
     * require official data, either the classification is wrong or the site has
     * quietly become a data product where it meant to be a calculator.
     */
    const independent = tools.filter((tool) => !tool.data.requiresData);
    expect(independent.length).toBeGreaterThan(tools.length / 2);
  });

  it('blocks rather than degrades wherever the answer would otherwise be wrong', () => {
    const blocking = tools.filter((tool) => tool.data.requiresData);
    for (const tool of blocking) {
      expect(tool.data.fallbackBehavior.kind, tool.id).toBe('blocked');
      expect(tool.data.maxStalenessDays, tool.id).toBeGreaterThan(0);
      expect(tool.resultNature, tool.id).not.toBe('exact');
    }
    expect(blocking.map((tool) => tool.id)).toContain('salary-after-tax');
    expect(blocking.map((tool) => tool.id)).toContain('per-diem');
    expect(blocking.map((tool) => tool.id)).toContain('conforming-loan-limit');
    expect(blocking.map((tool) => tool.id)).toContain('va-funding-fee');
    expect(blocking.map((tool) => tool.id)).toContain('hsa-contribution');
    expect(blocking.map((tool) => tool.id)).toContain('rmd');
  });

  it('keeps the mortgage payment answer independent of the survey rate', () => {
    const mortgage = tools.find((tool) => tool.id === 'mortgage-payment')!;
    expect(mortgage.data.requiresData).toBe(false);
    expect(mortgage.data.optionalDatasets).toContain('freddie-mac-pmms');
    expect(mortgage.data.fallbackBehavior.kind).toBe('user-entered');
  });

  it('reports only the datasets that carry a freshness policy', () => {
    const manifest = requiresOfficialData({
      required: ['us-tax', 'aca-subsidy-rules'],
      note: 'test',
    });
    expect(manifestDatasetIds(manifest)).toEqual(['us-tax']);
  });

  it('allows a required source a full release cycle plus its own publication lag', () => {
    const weekly = defaultStalenessDays(['freddie-mac-pmms'])!;
    expect(weekly).toBe(7 + 7 + 0);
    const oews = defaultStalenessDays(['bls-oews'])!;
    expect(oews).toBe(365 + 90 + 380);
    expect(defaultStalenessDays([])).toBeNull();
    // A pinned rules document has no cadence, so it gets a year and a review window.
    expect(defaultStalenessDays(['aca-subsidy-rules'])).toBe(400);
  });

  it('refuses a manifest that contradicts itself', () => {
    const base = { id: 'test-tool', resultNature: 'official-data-estimate' as const };
    const bad = (data: ToolDataManifest) => () => assertToolDataManifest({ ...base, data });

    expect(bad({ ...requiresOfficialData({ required: ['us-tax'], note: 'x' }), requiresData: false })).toThrow(/requiresData/);
    expect(bad({ ...requiresOfficialData({ required: ['us-tax'], note: 'x' }), fallbackBehavior: { kind: 'formula-only', note: 'x' } })).toThrow(/must be 'blocked'/);
    expect(bad({ ...formulaOnly('x'), maxStalenessDays: 30 })).toThrow(/must not set a staleness limit/);
    expect(bad({ ...requiresOfficialData({ required: ['bls-oews'], note: 'x' }), maxStalenessDays: 30 })).toThrow(/tighter than/);
    expect(bad({
      ...requiresOfficialData({ required: ['us-tax'], note: 'x' }),
      optionalDatasets: ['us-tax'],
    })).toThrow(/both required and optional/);
    expect(() => assertToolDataManifest({
      id: 'test-tool',
      resultNature: 'exact',
      data: requiresOfficialData({ required: ['us-tax'], note: 'x' }),
    })).toThrow(/may not be 'exact'/);
    expect(() => formulaWithDefault({ optional: [], note: 'x' })).toThrow();
    expect(() => formulaWithBenchmark({ optional: [], note: 'x' })).toThrow();
    expect(() => requiresOfficialData({ required: [], note: 'x' })).toThrow();
  });
});

describe('tool data readiness', () => {
  const taxManifest = requiresOfficialData({
    required: ['us-tax'],
    optional: ['cms-marketplace'],
    note: 'The page says so instead of estimating.',
  });

  const present = (period: string, publishedAt?: string): Partial<Record<DataSourceId, { observationPeriod: string; publishedAt?: string }>> => ({
    'us-tax': { observationPeriod: period, publishedAt },
  });

  it('is complete when the required copy is inside its window', () => {
    const readiness = evaluateToolDataReadiness({ manifest: taxManifest, present: present('2026'), asOf: '2027-01-15' });
    expect(readiness.complete).toBe(true);
    expect(readiness.blockedBy).toEqual([]);
  });

  it('blocks when a required source is missing', () => {
    const readiness = evaluateToolDataReadiness({ manifest: taxManifest, present: {}, asOf: '2027-01-15' });
    expect(readiness.complete).toBe(false);
    expect(readiness.blockedBy.join(' ')).toMatch(/IRS and state revenue departments is not available/);
    expect(readiness.fallback.kind).toBe('blocked');
  });

  it('blocks when the required copy is past the window the tool allows', () => {
    const readiness = evaluateToolDataReadiness({ manifest: taxManifest, present: present('2024'), asOf: '2027-01-15' });
    expect(readiness.complete).toBe(false);
    expect(readiness.blockedBy.join(' ')).toMatch(/older than the 455 days/);
  });

  it('ages a lagging release from its publication date, not only its period', () => {
    const oews = requiresOfficialData({ required: ['bls-oews'], note: 'x' });
    const stalePeriodOnly = evaluateToolDataReadiness({
      manifest: oews,
      present: { 'bls-oews': { observationPeriod: '2025' } },
      asOf: '2028-06-01',
    });
    expect(stalePeriodOnly.complete).toBe(false);
    const publishedLate = evaluateToolDataReadiness({
      manifest: oews,
      present: { 'bls-oews': { observationPeriod: '2025', publishedAt: '2027-05-01' } },
      asOf: '2028-06-01',
    });
    expect(publishedLate.complete).toBe(true);
  });

  it('degrades without blocking when only an optional source is gone', () => {
    const readiness = evaluateToolDataReadiness({ manifest: taxManifest, present: present('2026'), asOf: '2027-01-15' });
    expect(readiness.complete).toBe(true);
    expect(readiness.degradedBy.join(' ')).toMatch(/CMS marketplace landscape/);
  });

  it('never blocks a tool that requires nothing', () => {
    const readiness = evaluateToolDataReadiness({ manifest: formulaOnly('Arithmetic.'), present: {}, asOf: '2099-01-01' });
    expect(readiness.complete).toBe(true);
    expect(readiness.blockedBy).toEqual([]);
  });
});

describe('calculation receipt', () => {
  it('says nothing about sources on a page that reads none', () => {
    const manifest = formulaOnly('A tip is a percentage of the bill.');
    expect(calculationReceipt({ manifest })).toEqual([]);
    expect(receiptSummary(manifest)).toMatch(/No outside dataset is involved/);
  });

  it('marks a rule as verified and dates it when the page knows the period', () => {
    const manifest = requiresOfficialData({ required: ['us-tax'], note: 'x' });
    const [line] = calculationReceipt({ manifest, periods: { 'us-tax': 'Tax year 2026' } });
    expect(line.classWord).toBe('VERIFIED');
    expect(line.period).toBe('Tax year 2026');
    expect(line.role).toMatch(/Without it the page says so/);
  });

  it('separates a survey default from the figure a reader types over it', () => {
    const manifest = formulaWithDefault({ optional: ['freddie-mac-pmms'], note: 'x' });
    const lines = calculationReceipt({ manifest });
    expect(lines.map((line) => line.classWord)).toEqual(['OBSERVED', 'USER ENTERED']);
    expect(lines[0].role).toMatch(/Only a starting value/);
  });

  it('names a CostAnswer figure that no publisher supplies', () => {
    const mortgage = tools.find((tool) => tool.id === 'mortgage-payment')!;
    const modeled = calculationReceipt({ manifest: mortgage.data }).filter((line) => line.classWord === 'MODELED');
    expect(modeled).toHaveLength(1);
    expect(modeled[0].source).toBe('Private mortgage insurance');
    expect(modeled[0].role).toMatch(/No national PMI rate table exists/);
    // The rate is never presented as verified, which is the point of the class.
    expect(modeled[0].provenanceClass).toBe('modeled');
  });

  it('refuses a modelled input that names a figure without explaining it', () => {
    expect(() => assertToolDataManifest({
      id: 'test-tool',
      resultNature: 'planning-model',
      data: formulaOnly('Arithmetic.', [{ label: 'PMI', why: 'because' }]),
    })).toThrow(/without saying where the figure came from/);
  });

  it('does not invent a reader line where nothing is being replaced', () => {
    const manifest = formulaWithBenchmark({ optional: ['naic-insurance'], note: 'x' });
    const lines = calculationReceipt({ manifest });
    expect(lines.map((line) => line.classWord)).toEqual(['OBSERVED']);
  });

  it('gives every shipped tool a receipt whose lines are all classified', () => {
    for (const tool of tools) {
      for (const line of calculationReceipt({ manifest: tool.data })) {
        expect(Object.values(PROVENANCE_CLASS_WORDS), tool.id).toContain(line.classWord);
        expect(line.role.length, tool.id).toBeGreaterThan(10);
      }
      expect(receiptSummary(tool.data).length, tool.id).toBeGreaterThan(30);
    }
  });
});
