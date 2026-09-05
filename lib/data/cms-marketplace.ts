import { z } from 'zod';
import { isStateCode, type StateCode } from '@/lib/location/states';

export const CMS_MARKETPLACE_ADAPTER_VERSION = 'cms-marketplace-v1.0.0';
export const CMS_MARKETPLACE_SOURCE_URL = 'https://www.cms.gov/marketplace/resources/data/public-use-files';
export const CMS_MARKETPLACE_LANDSCAPE_URL = 'https://www.cms.gov/files/zip/individual-market-medical.zip';

/**
 * The ages CMS prints a premium for.
 *
 * Every other age has to be derived, so these are the only figures the snapshot
 * states as observed. `child` is the single rate CMS publishes for everyone
 * aged 0 to 14.
 */
export const CMS_PUBLISHED_AGES = ['child', 18, 21, 27, 30, 40, 50, 60] as const;
export type CmsPublishedAge = (typeof CMS_PUBLISHED_AGES)[number];
export const CMS_AGE_COUNT = CMS_PUBLISHED_AGES.length;
const AGE_21_INDEX = CMS_PUBLISHED_AGES.indexOf(21);

/**
 * The federal Default Standard Age Curve (45 CFR 147.102; CMS market rating
 * rules), indexed by age with 64 standing for "64 and older".
 *
 * Five of these factors are confirmed directly against the published premiums
 * during ingestion — every conforming plan reproduces them to the cent — and
 * the rest are transcribed from the regulation. A state filing its own curve is
 * flagged per county rather than forced through this one, which is what
 * `ageCurve` on each county row is for.
 */
export const FEDERAL_DEFAULT_AGE_CURVE: Readonly<Record<number, number>> = Object.freeze({
  0: 0.765, 1: 0.765, 2: 0.765, 3: 0.765, 4: 0.765, 5: 0.765, 6: 0.765, 7: 0.765,
  8: 0.765, 9: 0.765, 10: 0.765, 11: 0.765, 12: 0.765, 13: 0.765, 14: 0.765,
  15: 0.833, 16: 0.859, 17: 0.885, 18: 0.913, 19: 0.941, 20: 0.970,
  21: 1.000, 22: 1.000, 23: 1.000, 24: 1.000, 25: 1.004, 26: 1.024, 27: 1.048,
  28: 1.087, 29: 1.119, 30: 1.135, 31: 1.159, 32: 1.183, 33: 1.198, 34: 1.214,
  35: 1.222, 36: 1.230, 37: 1.238, 38: 1.246, 39: 1.262, 40: 1.278, 41: 1.302,
  42: 1.325, 43: 1.357, 44: 1.397, 45: 1.444, 46: 1.500, 47: 1.563, 48: 1.635,
  49: 1.706, 50: 1.786, 51: 1.865, 52: 1.952, 53: 2.040, 54: 2.135, 55: 2.230,
  56: 2.333, 57: 2.437, 58: 2.548, 59: 2.603, 60: 2.714, 61: 2.810, 62: 2.873,
  63: 2.952, 64: 3.000,
});

export const CMS_METALS = ['silver', 'bronze', 'gold'] as const;
export type CmsMetal = (typeof CMS_METALS)[number];
export const CMS_COST_SHARING_LEVELS = [94, 87, 73] as const;
export type CmsCostSharingLevel = (typeof CMS_COST_SHARING_LEVELS)[number];

/**
 * The packed column layout, one block of integers per county.
 *
 * A row of objects for 2,055 counties costs 7 MB pretty-printed and would not
 * fit in a Worker alongside the rest of the data; the same numbers as integer
 * cents cost 1.1 MB. `-1` marks a figure the county does not publish — a metal
 * level with no plans, or a cost-sharing variant CMS left blank — because 0 is
 * a real deductible and must not stand in for "absent".
 */
export const CMS_ABSENT = -1;
const METAL_BLOCK = CMS_AGE_COUNT * 2 + 6;
const CSR_BLOCK = 6;
export const CMS_COLUMNS_PER_COUNTY = CMS_AGE_COUNT + CMS_METALS.length * METAL_BLOCK + CMS_COST_SHARING_LEVELS.length * CSR_BLOCK;

function metalOffset(metal: CmsMetal): number {
  return CMS_AGE_COUNT + CMS_METALS.indexOf(metal) * METAL_BLOCK;
}
function costSharingOffset(level: CmsCostSharingLevel): number {
  return CMS_AGE_COUNT + CMS_METALS.length * METAL_BLOCK + CMS_COST_SHARING_LEVELS.indexOf(level) * CSR_BLOCK;
}

