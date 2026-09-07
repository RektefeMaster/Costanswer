/**
 * The salary page family: its addresses, and which of them search engines see.
 *
 * This is a generated family rather than a registry tool. A tool is one page
 * someone built and reviewed; this is 34,000 pages that exist because BLS
 * published 34,000 distinct wage estimates. `lib/tool-registry.ts` gates tools
 * one at a time on hand-scored evidence, which does not scale here, so the
 * family carries its own gate: a page exists only where the survey published
 * something to say, and a whole level is opened to search only when the level
 * below it has been measured.
 */
import { getOewsEstimate, oewsOccupationsForArea, oewsPublishesWage } from '@/lib/data/bls-oews-snapshot';
import { oewsOccupationSlug, type OewsOccupation } from '@/lib/data/bls-oews';
import {
  hasCuratedName,
  occupationAliases,
  occupationHeadingName,
  occupationSingular,
} from '@/lib/salary-content';
import { getStateName, STATE_CODES, type StateCode } from '@/lib/location/states';
import { SALARY_ROOT, SALARY_STATE_INDEX_PATH } from '@/lib/salary-routes';

export { SALARY_ROOT };

/**
 * Path segments the family owns, which no occupation slug may take.
 *
 * A BLS retitling that produced an occupation slugged `states` would otherwise
 * quietly shadow every state hub, so this is asserted rather than assumed.
 */
export const SALARY_RESERVED_SEGMENTS = ['states'] as const;

export type SalaryLevel = 'familyHub' | 'stateIndex' | 'stateHub' | 'occupation' | 'occupationInState';

export type SalaryPublicationState = 'indexable' | 'wave-1' | 'staged';

/**
 * How far the family has been opened to search engines.
 *
 * Publishing 30,807 leaves at once on a young domain is the profile most
 * likely to be crawled slowly and left largely unindexed, so the leaves open
 * in waves rather than in one word. State wage tax stopped being the reason
 * when P2 closed 51/51; crawl behaviour is.
 *
 * `wave-1` opens the leaves under the occupations most people actually work
 * in — see `SALARY_LEAF_WAVE_1_MIN_EMPLOYMENT`. The rest stay closed, and
 * closed means *not linked either*: a `noindex` page that every occupation
 * page still links is a page Google crawls anyway, which spends exactly the
 * budget staging was meant to protect. `salaryLeafIsOpen` is the one answer
 * both the sitemap and the tables read, so the two cannot drift.
 *
 * Widening is a threshold change, measured against Search Console between
 * waves; `'indexable'` opens all 30,807 at once and is the last step, not the
 * first.
 */
export const SALARY_PUBLICATION: Record<SalaryLevel, SalaryPublicationState> = {
  familyHub: 'indexable',
  stateIndex: 'indexable',
  stateHub: 'indexable',
  occupation: 'indexable',
  occupationInState: 'wave-1',
};

/**
 * The wave-1 line: national employment in the occupation.
 *
 * 400,000 is 90 occupations and 4,562 leaves — 68% of all measured U.S.
 * employment, and the queries with the volume behind them ("registered nurse
 * salary texas"). It is a round number on purpose: employment moves a few
 * percent between annual releases, so a round threshold keeps the same pages
 * open across a refresh instead of shuffling URLs in and out of the sitemap.
 *
 * The count is asserted in the family's tests, so raising or lowering this is
 * a reviewed change with a visible page-count diff rather than a silent one.
 */
export const SALARY_LEAF_WAVE_1_MIN_EMPLOYMENT = 400_000;

/** True only for a level that is wholly open. `wave-1` is not: ask per occupation. */
export function isSalaryLevelIndexable(level: SalaryLevel): boolean {
  return SALARY_PUBLICATION[level] === 'indexable';
}

let openLeafCodes: Set<string> | undefined;

