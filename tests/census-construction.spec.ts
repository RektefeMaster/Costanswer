import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCensusConstructionSnapshot } from '@/scripts/ingest-census-construction';
import { JOB_IDS, JOB_CATALOG, type JobId } from '@/lib/job/catalog';
import { JOB_INDUSTRY, priceBusinessCost } from '@/lib/job/business-rates';
import { calculateJobEstimate } from '@/lib/job/estimate';
import { locateJobZip } from '@/lib/job/location';
import { getRecipe } from '@/lib/job/recipes';
import { loadJobDatasets } from '@/lib/job/server-datasets';
import { readStoreJsonSync } from '@/lib/data/store';
import type { CensusConstructionSnapshot, JobDatasets } from '@/lib/job/types';

const ROOT = process.cwd();
const ZIP = '75201';

const snapshot = readStoreJsonSync<CensusConstructionSnapshot>('census-construction');

function defaults(jobId: JobId): Record<string, string> {
  return Object.fromEntries(JOB_CATALOG[jobId].modifiers.map((modifier) => [modifier.id, modifier.defaultOptionId]));
}

async function dallasDatasets(jobId: JobId): Promise<JobDatasets> {
  const location = locateJobZip(ZIP)!;
  return loadJobDatasets(jobId, location.state, location.countyGeoid.slice(0, 2));
}

