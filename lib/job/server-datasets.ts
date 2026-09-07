/**
 * Assemble Job Cost datasets at request time. The engine itself stays pure.
 */
import { getBeaStateRpp } from '@/lib/data/bea-rpp-snapshot';
import { getOewsEstimate, getOewsOccupation, oewsIndex } from '@/lib/data/bls-oews-snapshot';
import { readStoreJson } from '@/lib/data/store';
import { getRecipe } from './recipes';
import type { JobId } from './catalog';
import type {
  EcecSnapshot,
  FemaEquipmentSnapshot,
  JobDatasets,
  MaterialBasketSnapshot,
  OewsWageInput,
  PpiSnapshot,
} from './types';
import type { StateCode } from '@/lib/location/states';

function hourlyFromEstimate(area: 'US' | StateCode, socCode: string): { hourly: number | null; area: 'US' | StateCode; fallback: boolean } {
  const local = getOewsEstimate(area, socCode);
  const localHourly = local?.hourly.median ?? local?.hourlyMean ?? null;
  if (localHourly != null && localHourly > 0) return { hourly: localHourly, area, fallback: false };
  const national = getOewsEstimate('US', socCode);
  const nationalHourly = national?.hourly.median ?? national?.hourlyMean ?? null;
  return { hourly: nationalHourly, area: 'US', fallback: true };
}

export async function loadJobDatasets(jobId: JobId, state: StateCode, stateFips: string, origin?: string): Promise<JobDatasets> {
  const recipe = getRecipe(jobId);
  const [ecec, ppi, fema, basket] = await Promise.all([
    readStoreJson<EcecSnapshot>('bls-ecec', origin),
    readStoreJson<PpiSnapshot>('bls-ppi', origin),
    readStoreJson<FemaEquipmentSnapshot>('fema-equipment', origin),
    readStoreJson<MaterialBasketSnapshot>('job-material-basket', origin),
  ]);

  const wages: OewsWageInput[] = recipe.crew.map((member) => {
    const resolved = hourlyFromEstimate(state, member.socCode);
    const occupation = getOewsOccupation(member.socCode);
    return {
      socCode: member.socCode,
      hourlyMedian: resolved.hourly,
      area: resolved.area,
      usedNationalFallback: resolved.fallback,
      snapshotId: oewsIndex.snapshotId,
      occupationTitle: occupation?.displayTitle ?? member.role,
    };
  });

  const rpp = getBeaStateRpp(state, stateFips, 'allItems');
  return {
    ecec,
    ppi,
    fema,
    basket,
    wages,
    rppAllItems: rpp?.value ?? null,
  };
}