/** Human-readable description of the packing, carried in the snapshot itself. */
export const CMS_COLUMN_LAYOUT: string[] = [
  `0-${CMS_AGE_COUNT - 1}: second-lowest-cost Silver premium, cents, at ages ${CMS_PUBLISHED_AGES.join('/')}`,
  ...CMS_METALS.map((metal) => {
    const base = metalOffset(metal);
    return `${base}-${base + METAL_BLOCK - 1}: ${metal} lowest premium by age (${CMS_AGE_COUNT}), median premium by age (${CMS_AGE_COUNT}), deductible low/median/high, out-of-pocket maximum low/median/high`;
  }),
  ...CMS_COST_SHARING_LEVELS.map((level) => {
    const base = costSharingOffset(level);
    return `${base}-${base + CSR_BLOCK - 1}: ${level}% actuarial value Silver deductible low/median/high, out-of-pocket maximum low/median/high`;
  }),
  `${CMS_ABSENT} means the county publishes no such figure; zero is a real amount.`,
];

const sha = z.string().regex(/^[a-f0-9]{64}$/);

export const cmsCountyIdentitySchema = z.object({
  countyFips: z.string().regex(/^\d{5}$/),
  stateCode: z.string().refine(isStateCode, 'Expected a U.S. state or DC.').transform((value) => value as StateCode),
  countyName: z.string().min(1),
  ratingArea: z.string().min(1),
  planCount: z.number().int().positive(),
  silverPlanCount: z.number().int().min(2),
  /**
   * Whether premiums for unpublished ages can be scaled from age 21.
   *
   * `federal-default` means every plan in the county reproduces the federal
   * curve, so any age is exact. `state-filed` means the state filed its own
   * curve and only the published ages may be quoted.
   */
  ageCurve: z.enum(['federal-default', 'state-filed']),
}).strict();
export type CmsCountyIdentity = z.infer<typeof cmsCountyIdentitySchema>;

export const cmsMarketplaceIndexSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal(CMS_MARKETPLACE_ADAPTER_VERSION),
  snapshotId: z.string().regex(/^cms-marketplace-\d{4}-v1$/),
  provider: z.literal('CMS'),
  datasetId: z.literal('cms-marketplace'),
  frequency: z.literal('reference-year'),
  observationPeriod: z.string().regex(/^\d{4}$/),
  sourceStatus: z.literal('published'),
  fetchedAt: z.iso.datetime(),
  verifiedAt: z.iso.datetime(),
  sourceUrl: z.literal(CMS_MARKETPLACE_SOURCE_URL),
  sourceDocumentationUrl: z.literal(CMS_MARKETPLACE_LANDSCAPE_URL),
  termsUrl: z.literal('https://www.cms.gov/about-cms/information-systems/privacy/privacy-policy'),
  attribution: z.string().min(1),
  units: z.literal('USD per month'),
  publishedAges: z.array(z.union([z.literal('child'), z.number().int()])).length(CMS_AGE_COUNT),
  columnsPerCounty: z.literal(CMS_COLUMNS_PER_COUNTY),
  columnLayout: z.array(z.string().min(1)).min(1),
  /**
   * The states this file covers.
   *
   * CMS publishes the landscape file for the states using HealthCare.gov. A
   * state running its own exchange is absent, and the snapshot says which, so a
   * lookup miss never reads as "no plans available here".
   */
  coveredStateCodes: z.array(z.string().refine(isStateCode)).min(1),
  federalAgeCurve: z.record(z.string().regex(/^\d{1,2}$/), z.number().finite().positive().max(5)),
  counties: z.array(cmsCountyIdentitySchema).min(2_000),
  caveats: z.array(z.string().min(1)).min(1),
  rawSha256: sha,
  /** Digest of the packed premium columns, which travel in their own file. */
  premiumsSha256: sha,
  normalizedSha256: sha,
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string().min(1)).min(1),
}).strict().superRefine((index, ctx) => {
  const seen = new Set<string>();
  for (const county of index.counties) {
    if (seen.has(county.countyFips)) ctx.addIssue({ code: 'custom', message: `Duplicate county ${county.countyFips}.` });
    seen.add(county.countyFips);
    if (!index.coveredStateCodes.includes(county.stateCode)) {
      ctx.addIssue({ code: 'custom', message: `${county.stateCode} has counties but is not listed as covered.` });
    }
  }
  for (const stateCode of index.coveredStateCodes) {
    if (!index.counties.some((county) => county.stateCode === stateCode)) {
      ctx.addIssue({ code: 'custom', message: `${stateCode} is listed as covered but has no counties.` });
    }
  }
  if (index.snapshotId !== `cms-marketplace-${index.observationPeriod}-v1`) {
    ctx.addIssue({ code: 'custom', message: 'Snapshot id must name its observation period.' });
  }
});
export type CmsMarketplaceIndex = z.infer<typeof cmsMarketplaceIndexSchema>;

export const cmsMarketplacePremiumsSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  snapshotId: z.string().regex(/^cms-marketplace-\d{4}-v1$/),
  countyCount: z.number().int().min(2_000),
  columnsPerCounty: z.literal(CMS_COLUMNS_PER_COUNTY),
  /** Integer cents, or `-1` for a figure the county does not publish. */
  values: z.array(z.number().int().min(CMS_ABSENT).max(100_000_00)),
}).strict().superRefine((packed, ctx) => {
  if (packed.values.length !== packed.countyCount * packed.columnsPerCounty) {
    ctx.addIssue({ code: 'custom', message: `Packed columns hold ${packed.values.length} values, expected ${packed.countyCount * packed.columnsPerCounty}.` });
  }
});
export type CmsMarketplacePremiums = z.infer<typeof cmsMarketplacePremiumsSchema>;

export type CmsSpread = { low: number; median: number; high: number };
export type CmsMetalSummary = {
  lowestByAge: number[];
  medianByAge: number[];
  individualDeductible: CmsSpread;
  individualMaximumOutOfPocket: CmsSpread;
};
export type CmsCostSharingVariant = {
  actuarialValuePercent: CmsCostSharingLevel;
  individualDeductible: CmsSpread;
  individualMaximumOutOfPocket: CmsSpread;
};

const dollars = (cents: number) => Math.round(cents) / 100;

function readBlock(values: number[], base: number, length: number): number[] | null {
  const slice = values.slice(base, base + length);
  if (slice.length !== length || slice.some((value) => value === CMS_ABSENT)) return null;
  return slice.map(dollars);
}

/** The second-lowest-cost Silver premium at each published age, in dollars. */
export function unpackBenchmarkSilver(values: number[], countyIndex: number): number[] {
  const base = countyIndex * CMS_COLUMNS_PER_COUNTY;
  const block = readBlock(values, base, CMS_AGE_COUNT);
  if (!block) throw new Error(`County index ${countyIndex} has no benchmark Silver premium.`);
  return block;
}

export function unpackMetal(values: number[], countyIndex: number, metal: CmsMetal): CmsMetalSummary | null {
  const base = countyIndex * CMS_COLUMNS_PER_COUNTY + metalOffset(metal);
  const block = readBlock(values, base, METAL_BLOCK);
  if (!block) return null;
  return {
    lowestByAge: block.slice(0, CMS_AGE_COUNT),
    medianByAge: block.slice(CMS_AGE_COUNT, CMS_AGE_COUNT * 2),
    individualDeductible: { low: block[CMS_AGE_COUNT * 2], median: block[CMS_AGE_COUNT * 2 + 1], high: block[CMS_AGE_COUNT * 2 + 2] },
    individualMaximumOutOfPocket: { low: block[CMS_AGE_COUNT * 2 + 3], median: block[CMS_AGE_COUNT * 2 + 4], high: block[CMS_AGE_COUNT * 2 + 5] },
  };
}

export function unpackCostSharing(values: number[], countyIndex: number, level: CmsCostSharingLevel): CmsCostSharingVariant | null {
  const base = countyIndex * CMS_COLUMNS_PER_COUNTY + costSharingOffset(level);
  const block = readBlock(values, base, CSR_BLOCK);
  if (!block) return null;
  return {
    actuarialValuePercent: level,
    individualDeductible: { low: block[0], median: block[1], high: block[2] },
    individualMaximumOutOfPocket: { low: block[3], median: block[4], high: block[5] },
  };
}

/**
 * The published age a state-filed county falls back to, for an exact figure.
 *
 * Age 45 sits exactly between the published 40 and 50, and the tie is broken
 * toward the older age. Premiums rise with age, so quoting the younger one
 * would hand someone budgeting for coverage a figure that is too low, which is
 * the more damaging of the two ways to be wrong.
 */