describe('Economic Census construction snapshot', () => {
  it('is on disk and rebuilds byte-identically from the retained extract', () => {
    expect(snapshot).not.toBeNull();
    const extract = readFileSync(join(ROOT, 'data/census-construction/raw/ec2022-sector23-national.psv'), 'utf8');
    const rebuilt = buildCensusConstructionSnapshot(extract, snapshot!.fetchedAt);
    expect(rebuilt.normalizedSha256).toBe(snapshot!.normalizedSha256);
  });

  it('splits every industry into direct, overhead and residual profit that sum to one', () => {
    for (const industry of snapshot!.industries) {
      const total = industry.directShare + industry.overheadShare + industry.profitShare;
      expect(Math.abs(total - 1), industry.naics).toBeLessThan(0.001);
      expect(industry.directShare, industry.naics).toBeGreaterThan(0.5);
      expect(industry.directShare, industry.naics).toBeLessThan(0.85);
      expect(industry.profitShare, industry.naics).toBeGreaterThan(0);
    }
  });

  it('keeps the multiplier and the average wage inside believable bounds', () => {
    for (const industry of snapshot!.industries) {
      expect(industry.directToPriceMultiplier, industry.naics).toBeCloseTo(1 / industry.directShare, 2);
      expect(industry.directToPriceMultiplier, industry.naics).toBeGreaterThan(1.2);
      expect(industry.directToPriceMultiplier, industry.naics).toBeLessThan(2);
      expect(industry.averageConstructionWorkerHourlyWage, industry.naics).toBeGreaterThan(15);
      expect(industry.averageConstructionWorkerHourlyWage, industry.naics).toBeLessThan(60);
    }
  });

  it('rejects an extract whose shares no longer reconcile', () => {
    const extract = readFileSync(join(ROOT, 'data/census-construction/raw/ec2022-sector23-national.psv'), 'utf8');
    const lines = extract.split('\n');
    const header = lines[0].replace(/^#/, '').split('|');
    const materialsAt = header.indexOf('CSTMPRT');
    expect(materialsAt).toBeGreaterThan(-1);
    const broken = lines.map((line, index) => {
      if (index === 0 || line.trim() === '') return line;
      const cells = line.split('|');
      cells[materialsAt] = String(Number(cells[materialsAt]) * 40);
      return cells.join('|');
    }).join('\n');
    expect(() => buildCensusConstructionSnapshot(broken, snapshot!.fetchedAt)).toThrow();
  });
});

describe('observed contractor business cost', () => {
  it('decides for every job whether the census describes its trade', () => {
    for (const jobId of JOB_IDS) {
      expect(Object.prototype.hasOwnProperty.call(JOB_INDUSTRY, jobId), jobId).toBe(true);
      const mapping = JOB_INDUSTRY[jobId];
      if (!mapping) continue;
      const industry = snapshot!.industries.find((row) => row.naics === mapping.naics);
      expect(industry, `${jobId} maps to NAICS ${mapping.naics}`).toBeDefined();
    }
  });

  it('explains every mapping that is not an exact trade match', () => {
    for (const [jobId, mapping] of Object.entries(JOB_INDUSTRY)) {
      if (!mapping?.note) continue;
      expect(mapping.note.length, jobId).toBeGreaterThan(40);
    }
  });

  it('takes overhead and profit as shares of price, not as a markup on cost', () => {
    const recipe = getRecipe('hvac-replacement');
    const rates = priceBusinessCost({ recipe, jobId: 'hvac-replacement', directCents: 1_000_000, census: snapshot });
    const industry = snapshot!.industries.find((row) => row.naics === '238220')!;
    const price = 1_000_000 + rates.overhead.cents + rates.profit.cents;
    expect(rates.source).toBe('census-observed');
    expect(price / 1_000_000).toBeCloseTo(industry.directToPriceMultiplier, 3);
    expect(rates.overhead.cents / price).toBeCloseTo(industry.overheadShare, 3);
    // A 33.5% share of price is not a 33.5% markup on cost; the gap is the bug this replaced.
    expect(rates.overhead.cents + rates.profit.cents).toBeGreaterThan(1_000_000 * (industry.overheadShare + industry.profitShare));
  });

  it('drops the contingency allowance only when the observed share is used', () => {
    const observed = priceBusinessCost({ recipe: getRecipe('hvac-replacement'), jobId: 'hvac-replacement', directCents: 500_000, census: snapshot });
    expect(observed.contingencyRate).toBeNull();
    const modelled = priceBusinessCost({ recipe: getRecipe('tree-removal'), jobId: 'tree-removal', directCents: 500_000, census: snapshot });
    expect(modelled.source).toBe('recipe-modeled');
    expect(modelled.contingencyRate).toBe(getRecipe('tree-removal').contingencyRate.value);
  });

  it('falls back to the recipe when the snapshot is missing, and says which it used', () => {
    const rates = priceBusinessCost({ recipe: getRecipe('hvac-replacement'), jobId: 'hvac-replacement', directCents: 500_000, census: null });
    expect(rates.source).toBe('recipe-modeled');
    expect(rates.notes.join(' ')).toMatch(/not in the loaded census snapshot/);
    expect(rates.snapshotId).toBeNull();
  });

  it('never returns a negative overhead or profit line, even at a cent of direct cost', () => {
    for (const jobId of JOB_IDS) {
      for (const directCents of [1, 2, 7, 99, 100_000]) {
        const rates = priceBusinessCost({ recipe: getRecipe(jobId), jobId, directCents, census: snapshot });
        expect(rates.overhead.cents, `${jobId} at ${directCents}`).toBeGreaterThanOrEqual(0);
        expect(rates.profit.cents, `${jobId} at ${directCents}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('prices fourteen of the fifteen jobs from the census and names the exception', async () => {
    const sources: Array<{ jobId: JobId; source: string }> = [];
    for (const jobId of JOB_IDS) {
      const datasets = await dallasDatasets(jobId);
      const estimate = calculateJobEstimate({ jobId, zip: ZIP, units: 1, modifiers: defaults(jobId) }, datasets).value;
      sources.push({ jobId, source: estimate.businessCostSource });
    }
    const modelled = sources.filter((row) => row.source === 'recipe-modeled').map((row) => row.jobId);
    expect(modelled).toEqual(['tree-removal']);
  });

  it('carries the census snapshot id and its caveat into the estimate a reader sees', async () => {
    const datasets = await dallasDatasets('interior-painting');
    const result = calculateJobEstimate({ jobId: 'interior-painting', zip: ZIP, units: 400, modifiers: defaults('interior-painting') }, datasets);
    expect(result.value.snapshotIds).toContain(snapshot!.snapshotId);
    expect(result.value.overhead.detail).toMatch(/Economic Census/);
    expect(result.value.profitMarkup.detail).toMatch(/residual, not a reported margin/);
    expect(result.value.contingency).toBeNull();
    expect(result.assumptions.join(' ')).toMatch(/not this contractor and not this job/);
    expect(result.value.confidenceReasons.join(' ')).toMatch(/not a CostAnswer assumption/);
  });

  it('leaves a permit or disposal pass-through outside the business markup', async () => {
    /*
     * A permit fee is the same number whoever files it, and the census counts
     * licences inside the overhead it already measures. So the business cost is
     * a function of the priced work alone: adding a fee to the recipe must not
     * move overhead or profit by a cent.
     */
    const datasets = await dallasDatasets('window-replacement');
    const recipe = getRecipe('window-replacement');
    const withFee = {
      ...recipe,
      permit: { kind: 'flat' as const, amountCents: { value: 25_000, sourceId: 'qty' } },
      disposal: { kind: 'flat' as const, amountCents: { value: 40_000, sourceId: 'qty' } },
    };
    const direct = 400_000;
    const plain = priceBusinessCost({ recipe, jobId: 'window-replacement', directCents: direct, census: datasets.census });
    const feed = priceBusinessCost({ recipe: withFee, jobId: 'window-replacement', directCents: direct, census: datasets.census });
    expect(feed.overhead.cents).toBe(plain.overhead.cents);
    expect(feed.profit.cents).toBe(plain.profit.cents);

    // And the engine adds those pass-throughs at face value, not marked up.
    const estimate = calculateJobEstimate(
      { jobId: 'window-replacement', zip: ZIP, units: 10, modifiers: defaults('window-replacement') },
      datasets,
    ).value;
    const priced = [...estimate.labor, ...estimate.materials, ...estimate.equipment].reduce((sum, step) => sum + step.cents, 0);
    const total = priced + estimate.overhead.cents + estimate.profitMarkup.cents
      + (estimate.permit?.cents ?? 0) + (estimate.disposal?.cents ?? 0);
    expect(Math.abs(total - (estimate.range?.expectedCents ?? 0))).toBeLessThanOrEqual(1);
  });

  it('raises the priced total against the flat assumption it replaced', async () => {
    const datasets = await dallasDatasets('interior-painting');
    const recipe = getRecipe('interior-painting');
    const direct = 1_000_000;
    const observed = priceBusinessCost({ recipe, jobId: 'interior-painting', directCents: direct, census: datasets.census });
    const modelledMultiplier = (1 + recipe.overheadRate.value)
      * (1 + recipe.profitMarkupRate.value)
      * (1 + recipe.contingencyRate.value);
    const observedTotal = direct + observed.overhead.cents + observed.profit.cents;
    expect(observedTotal).toBeGreaterThan(direct * modelledMultiplier);
  });
});
