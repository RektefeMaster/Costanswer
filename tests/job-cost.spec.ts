import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getOewsEstimate } from '@/lib/data/bls-oews-snapshot';
import { readStoreJsonSync } from '@/lib/data/store';
import { getSitemapFamilies } from '@/lib/seo/sitemaps';
import {
  COST_RESERVED_SEGMENTS,
  JOB_CATALOG,
  JOB_IDS,
  jobFormFields,
  jobPath,
  jobTitleInSentence,
  jobSearchIndex,
  type JobId,
} from '@/lib/job/catalog';
import { calculateJobEstimate } from '@/lib/job/estimate';
import { locateJobZip } from '@/lib/job/location';
import { priceMaterials } from '@/lib/job/materials';
import { unnamedAdjustmentImpossible } from '@/lib/job/modifiers';
import { checkJobQuote, ABOVE_RANGE_REASONS } from '@/lib/job/quote-check';
import { getRecipe, listRecipes } from '@/lib/job/recipes';
import { validateRecipe } from '@/lib/job/recipe-validate';
import { loadJobDatasets } from '@/lib/job/server-datasets';
import { calibrate } from '@/lib/job/calibration';
import { isCostLevelIndexable } from '@/lib/job/publication';
import { costFamilySitemapPaths } from '@/lib/job/paths';
import { paintWallSqFtFromRooms, resolveJobScope, toJobEstimateInput, type JobScopeFields } from '@/lib/job/scope';
import type {
  EcecSnapshot,
  FemaEquipmentSnapshot,
  JobDatasets,
  JobEstimate,
  MaterialBasketSnapshot,
  PpiSnapshot,
  QuoteVerdict,
} from '@/lib/job/types';

const ROOT = process.cwd();
const ZIP = '75201';
const FORBIDDEN = [/\brip ?off\b/i, /\bripoff\b/i, /\bovercharge\b/i, /\bscam\b/i];
const NORMAL_RANGE = /normal range/i;

function walk(directory: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      out.push(...walk(path));
      continue;
    }
    if (entry.endsWith('.ts') || entry.endsWith('.tsx')) out.push(path);
  }
  return out;
}

function reconstructCents(estimate: JobEstimate): number {
  return [
    ...estimate.labor,
    ...estimate.materials,
    ...estimate.equipment,
    estimate.permit,
    estimate.disposal,
    estimate.overhead,
    estimate.profitMarkup,
    estimate.contingency,
    ...estimate.modifiers,
  ].reduce((sum, step) => sum + (step?.cents ?? 0), 0);
}

/**
 * D.3 arithmetic in cents, independent of `calculateJobEstimate`.
 * Sequential rounding matches the engine: overhead, then markup, then contingency, then named modifiers.
 */
function handExpectedCents(
  jobId: JobId,
  units: number,
  selected: Record<string, string>,
  datasets: JobDatasets,
  materialFactors: Record<string, number> = {},
): number {
  const recipe = getRecipe(jobId);
  const loading = datasets.ecec && datasets.ecec.loadingFactor >= 1.25 && datasets.ecec.loadingFactor <= 1.65
    ? datasets.ecec.loadingFactor
    : 1.4;
  let labor = 0;
  for (const member of recipe.crew) {
    const wage = datasets.wages.find((row) => row.socCode === member.socCode);
    if (!wage || wage.hourlyMedian == null || wage.hourlyMedian <= 0) continue;
    const hours = member.count.value * recipe.laborHoursPerUnit.value * units;
    labor += Math.round(hours * wage.hourlyMedian * loading * 100);
  }
  const materials = priceMaterials(recipe, units, datasets.basket, datasets.ppi, materialFactors);
  let equipment = 0;
  const rates = new Map((datasets.fema?.rates ?? []).map((rate) => [rate.rateId, rate]));
  for (const line of recipe.equipment) {
    const rate = rates.get(line.rateId);
    if (!rate || rate.rateCents <= 0) continue;
    equipment += Math.round(line.hoursPerUnit.value * units * rate.rateCents);
  }
  const direct = labor + materials.totalCents + equipment;
  const overhead = Math.round(direct * recipe.overheadRate.value);
  const subtotal = direct + overhead;
  const profit = Math.round(subtotal * recipe.profitMarkupRate.value);
  const afterProfit = subtotal + profit;
  const contingency = Math.round(afterProfit * recipe.contingencyRate.value);
  let current = afterProfit + contingency;
  for (const spec of recipe.modifiers) {
    const option = spec.options.find((entry) => entry.id === selected[spec.id])
      ?? spec.options.find((entry) => entry.id === spec.defaultOptionId);
    if (!option) continue;
    current = Math.round(current * option.factor.value) + option.addCents.value;
  }
  return current;
}

