/**
 * Runtime access to the OEWS release.
 *
 * Two files travel with the application: the index, which names the occupations
 * and says which of them each state published a wage for, and the wages, whose
 * 37,249 rows are packed into integer columns. A row of objects costs 12 MB and
 * would not fit in a Worker; the same numbers as columns cost 2.7 MB, and the
 * ingest proves the packing lossless on every value before writing it.
 *
 * Coverage is the useful part at request time: it says which occupation and
 * state pairs BLS actually published a wage for, so a route can refuse a
 * combination before it reads a wage and no page is ever built around a
 * suppressed estimate.
 */
import oewsIndexJson from '@/data/bls-oews/index.json';
import oewsWagesJson from '@/data/bls-oews/wages.json';
import { isStateCode, type StateCode } from '@/lib/location/states';
import {
  findOewsRow,
  unpackOewsEstimate,
  type BlsOewsIndex,
  type BlsOewsWages,
  type OewsAreaId,
  type OewsEstimate,
  type OewsOccupation,
} from './bls-oews';

export const oewsIndex = oewsIndexJson as unknown as BlsOewsIndex;
const oewsWages = oewsWagesJson as unknown as BlsOewsWages;

if (oewsWages.snapshotId !== oewsIndex.snapshotId) {
  throw new Error('The bundled OEWS index and wage columns come from different releases.');
}

export const oewsManifest = {
  currentSnapshotId: oewsIndex.snapshotId,
  observationPeriod: oewsIndex.observationPeriod,
  normalizedSha256: oewsIndex.normalizedSha256,
  validationStatus: 'passed' as const,
};

export const oewsOccupations = oewsIndex.occupations;

const byCode = new Map(oewsOccupations.map((occupation) => [occupation.code, occupation]));
const positionByCode = new Map(oewsOccupations.map((occupation, position) => [occupation.code, position]));
const bySlug = new Map(oewsOccupations.map((occupation) => [occupation.slug, occupation]));

export function getOewsOccupation(code: string): OewsOccupation | undefined {
  return byCode.get(code);
}

export function getOewsOccupationBySlug(slug: string): OewsOccupation | undefined {
  return bySlug.get(slug);
}

function coverageIndexes(area: 'US' | StateCode): readonly number[] {
  return area === 'US' ? oewsIndex.nationalCoverage : oewsIndex.coverageByState[area] ?? [];
}

/** Occupations this area published a wage for, in SOC order. */
export function oewsOccupationsForArea(area: 'US' | StateCode): OewsOccupation[] {
  return coverageIndexes(area).map((index) => oewsOccupations[index]);
}

export function oewsPublishesWage(area: 'US' | StateCode, code: string): boolean {
  const position = positionByCode.get(code);
  if (position === undefined) return false;
  return coverageIndexes(area).includes(position);
}

/**
 * States that published a wage for one occupation.
 *
 * Built once on first use rather than at module load: most pages need coverage
 * for a single area, and inverting the whole table costs more than every page
 * that never asks for it saves.
 */
let statesByOccupationCode: Map<string, StateCode[]> | undefined;

export function oewsStatesForOccupation(code: string): StateCode[] {
  if (!statesByOccupationCode) {
    const inverted = new Map<string, StateCode[]>();
    for (const [area, indexes] of Object.entries(oewsIndex.coverageByState)) {
      if (!isStateCode(area)) continue;
      for (const index of indexes) {
        const occupationCode = oewsOccupations[index].code;
        const states = inverted.get(occupationCode);
        if (states) states.push(area);
        else inverted.set(occupationCode, [area]);
      }
    }
    statesByOccupationCode = inverted;
  }
  return statesByOccupationCode.get(code) ?? [];
}

/** Every occupation and state pair that can carry a page of its own. */
export function oewsPageWorthyPairs(): Array<{ state: StateCode; occupation: OewsOccupation }> {
  const pairs: Array<{ state: StateCode; occupation: OewsOccupation }> = [];
  for (const [area, indexes] of Object.entries(oewsIndex.coverageByState)) {
    if (!isStateCode(area)) continue;
    for (const index of indexes) pairs.push({ state: area, occupation: oewsOccupations[index] });
  }
  return pairs;
}

/**
 * One area's published estimate for one occupation, or nothing.
 *
 * Nothing means BLS did not publish that combination — a real state of the
 * survey, not a lookup failure — so callers should render the absence rather
 * than substitute a national or neighbouring figure.
 */
export function getOewsEstimate(area: OewsAreaId, code: string): OewsEstimate | undefined {
  const occupation = byCode.get(code);
  if (!occupation) return undefined;
  const occupationIndex = positionByCode.get(code);
  if (occupationIndex === undefined) return undefined;
  const row = findOewsRow(oewsWages, area, occupationIndex);
  if (row === -1) return undefined;
  return unpackOewsEstimate(oewsWages, oewsOccupations, row, area);
}

/** Every estimate an area published, in SOC order. */
export function getOewsEstimatesForArea(area: OewsAreaId): OewsEstimate[] {
  const areaPosition = oewsWages.areas.indexOf(area);
  if (areaPosition === -1) return [];
  const estimates: OewsEstimate[] = [];
  for (let row = oewsWages.areaOffsets[areaPosition]; row < oewsWages.areaOffsets[areaPosition + 1]; row += 1) {
    estimates.push(unpackOewsEstimate(oewsWages, oewsOccupations, row, area));
  }
  return estimates;
}