export function nearestPublishedAge(age: number): CmsPublishedAge {
  if (age <= 14) return 'child';
  const numeric = CMS_PUBLISHED_AGES.filter((entry): entry is Exclude<CmsPublishedAge, 'child'> => entry !== 'child');
  return numeric.reduce((closest, candidate) => (Math.abs(candidate - age) <= Math.abs(closest - age) ? candidate : closest));
}

export type CmsAgeQuote = { premium: number; exactForAge: boolean; quotedAge: CmsPublishedAge | number };

/**
 * Monthly premium for one person of a given age, from a county's published rates.
 *
 * A county on the federal curve can be quoted at any age, because every plan in
 * it reproduces that curve to the cent. A state-filed county is quoted only at
 * the nearest age CMS actually printed, and the caller is told which age that
 * was so the page can say so instead of implying an exact match.
 */
export function premiumForAge(
  ageCurve: CmsCountyIdentity['ageCurve'],
  premiumsByPublishedAge: number[],
  age: number,
  curve: Readonly<Record<number, number>> = FEDERAL_DEFAULT_AGE_CURVE,
): CmsAgeQuote {
  if (!Number.isInteger(age) || age < 0 || age > 120) throw new Error('Age must be a whole number of years.');
  const published = age <= 14 ? 'child' : (age as CmsPublishedAge);
  const publishedIndex = CMS_PUBLISHED_AGES.indexOf(published);
  if (publishedIndex >= 0) {
    return { premium: premiumsByPublishedAge[publishedIndex], exactForAge: true, quotedAge: CMS_PUBLISHED_AGES[publishedIndex] };
  }
  if (ageCurve === 'federal-default') {
    const factor = curve[Math.min(age, 64)];
    if (factor === undefined) throw new Error(`The age curve has no factor for age ${age}.`);
    return {
      premium: Math.round(premiumsByPublishedAge[AGE_21_INDEX] * factor * 100) / 100,
      exactForAge: true,
      quotedAge: age,
    };
  }
  const fallback = nearestPublishedAge(age);
  return {
    premium: premiumsByPublishedAge[CMS_PUBLISHED_AGES.indexOf(fallback)],
    exactForAge: false,
    quotedAge: fallback,
  };
}

export type CmsHouseholdQuote = { premium: number; exactForAges: boolean; billedMemberCount: number; unbilledChildCount: number };

/**
 * Household premium under the federal rating rules: every member aged 21 and
 * over, plus the three oldest children under 21. A fourth child adds nothing,
 * which is the rule households most often get wrong adding a quote up by hand.
 */
export function householdPremium(
  ageCurve: CmsCountyIdentity['ageCurve'],
  premiumsByPublishedAge: number[],
  ages: number[],
  curve: Readonly<Record<number, number>> = FEDERAL_DEFAULT_AGE_CURVE,
): CmsHouseholdQuote {
  if (ages.length === 0) throw new Error('A household needs at least one member.');
  const adults = ages.filter((age) => age >= 21);
  const children = ages.filter((age) => age < 21).sort((left, right) => right - left);
  const billedChildren = children.slice(0, 3);
  const billed = [...adults, ...billedChildren];
  if (billed.length === 0) throw new Error('A household needs at least one billable member.');
  let total = 0;
  let exact = true;
  for (const age of billed) {
    const quote = premiumForAge(ageCurve, premiumsByPublishedAge, age, curve);
    total += quote.premium;
    if (!quote.exactForAge) exact = false;
  }
  return {
    premium: Math.round(total * 100) / 100,
    exactForAges: exact,
    billedMemberCount: billed.length,
    unbilledChildCount: children.length - billedChildren.length,
  };
}

/**
 * The cost-sharing-reduction Silver variant an income qualifies for.
 *
 * These are granted by income, not chosen, and only on a Silver plan. Above
 * 250% of the poverty guideline there is no reduction; below 100% the
 * Marketplace decides, so nothing is claimed here.
 */
export function costSharingLevelForIncome(incomePercentFpl: number): CmsCostSharingLevel | null {
  if (!Number.isFinite(incomePercentFpl) || incomePercentFpl < 100) return null;
  if (incomePercentFpl <= 150) return 94;
  if (incomePercentFpl <= 200) return 87;
  if (incomePercentFpl <= 250) return 73;
  return null;
}