async function dallasDatasets(jobId: JobId): Promise<JobDatasets> {
  const location = locateJobZip(ZIP);
  expect(location).not.toBeNull();
  expect(location?.state).toBe('TX');
  return loadJobDatasets(jobId, location!.state, location!.countyGeoid.slice(0, 2));
}

function defaultModifiers(jobId: JobId): Record<string, string> {
  return Object.fromEntries(JOB_CATALOG[jobId].modifiers.map((modifier) => [modifier.id, modifier.defaultOptionId]));
}

function defaultScopeFields(jobId: JobId): JobScopeFields {
  const fields: JobScopeFields = {};
  for (const field of jobFormFields(JOB_CATALOG[jobId])) {
    (fields as Record<string, number>)[field.id] = field.defaultValue;
  }
  return fields;
}

describe('Job Cost Engine V1', () => {
  it('has fourteen recipes whose every SourcedValue sourceId exists', () => {
    expect(JOB_IDS).toHaveLength(14);
    expect(listRecipes()).toHaveLength(14);
    for (const recipe of listRecipes()) {
      expect(() => validateRecipe(recipe)).not.toThrow();
      expect(recipe.profitMarkupRate.value).toBeGreaterThan(0);
      expect(recipe).toHaveProperty('profitMarkupRate');
      expect(recipe).not.toHaveProperty('profitMarginRate');
    }
  });

  it('keeps catalog modifiers aligned with recipe option ids', () => {
    for (const jobId of JOB_IDS) {
      expect((COST_RESERVED_SEGMENTS as readonly string[]).includes(jobId)).toBe(false);
      const recipe = getRecipe(jobId);
      const meta = JOB_CATALOG[jobId];
      expect(recipe.jobId).toBe(jobId);
      expect(recipe.modifiers.map((item) => item.id)).toEqual(meta.modifiers.map((item) => item.id));
      for (const modifier of meta.modifiers) {
        const spec = recipe.modifiers.find((item) => item.id === modifier.id);
        expect(spec?.options.map((option) => option.id)).toEqual(modifier.options.map((option) => option.id));
        expect(spec?.defaultOptionId).toBe(modifier.defaultOptionId);
      }
    }
  });

  it('keeps every intake extrema inside the recipe unit range', () => {
    for (const jobId of JOB_IDS) {
      const modifiers = defaultModifiers(jobId);
      const minFields: JobScopeFields = {};
      const maxFields: JobScopeFields = {};
      for (const field of jobFormFields(JOB_CATALOG[jobId])) {
        (minFields as Record<string, number>)[field.id] = field.min;
        (maxFields as Record<string, number>)[field.id] = field.max;
      }
      expect(() => toJobEstimateInput(jobId, ZIP, modifiers, minFields), jobId).not.toThrow();
      expect(() => toJobEstimateInput(jobId, ZIP, modifiers, maxFields), jobId).not.toThrow();
    }
    const paintMaxTall = toJobEstimateInput(
      'interior-painting',
      ZIP,
      { height: 'tall', prep: 'standard', coats: 'two', occupied: 'empty' },
      { rooms: 20, roomFloorSqFt: 400 },
    );
    expect(paintMaxTall.units).toBeLessThanOrEqual(JOB_CATALOG['interior-painting'].scope.max);
  });

  it('uses markup on (direct + overhead), not a selling-price margin', () => {
    const recipe = getRecipe('tree-removal');
    expect(recipe.profitMarkupRate.sourceId).toBe('markup');
    expect(recipe.sources.markup.kind).toBe('model_assumption');
    expect(recipe.sources.ecec.kind).toBe('model_transformation');
    const overhead = recipe.sources.overhead;
    expect(overhead.kind).toBe('model_assumption');
    if (overhead.kind !== 'model_assumption') throw new Error('expected model_assumption');
    expect(overhead.rationale).toMatch(/ECEC/i);
  });

  it('prices tree removal in 75201 as a complete golden against the D.3 formula', async () => {
    const datasets = await dallasDatasets('tree-removal');
    expect(datasets.ecec?.loadingFactor).toBe(1.4415);
    const txWage = getOewsEstimate('TX', '37-3013');
    const nationalWage = getOewsEstimate('US', '37-3013');
    expect((txWage?.hourly.median ?? nationalWage?.hourlyMean ?? nationalWage?.hourly.median) ?? 0).toBeGreaterThan(0);

    const defaults = Object.fromEntries(JOB_CATALOG['tree-removal'].modifiers.map((modifier) => [modifier.id, modifier.defaultOptionId]));
    const result = calculateJobEstimate({ jobId: 'tree-removal', zip: ZIP, units: 1, modifiers: defaults }, datasets);
    const estimate = result.value;
    const expected = handExpectedCents('tree-removal', 1, defaults, datasets);

    expect(estimate.status).toBe('complete');
    expect(estimate.range).not.toBeNull();
    expect(estimate.rangeLabel).toBe('CostAnswer estimated range');
    expect(estimate.confidence).not.toBe('high');
    expect(estimate.range?.expectedCents).toBe(expected);
    expect(Math.abs(reconstructCents(estimate) - expected)).toBeLessThanOrEqual(100);
    expect(unnamedAdjustmentImpossible(getRecipe('tree-removal'), defaults, expected, reconstructCents(estimate))).toBe(true);
    expect(estimate.femaProxyNote).toMatch(/cost proxy/i);
    expect(estimate.geographyNote).toMatch(/approximate ZIP\/ZCTA/i);
    expect(estimate.labor.some((step) => /ECEC loading/.test(step.detail ?? ''))).toBe(true);
  });

  it('converts rooms into wall area the user can measure', () => {
    expect(paintWallSqFtFromRooms(4, 144)).toBeCloseTo(4 * 4 * 12 * 8 * 0.85, 5);
    expect(paintWallSqFtFromRooms(4, 144, 9)).toBeCloseTo(4 * 4 * 12 * 9 * 0.85, 5);
    expect(getRecipe('interior-painting').materials[0].quantityPerUnit.value).toBeCloseTo(0.00571);
    const eight = resolveJobScope('interior-painting', { rooms: 4, roomFloorSqFt: 144 }, { height: 'eight', prep: 'standard', coats: 'two', occupied: 'empty' });
    const nine = resolveJobScope('interior-painting', { rooms: 4, roomFloorSqFt: 144 }, { height: 'tall', prep: 'standard', coats: 'two', occupied: 'empty' });
    expect(nine.units).toBeGreaterThan(eight.units);
  });

  it('scales HVAC equipment with tons and driveway mix with thickness', async () => {
    const hvacDatasets = await dallasDatasets('hvac-replacement');
    const hvacDefaults = Object.fromEntries(JOB_CATALOG['hvac-replacement'].modifiers.map((modifier) => [modifier.id, modifier.defaultOptionId]));
    const three = calculateJobEstimate({
      jobId: 'hvac-replacement',
      zip: ZIP,
      units: 1,
      modifiers: hvacDefaults,
      materialFactors: { 'split-system': 1 },
    }, hvacDatasets);
    const four = calculateJobEstimate({
      jobId: 'hvac-replacement',
      zip: ZIP,
      units: 1,
      modifiers: hvacDefaults,
      materialFactors: { 'split-system': 4 / 3 },
    }, hvacDatasets);
    const threeMaterials = three.value.materials.reduce((sum, step) => sum + step.cents, 0);
    const fourMaterials = four.value.materials.reduce((sum, step) => sum + step.cents, 0);
    expect(three.value.status).toBe('complete');
    expect(fourMaterials).toBeGreaterThan(threeMaterials);

    const driveDatasets = await dallasDatasets('concrete-driveway');
    const fourInch = resolveJobScope('concrete-driveway', { units: 400 }, { thickness: 'four', finish: 'broom', access: 'normal' });
    const fiveInch = resolveJobScope('concrete-driveway', { units: 400 }, { thickness: 'five', finish: 'broom', access: 'normal' });
    expect(fourInch.materialFactors['ready-mix-concrete'] ?? 1).toBe(1);
    expect(fiveInch.materialFactors['ready-mix-concrete']).toBe(1.25);
    const fourResult = calculateJobEstimate({
      jobId: 'concrete-driveway',
      zip: ZIP,
      units: 400,
      modifiers: { thickness: 'four', finish: 'broom', access: 'normal' },
      materialFactors: fourInch.materialFactors,
    }, driveDatasets);
    const fiveResult = calculateJobEstimate({
      jobId: 'concrete-driveway',
      zip: ZIP,
      units: 400,
      modifiers: { thickness: 'five', finish: 'broom', access: 'normal' },
      materialFactors: fiveInch.materialFactors,
    }, driveDatasets);
    const fourMix = fourResult.value.materials.reduce((sum, step) => sum + step.cents, 0);
    const fiveMix = fiveResult.value.materials.reduce((sum, step) => sum + step.cents, 0);
    expect(fiveMix).toBeGreaterThan(fourMix);
    expect(fiveResult.value.range?.expectedCents).toBe(
      handExpectedCents('concrete-driveway', 400, { thickness: 'five', finish: 'broom', access: 'normal' }, driveDatasets, fiveInch.materialFactors),
    );

    const pumpDatasets = await dallasDatasets('heat-pump-replacement');
    const pumpDefaults = defaultModifiers('heat-pump-replacement');
    const pumpThree = calculateJobEstimate({
      jobId: 'heat-pump-replacement',
      zip: ZIP,
      units: 1,
      modifiers: pumpDefaults,
      materialFactors: { 'air-source-heat-pump': 1 },
    }, pumpDatasets);
    const pumpFour = calculateJobEstimate({
      jobId: 'heat-pump-replacement',
      zip: ZIP,
      units: 1,
      modifiers: pumpDefaults,
      materialFactors: { 'air-source-heat-pump': 4 / 3 },
    }, pumpDatasets);
    expect(pumpThree.value.status).toBe('complete');
    const pumpThreeMaterials = pumpThree.value.materials.reduce((sum, step) => sum + step.cents, 0);
    const pumpFourMaterials = pumpFour.value.materials.reduce((sum, step) => sum + step.cents, 0);
    expect(pumpFourMaterials).toBeGreaterThan(pumpThreeMaterials);
  });

  it('returns a golden for every recipe against the same hand formula', async () => {
    for (const jobId of JOB_IDS) {
      const datasets = await dallasDatasets(jobId);
      const modifiers = defaultModifiers(jobId);
      const resolved = resolveJobScope(jobId, defaultScopeFields(jobId), modifiers);
      const result = calculateJobEstimate({
        jobId,
        zip: ZIP,
        units: resolved.units,
        modifiers,
        materialFactors: resolved.materialFactors,
      }, datasets);
      const expected = handExpectedCents(jobId, resolved.units, modifiers, datasets, resolved.materialFactors);
      const pricedMaterials = priceMaterials(getRecipe(jobId), resolved.units, datasets.basket, datasets.ppi, resolved.materialFactors);
      expect(pricedMaterials.unpricedCritical, jobId).toEqual([]);
      expect(result.value.status, jobId).toBe('complete');
      expect(result.value.range?.expectedCents, jobId).toBe(expected);
      expect(Math.abs(reconstructCents(result.value) - expected), jobId).toBeLessThanOrEqual(100);
    }
  });

  it('prices electric water heaters from the EIA electric tank, not a lump discount on gas', async () => {
    const datasets = await dallasDatasets('water-heater-replacement');
    const gasScope = resolveJobScope('water-heater-replacement', { units: 1 }, { fuel: 'gas', location: 'garage', code: 'like-for-like' });
    const electricScope = resolveJobScope('water-heater-replacement', { units: 1 }, { fuel: 'electric', location: 'garage', code: 'like-for-like' });
    const gas = calculateJobEstimate({
      jobId: 'water-heater-replacement',
      zip: ZIP,
      units: 1,
      modifiers: { fuel: 'gas', location: 'garage', code: 'like-for-like' },
      materialFactors: gasScope.materialFactors,
    }, datasets);
    const electric = calculateJobEstimate({
      jobId: 'water-heater-replacement',
      zip: ZIP,
      units: 1,
      modifiers: { fuel: 'electric', location: 'garage', code: 'like-for-like' },
      materialFactors: electricScope.materialFactors,
    }, datasets);
    expect(gas.value.status).toBe('complete');
    expect(electric.value.status).toBe('complete');
    const gasMaterials = gas.value.materials.reduce((sum, step) => sum + step.cents, 0);
    const electricMaterials = electric.value.materials.reduce((sum, step) => sum + step.cents, 0);
    expect(electricMaterials).toBeLessThan(gasMaterials);
    expect(gas.value.materials.some((step) => /gas tank/i.test(step.label))).toBe(true);
    expect(electric.value.materials.some((step) => /electric tank/i.test(step.label))).toBe(true);
  });

  it('still selects the electric tank when materialFactors is omitted or empty', async () => {
    const datasets = await dallasDatasets('water-heater-replacement');
    const modifiers = { fuel: 'electric', location: 'garage', code: 'like-for-like' };
    const omitted = calculateJobEstimate({ jobId: 'water-heater-replacement', zip: ZIP, units: 1, modifiers }, datasets);
    const empty = calculateJobEstimate({
      jobId: 'water-heater-replacement',
      zip: ZIP,
      units: 1,
      modifiers,
      materialFactors: {},
    }, datasets);
    expect(omitted.value.status).toBe('complete');
    expect(empty.value.status).toBe('complete');
    expect(omitted.value.materials.some((step) => /electric tank/i.test(step.label))).toBe(true);
    expect(omitted.value.materials.some((step) => /gas tank/i.test(step.label))).toBe(false);
    expect(empty.value.materials.map((step) => step.label)).toEqual(omitted.value.materials.map((step) => step.label));
    expect(empty.value.range?.expectedCents).toBe(omitted.value.range?.expectedCents);
  });

  it('scales 4 ft wood fence materials off the 6 ft package', async () => {
    const datasets = await dallasDatasets('fence-install');
    const wood = resolveJobScope('fence-install', { units: 150 }, { height: 'six', slope: 'flat', gates: 'one' });
    const four = resolveJobScope('fence-install', { units: 150 }, { height: 'four', slope: 'flat', gates: 'one' });
    const woodResult = calculateJobEstimate({
      jobId: 'fence-install',
      zip: ZIP,
      units: 150,
      modifiers: { height: 'six', slope: 'flat', gates: 'one' },
      materialFactors: wood.materialFactors,
    }, datasets);
    const fourResult = calculateJobEstimate({
      jobId: 'fence-install',
      zip: ZIP,
      units: 150,
      modifiers: { height: 'four', slope: 'flat', gates: 'one' },
      materialFactors: four.materialFactors,
    }, datasets);
    expect(woodResult.value.status).toBe('complete');
    expect(fourResult.value.status).toBe('complete');
    const woodMaterials = woodResult.value.materials.reduce((sum, step) => sum + step.cents, 0);
    const fourMaterials = fourResult.value.materials.reduce((sum, step) => sum + step.cents, 0);
    expect(fourMaterials / woodMaterials).toBeCloseTo(4 / 6, 5);
  });

  it('converts window count into glazing area', async () => {
    const defaults = { stories: 'one', removal: 'standard', access: 'normal' };
    const eight = resolveJobScope('window-replacement', { windows: 8, typicalWindowSqFt: 15 }, defaults);
    expect(eight.units).toBe(120);
    expect(eight.note).toMatch(/120/);
    const api = resolveJobScope('window-replacement', { units: 120 }, defaults);
    expect(api.units).toBe(120);
    const smallest = toJobEstimateInput('window-replacement', ZIP, defaults, { windows: 1, typicalWindowSqFt: 6 });
    const largest = toJobEstimateInput('window-replacement', ZIP, defaults, { windows: 40, typicalWindowSqFt: 40 });
    expect(smallest.units).toBe(6);
    expect(largest.units).toBe(1600);
    expect(getRecipe('exterior-door-replacement').materials.every((line) => line.quantityPerUnit.value === 20)).toBe(true);

    const datasets = await dallasDatasets('window-replacement');
    const smallEstimate = calculateJobEstimate(smallest, datasets);
    const largeEstimate = calculateJobEstimate(largest, datasets);
    expect(smallEstimate.value.status).toBe('complete');
    expect(largeEstimate.value.status).toBe('complete');
    expect(largeEstimate.value.range?.expectedCents ?? 0).toBeGreaterThan(smallEstimate.value.range?.expectedCents ?? 0);
  });

  it('prices door and siding material lines, not a lump discount', async () => {
    const doorDatasets = await dallasDatasets('exterior-door-replacement');
    const fiberglass = resolveJobScope('exterior-door-replacement', { units: 1 }, { material: 'fiberglass', access: 'normal', hardware: 'reuse' });
    const wood = resolveJobScope('exterior-door-replacement', { units: 1 }, { material: 'wood', access: 'normal', hardware: 'reuse' });
    const fiberglassResult = calculateJobEstimate({
      jobId: 'exterior-door-replacement',
      zip: ZIP,
      units: 1,
      modifiers: { material: 'fiberglass', access: 'normal', hardware: 'reuse' },
      materialFactors: fiberglass.materialFactors,
    }, doorDatasets);
    const woodResult = calculateJobEstimate({
      jobId: 'exterior-door-replacement',
      zip: ZIP,
      units: 1,
      modifiers: { material: 'wood', access: 'normal', hardware: 'reuse' },
      materialFactors: wood.materialFactors,
    }, doorDatasets);
    expect(fiberglassResult.value.status).toBe('complete');
    expect(woodResult.value.status).toBe('complete');
    expect(fiberglassResult.value.materials.some((step) => /fiberglass/i.test(step.label))).toBe(true);
    expect(woodResult.value.materials.some((step) => /wood prehung/i.test(step.label))).toBe(true);
    expect(woodResult.value.materials.reduce((sum, step) => sum + step.cents, 0))
      .toBeGreaterThan(fiberglassResult.value.materials.reduce((sum, step) => sum + step.cents, 0));

    const omitted = calculateJobEstimate({
      jobId: 'exterior-door-replacement',
      zip: ZIP,
      units: 1,
      modifiers: { material: 'metal', access: 'normal', hardware: 'reuse' },
    }, doorDatasets);
    expect(omitted.value.status).toBe('complete');
    expect(omitted.value.materials.some((step) => /metal prehung/i.test(step.label))).toBe(true);
    expect(omitted.value.materials.some((step) => /fiberglass/i.test(step.label))).toBe(false);

    const sidingDatasets = await dallasDatasets('siding-replacement');
    const vinyl = resolveJobScope('siding-replacement', { units: 1200 }, { material: 'vinyl', stories: 'one', access: 'normal' });
    const woodSiding = resolveJobScope('siding-replacement', { units: 1200 }, { material: 'wood', stories: 'one', access: 'normal' });
    const vinylResult = calculateJobEstimate({
      jobId: 'siding-replacement',
      zip: ZIP,
      units: 1200,
      modifiers: { material: 'vinyl', stories: 'one', access: 'normal' },
      materialFactors: vinyl.materialFactors,
    }, sidingDatasets);
    const woodSidingResult = calculateJobEstimate({
      jobId: 'siding-replacement',
      zip: ZIP,
      units: 1200,
      modifiers: { material: 'wood', stories: 'one', access: 'normal' },
      materialFactors: woodSiding.materialFactors,
    }, sidingDatasets);
    expect(vinylResult.value.status).toBe('complete');
    expect(woodSidingResult.value.status).toBe('complete');
    expect(woodSidingResult.value.materials.reduce((sum, step) => sum + step.cents, 0))
      .toBeGreaterThan(vinylResult.value.materials.reduce((sum, step) => sum + step.cents, 0));
  });

  it('names every non-identity modifier as a breakdown step', async () => {
    const datasets = await dallasDatasets('tree-removal');
    const modifiers = {
      height: 'large',
      proximity: 'near',
      access: 'normal',
      stump: 'leave',
    };
    const result = calculateJobEstimate({ jobId: 'tree-removal', zip: ZIP, units: 1, modifiers }, datasets);
    const labels = result.breakdown.map((step) => step.label);
    expect(labels.some((label) => /Height: Over 60 ft/.test(label))).toBe(true);
    expect(labels.some((label) => /Near structures: Near a house/.test(label))).toBe(true);
    expect(result.breakdown.some((step) => /unnamed/i.test(step.label))).toBe(false);
    expect(Math.abs(reconstructCents(result.value) - (result.value.range?.expectedCents ?? reconstructCents(result.value)))).toBeLessThanOrEqual(100);
  });

  it('does not multiply BEA RPP into materials', async () => {
    const source = readFileSync(join(ROOT, 'lib/job/materials.ts'), 'utf8');
    expect(source).toMatch(/RPP is never applied/);
    expect(source).not.toMatch(/rppAllItems|bea-rpp|getBeaStateRpp/);
    expect(source).not.toMatch(/bea/i);

    const base = await dallasDatasets('deck-build');
    const basket: MaterialBasketSnapshot = {
      snapshotId: 'test-basket',
      datasetId: 'material-basket',
      observationPeriod: '2026-01',
      fetchedAt: '2026-09-07T00:00:00.000Z',
      publishedAt: '2026-09-07T00:00:00.000Z',
      attribution: 'test',
      normalizedSha256: 'test',
      components: [{
        componentId: 'pressure-treated-lumber',
        unit: 'sq-ft',
        qualityTier: 'builder',
        baselinePriceCents: 12_000,
        baselineDate: '2026-01-01',
        baselineSource: { name: 'test procurement', url: 'https://example.gov' },
        ppiSeriesId: 'WPU081',
        regionalAdjustment: 'none',
        critical: true,
      }],
    };
    const low: JobDatasets = { ...base, basket, rppAllItems: 80 };
    const high: JobDatasets = { ...base, basket, rppAllItems: 130 };
    const defaults = Object.fromEntries(JOB_CATALOG['deck-build'].modifiers.map((modifier) => [modifier.id, modifier.defaultOptionId]));
    const input = { jobId: 'deck-build' as const, zip: ZIP, units: 200, modifiers: defaults };
    const left = calculateJobEstimate(input, low);
    const right = calculateJobEstimate(input, high);
    const leftMaterials = left.value.materials.reduce((sum, step) => sum + step.cents, 0);
    const rightMaterials = right.value.materials.reduce((sum, step) => sum + step.cents, 0);
    expect(leftMaterials).toBeGreaterThan(0);
    expect(leftMaterials).toBe(rightMaterials);
    expect(() => priceMaterials(getRecipe('deck-build'), 1, {
      ...basket,
      components: [{ ...basket.components[0], regionalAdjustment: 'bea-rpp' as unknown as 'none' }],
    }, base.ppi)).toThrow(/regional adjustment/i);
  });

  it('blocks a complete range and quote verdict when a critical material is missing', async () => {
    const datasets = await dallasDatasets('deck-build');
    const defaults = Object.fromEntries(JOB_CATALOG['deck-build'].modifiers.map((modifier) => [modifier.id, modifier.defaultOptionId]));
    const empty: JobDatasets = {
      ...datasets,
      basket: datasets.basket ? { ...datasets.basket, components: [] } : datasets.basket,
    };
    const quote = checkJobQuote({
      jobId: 'deck-build',
      zip: ZIP,
      units: 200,
      modifiers: defaults,
      contractorQuoteCents: 14_800_00,
    }, empty);
    expect(quote.value.estimate.status).toBe('incomplete');
    expect(quote.value.estimate.unpricedCritical).toContain('pressure-treated-lumber');
    expect(quote.value.verdict).toBe('outside what we can assess');
    expect(quote.value.reasonsAHigherQuoteCanBeCorrect).toEqual([]);
  });

  it('returns each of the six fixed verdicts and at least three reasons when above', async () => {
    const datasets = await dallasDatasets('tree-removal');
    const defaults = Object.fromEntries(JOB_CATALOG['tree-removal'].modifiers.map((modifier) => [modifier.id, modifier.defaultOptionId]));
    const complete = calculateJobEstimate({ jobId: 'tree-removal', zip: ZIP, units: 1, modifiers: defaults }, datasets);
    expect(complete.value.range).not.toBeNull();
    const { lowCents, highCents } = complete.value.range!;
    const span = highCents - lowCents;
    const cases: Array<{ quote: number; verdict: QuoteVerdict }> = [
      { quote: Math.max(0, lowCents - 10_000), verdict: 'below our estimated range' },
      { quote: lowCents, verdict: 'at the low end' },
      { quote: lowCents + Math.round(span / 2), verdict: 'within our estimated range' },
      { quote: highCents, verdict: 'at the high end' },
      { quote: highCents + 10_000, verdict: 'above our estimated range' },
    ];
    for (const { quote, verdict } of cases) {
      const checked = checkJobQuote({
        jobId: 'tree-removal',
        zip: ZIP,
        units: 1,
        modifiers: defaults,
        contractorQuoteCents: quote,
      }, datasets);
      expect(checked.value.verdict, verdict).toBe(verdict);
      if (verdict === 'above our estimated range' || verdict === 'at the high end') {
        expect(checked.value.reasonsAHigherQuoteCanBeCorrect.length).toBeGreaterThanOrEqual(3);
        expect(checked.value.reasonsAHigherQuoteCanBeCorrect).toEqual([...ABOVE_RANGE_REASONS]);
      }
    }
  });

  it('keeps calibration a pass-through in V1', async () => {
    const datasets = await dallasDatasets('tree-removal');
    const defaults = Object.fromEntries(JOB_CATALOG['tree-removal'].modifiers.map((modifier) => [modifier.id, modifier.defaultOptionId]));
    const estimate = calculateJobEstimate({ jobId: 'tree-removal', zip: ZIP, units: 1, modifiers: defaults }, datasets).value;
    expect(calibrate(estimate, [])).toBe(estimate);
    expect(() => calibrate(estimate, [{ kind: 'permit-valuation', label: 'test', deltaCents: 100 }])).toThrow(/wave 2/i);
  });

  it('keeps ECEC, PPI, FEMA, and the basket in tier 2', () => {
    expect(readStoreJsonSync<EcecSnapshot>('bls-ecec')?.datasetId).toBe('bls-ecec');
    expect(readStoreJsonSync<PpiSnapshot>('bls-ppi')?.datasetId).toBe('bls-ppi');
    expect(readStoreJsonSync<FemaEquipmentSnapshot>('fema-equipment')?.rates.length).toBeGreaterThan(0);
    const basket = readStoreJsonSync<MaterialBasketSnapshot>('job-material-basket');
    const priced = (basket?.components ?? []).map((component) => component.componentId);
    expect(priced).toEqual(expect.arrayContaining([
      'split-system',
      'air-source-heat-pump',
      'tank-water-heater',
      'tank-water-heater-electric',
      'service-panel-200a',
      'vinyl-window',
      'exterior-door-fiberglass',
      'exterior-door-metal',
      'exterior-door-wood',
      'vinyl-siding',
      'wood-siding',
      'drywall-board',
      'ready-mix-concrete',
      'interior-paint',
      'pressure-treated-lumber',
      'wood-privacy-fence',
      'bath-tile',
      'toilet',
      'vanity',
    ]));
    expect(priced).not.toContain('asphalt-shingles');
    expect(priced).not.toContain('chain-link-fence');
    expect(basket?.snapshotId).toBe('material-basket-sourced-v4');
    const centsById = Object.fromEntries((basket?.components ?? []).map((component) => [component.componentId, component.baselinePriceCents]));
    expect(centsById['air-source-heat-pump']).toBe(427_000);
    expect(centsById['vinyl-window']).toBe(5_411);
    expect(centsById['exterior-door-fiberglass']).toBe(5_549);
    expect(centsById['exterior-door-metal']).toBe(4_199);
    expect(centsById['exterior-door-wood']).toBe(7_729);
    expect(centsById['vinyl-siding']).toBe(698);
    expect(centsById['wood-siding']).toBe(811);
    expect(centsById['drywall-board']).toBe(49);
    for (const recipe of listRecipes()) {
      for (const line of recipe.materials) {
        expect(priced, `${recipe.jobId}:${line.componentId}`).toContain(line.componentId);
      }
    }
    for (const component of basket?.components ?? []) {
      expect(component.baselinePriceCents).toBeGreaterThan(0);
      expect(component.regionalAdjustment).toBe('none');
      expect(component.baselineSource.url).toMatch(/^https:\/\//);
    }
  });

  // I/O-bound source scan; see the note in tests/data-store.spec.ts.
  it('forbids accusatory vocabulary and “normal range” in job code', { timeout: 30_000 }, () => {
    const files = [...walk(join(ROOT, 'lib', 'job')), ...walk(join(ROOT, 'components', 'job'))];
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN) {
        if (pattern.test(source)) offenders.push(`${relative(ROOT, file)} matches ${pattern}`);
      }
      if (NORMAL_RANGE.test(source)) offenders.push(`${relative(ROOT, file)} says normal range`);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps client job UI off the engine and the store', () => {
    const banned = ['lib/job/estimate', 'lib/job/labor', 'lib/job/location', 'lib/job/recipes', 'lib/job/server-datasets', 'lib/data/store'];
    const offenders: string[] = [];
    for (const file of walk(join(ROOT, 'components', 'job'))) {
      const source = readFileSync(file, 'utf8');
      if (!source.includes("'use client'")) continue;
      for (const fragment of banned) {
        if (source.includes(fragment)) offenders.push(`${relative(ROOT, file)} imports ${fragment}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('submits the cost family when the publication gate is open', () => {
    expect(isCostLevelIndexable('familyHub')).toBe(true);
    const paths = new Set(getSitemapFamilies().cost.map((entry) => entry.path));
    for (const path of costFamilySitemapPaths()) expect(paths.has(path)).toBe(true);
    expect(paths.has('/cost/hvac-replacement')).toBe(true);
    expect(paths.has('/cost/not-a-real-job')).toBe(false);
  });

  it('keeps removed roof and chain-link jobs out of search and the sitemap', () => {
    expect((JOB_IDS as readonly string[]).includes('roof-replacement')).toBe(false);
    const index = jobSearchIndex();
    expect(index).toHaveLength(14);
    expect(index.some((entry) => entry.path.includes('roof'))).toBe(false);
    const haystack = index.flatMap((entry) => [...entry.terms, entry.name.toLowerCase()]).join(' ');
    expect(haystack).not.toMatch(/roof|shingle|chain.?link/);
    const family = costFamilySitemapPaths();
    for (const jobId of JOB_IDS) expect(family).toContain(jobPath(jobId));
    expect(family).not.toContain('/cost/roof-replacement');
  });
});

describe('job titles inside a sentence', () => {
  it('lowers ordinary words and leaves acronyms alone', () => {
    // The heading on the page meant to rank for HVAC replacement cost used to
    // read "What should hvac replacement cost?".
    expect(jobTitleInSentence('hvac-replacement')).toBe('HVAC replacement');
    expect(jobTitleInSentence('water-heater-replacement')).toBe('water heater');
    expect(jobTitleInSentence('tree-removal')).toBe('tree removal');
  });

  it('never leaves a job reading as a proper noun mid-sentence', () => {
    for (const jobId of JOB_IDS) {
      const sentence = jobTitleInSentence(jobId);
      for (const word of sentence.split(' ')) {
        const isAcronym = /[A-Z].*[A-Z]/.test(word);
        expect(isAcronym || word === word.toLowerCase(), `${jobId}: ${word}`).toBe(true);
      }
    }
  });
});
