/**
 * Job × state landing pages.
 *
 * Materials stay national. The only place-specific driver is OEWS trade wages,
 * so a state page opens only when that state's crew wage bill differs from the
 * national bill by more than the recipe's confidence band (§J.3).
 */
import { getOewsEstimate } from '@/lib/data/bls-oews-snapshot';
import { geographySnapshot } from '@/lib/data/geography-snapshot';
import { zctaCountySnapshot } from '@/lib/data/zcta-county-snapshot';
import { STATE_CODES, type StateCode } from '@/lib/location/states';
import { stateFromSlug, stateSlug } from '@/lib/salary-pages';
import { JOB_IDS, jobPath, type JobId, isJobId } from './catalog';
import { confidenceBand } from './confidence';
import { getRecipe } from './recipes';
import type { ConfidenceLevel } from '@/lib/calculators/depth';

/** Sync publication gate for `/cost/:job/:state`. */
export const COST_STATE_PUBLICATION: 'indexable' | 'staged' = 'indexable';

export function jobInStatePath(jobId: JobId, state: StateCode): `/${string}` {
  return `${jobPath(jobId)}/${stateSlug(state)}`;
}

export function jobIdFromSegment(segment: string): JobId | undefined {
  return isJobId(segment) ? segment : undefined;
}

export function costStateFromSlug(slug: string): StateCode | undefined {
  return stateFromSlug(slug);
}

function recipeConfidenceFloor(jobId: JobId): ConfidenceLevel {
  const recipe = getRecipe(jobId);
  if (recipe.trade === 'multi') return 'low';
  return recipe.baseConfidence;
}

/**
 * Weighted crew wage bill: hours × headcount × median hourly.
 * Materials cancel out of the ratio, so this is the measurable state signal.
 */
export function jobCrewWageBill(jobId: JobId, area: 'US' | StateCode): number | null {
  const recipe = getRecipe(jobId);
  let total = 0;
  for (const member of recipe.crew) {
    const estimate = getOewsEstimate(area, member.socCode);
    const hourly = estimate?.hourly.median ?? estimate?.hourlyMean ?? null;
    if (hourly == null || hourly <= 0) {
      if (area === 'US') return null;
      const national = getOewsEstimate('US', member.socCode);
      const nationalHourly = national?.hourly.median ?? national?.hourlyMean ?? null;
      if (nationalHourly == null || nationalHourly <= 0) return null;
      total += member.count.value * recipe.laborHoursPerUnit.value * nationalHourly;
      continue;
    }
    total += member.count.value * recipe.laborHoursPerUnit.value * hourly;
  }
  return total;
}

export function jobStateWageRatio(jobId: JobId, state: StateCode): number | null {
  const national = jobCrewWageBill(jobId, 'US');
  const local = jobCrewWageBill(jobId, state);
  if (national == null || local == null || national <= 0) return null;
  return local / national;
}

/**
 * True when state trade wages move the modeled answer outside the recipe band.
 */
export function costStateLeafIsOpen(jobId: JobId, state: StateCode): boolean {
  if (COST_STATE_PUBLICATION === 'staged') return false;
  const ratio = jobStateWageRatio(jobId, state);
  if (ratio == null) return false;
  const band = confidenceBand(recipeConfidenceFloor(jobId), 0);
  return ratio < band.low || ratio > band.high;
}

export function openCostStateLeaves(): Array<{ jobId: JobId; state: StateCode }> {
  const pairs: Array<{ jobId: JobId; state: StateCode }> = [];
  for (const jobId of JOB_IDS) {
    for (const state of STATE_CODES) {
      if (costStateLeafIsOpen(jobId, state)) pairs.push({ jobId, state });
    }
  }
  return pairs;
}

export function openStatesForJob(jobId: JobId): StateCode[] {
  return STATE_CODES.filter((state) => costStateLeafIsOpen(jobId, state));
}

let zipByState: Map<StateCode, string> | undefined;

/**
 * Any ZCTA that lands in the state — enough to run the ZIP locator for a
 * precomputed default-scope estimate on the landing page.
 */
export function representativeZipForState(state: StateCode): string | null {
  if (!zipByState) {
    const countyState = new Map(geographySnapshot.counties.map((county) => [county.geoid, county.state as StateCode]));
    const map = new Map<StateCode, string>();
    for (const area of zctaCountySnapshot.areas) {
      const geoid = area.countyGeoids[0];
      if (!geoid) continue;
      const code = countyState.get(geoid);
      if (!code || map.has(code)) continue;
      map.set(code, area.zcta);
    }
    zipByState = map;
  }
  return zipByState.get(state) ?? null;
}