function leafWaveCodes(): Set<string> {
  if (!openLeafCodes) {
    const codes = new Set<string>();
    for (const occupation of oewsOccupationsForArea('US')) {
      const employment = getOewsEstimate('US', occupation.code)?.employment ?? 0;
      if (employment >= SALARY_LEAF_WAVE_1_MIN_EMPLOYMENT) codes.add(occupation.code);
    }
    openLeafCodes = codes;
  }
  return openLeafCodes;
}

/**
 * May this occupation's state pages be indexed and linked?
 *
 * One predicate for both questions on purpose. Indexing a page nothing links
 * to orphans it; linking a page that is not indexed spends crawl budget on it
 * regardless. They are the same decision and they are answered here.
 */
export function salaryLeafIsOpen(occupation: Pick<OewsOccupation, 'code'>): boolean {
  const state = SALARY_PUBLICATION.occupationInState;
  if (state === 'indexable') return true;
  if (state === 'staged') return false;
  return leafWaveCodes().has(occupation.code);
}

/** Occupations whose state pages are open, in SOC order. */
export function occupationsWithOpenLeaves(): OewsOccupation[] {
  return oewsOccupationsForArea('US').filter((occupation) => salaryLeafIsOpen(occupation));
}

/**
 * The URL segment an occupation's page is served at.
 *
 * The snapshot carries a slug derived from the official title, which is the
 * right thing for data to own. A URL is not data, though: it is read by people
 * and matched against what they searched, and nobody types
 * "heating-air-conditioning-and-refrigeration-mechanics-and-installers". Where
 * a name has been written by hand, the address uses it — "hvac-technician" —
 * and everything else falls back to the snapshot's own slug.
 *
 * This lives in the family rather than in the ingest because it depends on the
 * editorial layer, and data must not reach up into editorial to describe itself.
 */
function pageSlugFor(occupation: OewsOccupation): string {
  if (!hasCuratedName(occupation)) return occupation.slug;
  const curated = oewsOccupationSlug(occupationSingular(occupation));
  return curated.length > 0 ? curated : occupation.slug;
}

let occupationsBySlug: Map<string, OewsOccupation> | undefined;

function slugIndex(): Map<string, OewsOccupation> {
  if (!occupationsBySlug) {
    const index = new Map<string, OewsOccupation>();
    for (const occupation of oewsOccupationsForArea('US')) index.set(pageSlugFor(occupation), occupation);
    occupationsBySlug = index;
  }
  return occupationsBySlug;
}

const STATE_SLUGS = new Map<string, StateCode>(
  STATE_CODES.map((state) => [getStateName(state).toLowerCase().replace(/[^a-z0-9]+/g, '-'), state]),
);
const SLUG_BY_STATE = new Map<StateCode, string>([...STATE_SLUGS].map(([slug, state]) => [state, slug]));

export function stateSlug(state: StateCode): string {
  const slug = SLUG_BY_STATE.get(state);
  if (!slug) throw new Error(`No slug for state ${state}.`);
  return slug;
}

export function stateFromSlug(slug: string): StateCode | undefined {
  return STATE_SLUGS.get(slug);
}

export const SALARY_STATE_SLUGS = [...SLUG_BY_STATE.values()].sort();

export function salaryFamilyPath(): '/salary' {
  return SALARY_ROOT;
}

export function salaryStateIndexPath(): `/${string}` {
  return SALARY_STATE_INDEX_PATH;
}

export function salaryStatePath(state: StateCode): `/${string}` {
  return `${SALARY_ROOT}/states/${stateSlug(state)}`;
}

export function salaryOccupationPath(occupation: OewsOccupation): `/${string}` {
  return `${SALARY_ROOT}/${pageSlugFor(occupation)}`;
}

export function salaryOccupationInStatePath(occupation: OewsOccupation, state: StateCode): `/${string}` {
  return `${SALARY_ROOT}/${pageSlugFor(occupation)}/${stateSlug(state)}`;
}

/**
 * The occupation a URL segment names, when that segment can carry a page.
 *
 * Major groups and the all-occupations total have estimates but are roll-ups,
 * not jobs anyone searches for by name, so they belong on hubs rather than
 * having addresses of their own.
 */
