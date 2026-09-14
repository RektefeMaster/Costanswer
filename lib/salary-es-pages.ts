/**
 * Spanish salary family addresses.
 *
 * English URLs stay at `/salary/...`. Spanish lives at `/es/salario/...` with
 * authored occupation slugs and the same English state slugs people type.
 * One occupation, one Spanish page — feminine names and aliases never become
 * a second address.
 */
import type { OewsOccupation } from '@/lib/data/bls-oews';
import { oewsOccupationsForArea } from '@/lib/data/bls-oews-snapshot';
import { type StateCode } from '@/lib/location/states';
import { occupationSlugEs } from '@/lib/salary-naming-es';
import {
  nationalSalaryOccupations,
  salaryFamilyPath,
  salaryLeafIsOpen,
  salaryOccupationFromSlug,
  salaryOccupationInStatePath,
  salaryOccupationPath,
  salaryStateIndexPath,
  salaryStatePath,
  stateFromSlug,
  stateSlug,
} from '@/lib/salary-pages';
import { SALARY_ES_ROOT, SALARY_ES_STATE_INDEX_PATH } from '@/lib/salary-routes';

export { SALARY_ES_ROOT, SALARY_ES_STATE_INDEX_PATH };
export const SALARY_ES_RESERVED_SEGMENTS = ['estados'] as const;

let occupationsBySlugEs: Map<string, OewsOccupation> | undefined;
let slugByCodeEs: Map<string, string> | undefined;

function buildEsSlugIndex(): void {
  const bySlug = new Map<string, OewsOccupation>();
  const byCode = new Map<string, string>();
  const used = new Map<string, string>();
  for (const occupation of oewsOccupationsForArea('US')) {
    if (occupation.group !== 'detailed' || occupation.residual) continue;
    let slug = occupationSlugEs(occupation);
    const owner = used.get(slug);
    if (owner && owner !== occupation.code) {
      slug = `${slug}-${occupation.code.toLowerCase().replace('-', '')}`;
    }
    if ((SALARY_ES_RESERVED_SEGMENTS as readonly string[]).includes(slug)) {
      slug = `${slug}-${occupation.code.toLowerCase().replace('-', '')}`;
    }
    used.set(slug, occupation.code);
    bySlug.set(slug, occupation);
    byCode.set(occupation.code, slug);
  }
  occupationsBySlugEs = bySlug;
  slugByCodeEs = byCode;
}

function esSlugForCode(): Map<string, string> {
  if (!slugByCodeEs) buildEsSlugIndex();
  return slugByCodeEs!;
}

function esSlugIndex(): Map<string, OewsOccupation> {
  if (!occupationsBySlugEs) buildEsSlugIndex();
  return occupationsBySlugEs!;
}

export function salaryOccupationSlugEs(occupation: Pick<OewsOccupation, 'code'>): string {
  const slug = esSlugForCode().get(occupation.code);
  if (!slug) throw new Error(`No Spanish salary slug for occupation ${occupation.code}.`);
  return slug;
}

export function salaryOccupationFromSlugEs(slug: string): OewsOccupation | undefined {
  return esSlugIndex().get(slug);
}

export function salaryFamilyPathEs(): typeof SALARY_ES_ROOT {
  return SALARY_ES_ROOT;
}

export function salaryStateIndexPathEs(): typeof SALARY_ES_STATE_INDEX_PATH {
  return SALARY_ES_STATE_INDEX_PATH;
}

export function salaryStatePathEs(state: StateCode): `/${string}` {
  return `${SALARY_ES_ROOT}/estados/${stateSlug(state)}`;
}

export function salaryOccupationPathEs(occupation: Pick<OewsOccupation, 'code'>): `/${string}` {
  return `${SALARY_ES_ROOT}/${salaryOccupationSlugEs(occupation)}`;
}

export function salaryOccupationInStatePathEs(occupation: Pick<OewsOccupation, 'code'>, state: StateCode): `/${string}` {
  return `${SALARY_ES_ROOT}/${salaryOccupationSlugEs(occupation)}/${stateSlug(state)}`;
}

export function salaryEsLeafIsOpen(occupation: Pick<OewsOccupation, 'code'>): boolean {
  return salaryLeafIsOpen(occupation);
}

export function assertSalaryEsSlugsAreUnique(): void {
  const seen = new Map<string, string>();
  for (const occupation of nationalSalaryOccupations()) {
    const slug = salaryOccupationSlugEs(occupation);
    const owner = seen.get(slug);
    if (owner) throw new Error(`Spanish slugs collide: ${owner} and ${occupation.code} both use ${slug}.`);
    seen.set(slug, occupation.code);
    if ((SALARY_ES_RESERVED_SEGMENTS as readonly string[]).includes(slug)) {
      throw new Error(`Occupation ${occupation.code} took reserved Spanish segment "${slug}".`);
    }
  }
}

export function englishSalaryPathForSpanish(path: string): `/${string}` | null {
  if (path === SALARY_ES_ROOT) return salaryFamilyPath();
  if (path === SALARY_ES_STATE_INDEX_PATH) return salaryStateIndexPath();
  const stateHub = path.match(/^\/es\/salario\/estados\/([^/]+)$/);
  if (stateHub) {
    const state = stateFromSlug(stateHub[1]);
    return state ? salaryStatePath(state) : null;
  }
  const leaf = path.match(/^\/es\/salario\/([^/]+)\/([^/]+)$/);
  if (leaf) {
    const occupation = salaryOccupationFromSlugEs(leaf[1]);
    const state = stateFromSlug(leaf[2]);
    if (!occupation || !state) return null;
    return salaryOccupationInStatePath(occupation, state);
  }
  const national = path.match(/^\/es\/salario\/([^/]+)$/);
  if (national && national[1] !== 'estados') {
    const occupation = salaryOccupationFromSlugEs(national[1]);
    return occupation ? salaryOccupationPath(occupation) : null;
  }
  return null;
}

export function spanishSalaryPathForEnglish(path: string): `/${string}` | null {
  if (path === salaryFamilyPath()) return salaryFamilyPathEs();
  if (path === salaryStateIndexPath()) return salaryStateIndexPathEs();
  const stateHub = path.match(/^\/salary\/states\/([^/]+)$/);
  if (stateHub) {
    const state = stateFromSlug(stateHub[1]);
    return state ? salaryStatePathEs(state) : null;
  }
  const leaf = path.match(/^\/salary\/([^/]+)\/([^/]+)$/);
  if (leaf && leaf[1] !== 'states') {
    const occupation = salaryOccupationFromSlug(leaf[1]);
    const state = stateFromSlug(leaf[2]);
    if (!occupation || !state) return null;
    return salaryOccupationInStatePathEs(occupation, state);
  }
  const national = path.match(/^\/salary\/([^/]+)$/);
  if (national && national[1] !== 'states') {
    const occupation = salaryOccupationFromSlug(national[1]);
    return occupation ? salaryOccupationPathEs(occupation) : null;
  }
  return null;
}

export function bilingualSalaryPair(path: string): { en: `/${string}`; es: `/${string}` } | null {
  if (path === '/' || path === '/es') return { en: '/', es: '/es' };
  if (path === SALARY_ES_ROOT || path.startsWith(`${SALARY_ES_ROOT}/`)) {
    const en = englishSalaryPathForSpanish(path);
    return en ? { en, es: path as `/${string}` } : null;
  }
  if (path === salaryFamilyPath() || path.startsWith(`${salaryFamilyPath()}/`)) {
    const es = spanishSalaryPathForEnglish(path);
    return es ? { en: path as `/${string}`, es } : null;
  }
  return null;
}