export function salaryOccupationFromSlug(slug: string): OewsOccupation | undefined {
  return slugIndex().get(slug);
}

/** Occupations with a national page, in SOC order. */
export function nationalSalaryOccupations(): OewsOccupation[] {
  return oewsOccupationsForArea('US');
}

/** States that published a wage for this occupation, in alphabetical order. */
export function statesWithWageFor(occupation: Pick<OewsOccupation, 'code'>): StateCode[] {
  return STATE_CODES.filter((state) => oewsPublishesWage(state, occupation.code));
}

/**
 * Occupations the site links from its footer.
 *
 * Chosen for how many people work in them, so the standing link is one a
 * reader might actually follow rather than a keyword placed for a crawler.
 * Their codes are checked against the release in the family's tests, so a
 * reclassification shows up as a failing test rather than a dead footer link.
 */
const FOOTER_OCCUPATION_CODES = ['29-1141', '15-1252', '53-3032', '47-2111', '25-2021', '13-2011'] as const;

export const FOOTER_SALARY_OCCUPATIONS: OewsOccupation[] = FOOTER_OCCUPATION_CODES
  .map((code) => nationalSalaryOccupations().find((occupation) => occupation.code === code))
  .filter((occupation): occupation is OewsOccupation => occupation !== undefined);

export type SalarySearchEntry = {
  /** URL segment; the family root is added by the consumer. */
  slug: string;
  name: string;
  /** SOC code, so the result line can cite what it is. */
  code: string;
  /** Everything a reader might type for this job, already lowercased. */
  terms: string[];
};

/**
 * The words a reader might type for one occupation.
 *
 * Spoken names and aliases first, because that is what people search.
 * The SOC code is included so a pasted classification still resolves,
 * with the hyphen stripped for the form "291141".
 */
export function occupationSearchTerms(occupation: OewsOccupation): string[] {
  const spoken = occupationSingular(occupation);
  return [...new Set([
    spoken.toLowerCase(),
    occupation.displayTitle.toLowerCase(),
    occupation.title.toLowerCase(),
    occupation.code.toLowerCase(),
    occupation.code.replace('-', ''),
    ...occupationAliases(occupation).map((alias) => alias.toLowerCase()),
  ])];
}

/**
 * A search index over the occupations, small enough to hand to the browser.
 *
 * Only the search page loads it, and only the fields a match needs: a name, a
 * code, and the words to match against. Wording shared by every row is built in
 * the component instead of repeated 761 times, and the wage columns never leave
 * the server. Aliases are in the terms because "RN" and "LPN" are what people
 * type, and the official title is there because someone checking a BLS figure
 * will paste the label BLS used.
 */
export function salarySearchIndex(): SalarySearchEntry[] {
  return nationalSalaryOccupations().map((occupation) => ({
    slug: salaryOccupationPath(occupation).slice(SALARY_ROOT.length + 1),
    name: occupationHeadingName(occupation),
    code: occupation.code,
    terms: occupationSearchTerms(occupation),
  }));
}

/**
 * Reserved segments really are unclaimed.
 *
 * Called from the data tests rather than at module load: a collision is a
 * publication defect to catch before release, not something to discover by
 * crashing a page.
 */
export function assertSalarySlugsAreUnreserved(): void {
  const taken = new Map<string, string>();
  for (const occupation of oewsOccupationsForArea('US')) {
    const slug = pageSlugFor(occupation);
    const owner = taken.get(slug);
    if (owner) throw new Error(`Occupations ${owner} and ${occupation.code} both address /salary/${slug}.`);
    taken.set(slug, occupation.code);
    if ((SALARY_RESERVED_SEGMENTS as readonly string[]).includes(slug)) {
      throw new Error(`Occupation ${occupation.code} addresses the reserved segment "${slug}".`);
    }
    if (STATE_SLUGS.has(slug)) {
      throw new Error(`Occupation ${occupation.code} addresses "${slug}", which is also a state.`);
    }
  }
}
