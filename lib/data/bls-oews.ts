/**
 * BLS Occupational Employment and Wage Statistics (OEWS).
 *
 * OEWS is the only official U.S. source that prices a named occupation in a
 * named place, which is what turns "how much does a nurse make" into an
 * answerable question with a citation behind it. The survey is published once a
 * year for a May reference month, roughly twelve months later.
 *
 * Two things about the source shape the model here. Wages above the survey's
 * top code are published as `#` rather than a number, so a capped wage is
 * recorded as a null value with `atOrAboveWageCap` set — writing the cap in as
 * if it were the estimate would understate exactly the occupations people are
 * most curious about. And BLS suppresses estimates it cannot publish (`*`,
 * `**`, `~`), so a missing wage is a real state of the data, never a zero.
 */
import { z } from 'zod';
import { STATE_CODES, isStateCode, type StateCode } from '@/lib/location/states';

export const BLS_OEWS_ADAPTER_VERSION = 'bls-oews-v1.0.0';
export const BLS_OEWS_DOCUMENTATION_URL = 'https://www.bls.gov/oes/oes_doc.htm';
export const BLS_OEWS_METHODOLOGY_URL = 'https://www.bls.gov/oes/oes_ques.htm';

/** Wages at or above the survey's top code are published as `#`, not a number. */
export const OEWS_ANNUAL_WAGE_CAP = 239_200;
export const OEWS_HOURLY_WAGE_CAP = 115;

/** OEWS derives an annual wage as the hourly wage times a 2,080-hour year. */
export const OEWS_ANNUAL_HOURS = 2_080;

export const OEWS_OCCUPATION_GROUPS = ['total', 'major', 'detailed'] as const;
export type OewsOccupationGroup = (typeof OEWS_OCCUPATION_GROUPS)[number];

export const OEWS_WAGE_BASES = ['both', 'annual-only', 'hourly-only'] as const;
export type OewsWageBasis = (typeof OEWS_WAGE_BASES)[number];

/** `US` for the national estimate, otherwise a two-letter state code. */
export type OewsAreaId = 'US' | StateCode;

export type OewsWagePercentiles = {
  p10: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  p90: number | null;
};

export type OewsOccupation = {
  code: string;
  /** The occupation's official BLS title, shown wherever the figure is cited. */
  title: string;
  /**
   * The title with the survey's bookkeeping removed, for headings and URLs.
   *
   * BLS titles carry classification clauses that exist to keep categories from
   * overlapping: "Elementary School Teachers, Except Special Education". Nobody
   * calls the job that, and nobody searches for it that way. The clause is
   * dropped from the heading and kept in the official title beside it, so the
   * page reads the way the job is named without hiding what was measured.
   */
  displayTitle: string;
  /**
   * URL segment for this occupation.
   *
   * Derived once at ingestion and checked for collisions there, so a page's
   * address is a reviewed property of the release rather than something a
   * runtime helper recomputes — and so a retitled occupation shows up as a
   * snapshot diff instead of silently moving a live URL.
   */
  slug: string;
  /**
   * A residual "All Other" bucket rather than a job.
   *
   * OEWS closes each group with a catch-all so its employment totals add up.
   * They carry real figures, but no one searches for "Sales and Related
   * Workers, All Other", so they inform hubs and never get a page.
   */
  residual: boolean;
  group: OewsOccupationGroup;
  /** The SOC major group this occupation rolls up into, for example `29-0000`. */
  majorCode: string;
};

export type OewsEstimate = {
  area: OewsAreaId;
  occCode: string;
  employment: number | null;
  /** Jobs in this occupation per 1,000 jobs in the area. State estimates only. */
  jobsPer1000: number | null;
  /** The area's share of employment in this occupation against the national share. */
  locationQuotient: number | null;
  hourlyMean: number | null;
  annualMean: number | null;
  hourly: OewsWagePercentiles;
  annual: OewsWagePercentiles;
  wageBasis: OewsWageBasis;
  atOrAboveWageCap: boolean;
};

export type BlsOewsSnapshot = {
  schemaVersion: '1.0.0';
  adapterVersion: typeof BLS_OEWS_ADAPTER_VERSION;
  snapshotId: string;
  provider: 'U.S. Bureau of Labor Statistics';
  datasetId: 'bls-oews';
  observationPeriod: string;
  referenceLabel: string;
  sourceStatus: 'final';
  fetchedAt: string;
  verifiedAt: string;
  publishedAt: string;
  sourceUrl: string;
  nationalSourceUrl: string;
  sourceDocumentationUrl: string;
  attribution: string;
  semantics: string;
  annualWageCap: number;
  hourlyWageCap: number;
  rawSha256: string;
  normalizedSha256: string;
  validationStatus: 'passed';
  validationReport: string[];
  occupations: OewsOccupation[];
  estimates: OewsEstimate[];
};

const percentilesSchema = z.object({
  p10: z.number().finite().nullable(),
  p25: z.number().finite().nullable(),
  median: z.number().finite().nullable(),
  p75: z.number().finite().nullable(),
  p90: z.number().finite().nullable(),
}).strict();

const SOC_CODE = /^\d{2}-\d{4}$/;

const occupationSchema = z.object({
  code: z.string().regex(SOC_CODE),
  title: z.string().min(1),
  displayTitle: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  residual: z.boolean(),
  group: z.enum(OEWS_OCCUPATION_GROUPS),
  majorCode: z.string().regex(SOC_CODE),
}).strict();

const estimateSchema = z.object({
  area: z.string().refine((value) => value === 'US' || isStateCode(value), 'Area must be US or a state code'),
  occCode: z.string().regex(SOC_CODE),
  employment: z.number().int().nonnegative().nullable(),
  jobsPer1000: z.number().finite().nonnegative().nullable(),
  locationQuotient: z.number().finite().nonnegative().nullable(),
  hourlyMean: z.number().finite().min(2).max(1_000).nullable(),
  annualMean: z.number().finite().min(5_000).max(2_000_000).nullable(),
  hourly: percentilesSchema,
  annual: percentilesSchema,
  wageBasis: z.enum(OEWS_WAGE_BASES),
  atOrAboveWageCap: z.boolean(),
}).strict();

export const blsOewsSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal(BLS_OEWS_ADAPTER_VERSION),
  snapshotId: z.string().min(1),
  provider: z.literal('U.S. Bureau of Labor Statistics'),
  datasetId: z.literal('bls-oews'),
  observationPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  referenceLabel: z.string().min(1),
  sourceStatus: z.literal('final'),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  nationalSourceUrl: z.string().url(),
  sourceDocumentationUrl: z.literal(BLS_OEWS_DOCUMENTATION_URL),
  attribution: z.string().min(1),
  semantics: z.string().min(1),
  annualWageCap: z.literal(OEWS_ANNUAL_WAGE_CAP),
  hourlyWageCap: z.literal(OEWS_HOURLY_WAGE_CAP),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string()).min(1),
  occupations: z.array(occupationSchema).min(700),
  estimates: z.array(estimateSchema).min(30_000),
}).strict().superRefine((snapshot, context) => {
  const expectedSnapshotId = `bls-oews-${snapshot.observationPeriod}-v1`;
  if (snapshot.snapshotId !== expectedSnapshotId) {
    context.addIssue({ code: 'custom', path: ['snapshotId'], message: `Snapshot ID must be ${expectedSnapshotId}.` });
  }
  const known = new Set(snapshot.occupations.map((occupation) => occupation.code));
  if (known.size !== snapshot.occupations.length) {
    context.addIssue({ code: 'custom', path: ['occupations'], message: 'Occupation codes must be unique.' });
  }
  const slugs = new Set(snapshot.occupations.map((occupation) => occupation.slug));
  if (slugs.size !== snapshot.occupations.length) {
    context.addIssue({ code: 'custom', path: ['occupations'], message: 'Occupation slugs must be unique.' });
  }
  const seen = new Set<string>();
  const areas = new Set<string>();
  for (const [index, estimate] of snapshot.estimates.entries()) {
    if (!known.has(estimate.occCode)) {
      context.addIssue({ code: 'custom', path: ['estimates', index, 'occCode'], message: `${estimate.occCode} is not in the occupation list.` });
      break;
    }
    const key = `${estimate.area}:${estimate.occCode}`;
    if (seen.has(key)) {
      context.addIssue({ code: 'custom', path: ['estimates', index], message: `Duplicate estimate for ${key}.` });
      break;
    }
    seen.add(key);
    areas.add(estimate.area);
  }
  const missingStates = STATE_CODES.filter((state) => !areas.has(state));
  if (missingStates.length > 0) {
    context.addIssue({ code: 'custom', path: ['estimates'], message: `No estimates for ${missingStates.join(', ')}.` });
  }
  if (!areas.has('US')) {
    context.addIssue({ code: 'custom', path: ['estimates'], message: 'National estimates are missing.' });
  }
});

/** One OEWS workbook sheet: its header row, then its data rows. */
export type OewsTable = {
  header: readonly (string | null)[];
  rows: Iterable<readonly (string | null)[]>;
};

const REQUIRED_COLUMNS = [
  'AREA_TYPE', 'PRIM_STATE', 'I_GROUP', 'OCC_CODE', 'OCC_TITLE', 'O_GROUP',
  'TOT_EMP', 'JOBS_1000', 'LOC_QUOTIENT', 'H_MEAN', 'A_MEAN',
  'H_PCT10', 'H_PCT25', 'H_MEDIAN', 'H_PCT75', 'H_PCT90',
  'A_PCT10', 'A_PCT25', 'A_MEDIAN', 'A_PCT75', 'A_PCT90',
  'ANNUAL', 'HOURLY',
] as const;

/**
 * Values OEWS publishes instead of a number.
 *
 * `*` and `**` are suppressions, `~` means the estimate rounds below the
 * smallest publishable share, and `#` means the wage is at or above the survey's
 * top code. Only `#` carries information about the wage itself.
 */
const NOT_PUBLISHED = new Set(['', '*', '**', '~']);
const AT_OR_ABOVE_CAP = '#';

const MEASURE_BOUNDS: Record<string, { min: number; max: number }> = {
  TOT_EMP: { min: 0, max: 200_000_000 },
  JOBS_1000: { min: 0, max: 1_000 },
  LOC_QUOTIENT: { min: 0, max: 200 },
  H_MEAN: { min: 2, max: 1_000 },
  A_MEAN: { min: 5_000, max: 2_000_000 },
};
const HOURLY_BOUNDS = { min: 2, max: 1_000 };
const ANNUAL_BOUNDS = { min: 5_000, max: 2_000_000 };

/**
 * Whether a title is one of the survey's catch-all buckets.
 *
 * Matched on the suffix rather than a substring: "All Other Personal Service
 * Workers" would be a real occupation if BLS published one, while
 * "…Workers, All Other" is the residual.
 */
export function isResidualOccupationTitle(title: string): boolean {
  return /,\s*All Other$/i.test(title.trim());
}

/**
 * The title with the survey's classification clauses removed.
 *
 * Only two things are cut, both of them bookkeeping rather than meaning: the
 * ", Except …" exclusion that keeps categories from overlapping, and a trailing
 * ", All Other". Compound titles that genuinely name several jobs at once are
 * left alone — shortening "Grinding, Lapping, Polishing, and Buffing Machine
 * Tool Setters" would name a different, narrower job than the one measured.
 */
export function oewsDisplayTitle(title: string): string {
  const withoutExclusion = title.split(/,\s+Except\b/)[0];
  return withoutExclusion.replace(/,\s*All Other$/i, '').trim().replace(/,$/, '');
}

/**
 * A URL segment for an occupation title.
 *
 * BLS titles carry commas, slashes and parenthetical exclusions, all of which
 * collapse to single hyphens. `&` becomes the word rather than disappearing,
 * because "sales-and-related" is the phrase a reader would type and
 * "sales-related" is not. Two titles can therefore normalize to one slug; that
 * is caught by the uniqueness check in `normalizeOewsWorkbooks`, which fails
 * the release rather than letting one occupation quietly take another's URL.
 */
export function oewsOccupationSlug(title: string): string {
  return title
    .toLowerCase()
    .replaceAll('&', ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function columnReader(table: OewsTable, label: string): (row: readonly (string | null)[], column: string) => string | null {
  const indexByName = new Map<string, number>();
  table.header.forEach((name, index) => {
    if (typeof name === 'string' && name.length > 0) indexByName.set(name.trim().toUpperCase(), index);
  });
  const missing = REQUIRED_COLUMNS.filter((column) => !indexByName.has(column));
  if (missing.length > 0) throw new Error(`OEWS ${label} workbook is missing columns: ${missing.join(', ')}.`);
  return function read(row, column) {
    const index = indexByName.get(column);
    if (index === undefined) throw new Error(`OEWS ${label} workbook has no ${column} column.`);
    return row[index] ?? null;
  };
}

function parseMeasure(
  raw: string | null,
  column: string,
  bounds: { min: number; max: number },
  where: string,
): { value: number | null; capped: boolean } {
  const text = (raw ?? '').trim();
  if (NOT_PUBLISHED.has(text)) return { value: null, capped: false };
  if (text === AT_OR_ABOVE_CAP) return { value: null, capped: true };
  const value = Number(text.replaceAll(',', ''));
  if (!Number.isFinite(value)) throw new Error(`OEWS ${where} has unreadable ${column} value ${JSON.stringify(raw)}.`);
  if (value < bounds.min || value > bounds.max) {
    throw new Error(`OEWS ${where} ${column} of ${value} is outside the plausible range ${bounds.min}–${bounds.max}.`);
  }
  return { value, capped: false };
}

function assertMonotonic(percentiles: OewsWagePercentiles, kind: string, where: string): void {
  const ordered = [percentiles.p10, percentiles.p25, percentiles.median, percentiles.p75, percentiles.p90];
  let previous: number | null = null;
  for (const value of ordered) {
    if (value === null) continue;
    if (previous !== null && value < previous) {
      throw new Error(`OEWS ${where} ${kind} percentiles are not in ascending order.`);
    }
    previous = value;
  }
}

const REFERENCE_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function oewsReferenceLabel(observationPeriod: string): string {
  const match = observationPeriod.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) throw new Error(`Invalid OEWS observation period: ${observationPeriod}`);
  return `${REFERENCE_MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
}

export function normalizeOewsWorkbooks(input: {
  national: OewsTable;
  state: OewsTable;
  observationPeriod: string;
  fetchedAt: string;
  publishedAt: string;
  rawSha256: string;
  sourceUrl: string;
  nationalSourceUrl: string;
}): Omit<BlsOewsSnapshot, 'normalizedSha256'> {
  const referenceLabel = oewsReferenceLabel(input.observationPeriod);
  const occupations = new Map<string, OewsOccupation>();
  const estimates: OewsEstimate[] = [];
  const acceptedGroups = new Set<string>(OEWS_OCCUPATION_GROUPS);

  function ingest(table: OewsTable, label: string, expectedAreaType: '1' | '2'): void {
    const read = columnReader(table, label);
    for (const row of table.rows) {
      if (read(row, 'AREA_TYPE') !== expectedAreaType) continue;
      const group = (read(row, 'O_GROUP') ?? '').trim();
      if (!acceptedGroups.has(group)) continue;
      // A future release that adds industry detail would otherwise silently
      // double-count every occupation across NAICS sectors.
      if ((read(row, 'I_GROUP') ?? '').trim() !== 'cross-industry') continue;

      const occCode = (read(row, 'OCC_CODE') ?? '').trim();
      if (!SOC_CODE.test(occCode)) throw new Error(`OEWS ${label} row has a non-SOC occupation code ${JSON.stringify(occCode)}.`);
      const title = (read(row, 'OCC_TITLE') ?? '').trim();
      if (title.length === 0) throw new Error(`OEWS ${label} row for ${occCode} has no occupation title.`);

      const primaryState = (read(row, 'PRIM_STATE') ?? '').trim();
      let area: OewsAreaId;
      if (expectedAreaType === '1') {
        if (primaryState !== 'US') throw new Error(`OEWS national row for ${occCode} is stamped ${primaryState}, not US.`);
        area = 'US';
      } else {
        if (!isStateCode(primaryState)) continue;
        area = primaryState;
      }
      const where = `${area} ${occCode}`;

      const existing = occupations.get(occCode);
      if (existing && existing.title !== title) {
        throw new Error(`OEWS publishes ${occCode} as both "${existing.title}" and "${title}".`);
      }
      if (!existing) {
        const displayTitle = oewsDisplayTitle(title);
        const slug = oewsOccupationSlug(displayTitle);
        if (slug.length === 0) throw new Error(`OEWS occupation "${title}" (${occCode}) produces an empty slug.`);
        occupations.set(occCode, {
          code: occCode,
          title,
          displayTitle,
          slug,
          residual: isResidualOccupationTitle(title),
          group: group as OewsOccupationGroup,
          majorCode: `${occCode.slice(0, 2)}-0000`,
        });
      }

      const employment = parseMeasure(read(row, 'TOT_EMP'), 'TOT_EMP', MEASURE_BOUNDS.TOT_EMP, where);
      const hourlyMean = parseMeasure(read(row, 'H_MEAN'), 'H_MEAN', MEASURE_BOUNDS.H_MEAN, where);
      const annualMean = parseMeasure(read(row, 'A_MEAN'), 'A_MEAN', MEASURE_BOUNDS.A_MEAN, where);
      const hourlyCells = (['H_PCT10', 'H_PCT25', 'H_MEDIAN', 'H_PCT75', 'H_PCT90'] as const)
        .map((column) => parseMeasure(read(row, column), column, HOURLY_BOUNDS, where));
      const annualCells = (['A_PCT10', 'A_PCT25', 'A_MEDIAN', 'A_PCT75', 'A_PCT90'] as const)
        .map((column) => parseMeasure(read(row, column), column, ANNUAL_BOUNDS, where));

      const hourly: OewsWagePercentiles = {
        p10: hourlyCells[0].value, p25: hourlyCells[1].value, median: hourlyCells[2].value,
        p75: hourlyCells[3].value, p90: hourlyCells[4].value,
      };
      const annual: OewsWagePercentiles = {
        p10: annualCells[0].value, p25: annualCells[1].value, median: annualCells[2].value,
        p75: annualCells[3].value, p90: annualCells[4].value,
      };
      assertMonotonic(hourly, 'hourly', where);
      assertMonotonic(annual, 'annual', where);

      if (hourlyMean.value !== null && annualMean.value !== null) {
        const impliedHours = annualMean.value / hourlyMean.value;
        if (Math.abs(impliedHours - OEWS_ANNUAL_HOURS) > OEWS_ANNUAL_HOURS * 0.01) {
          throw new Error(`OEWS ${where} implies a ${impliedHours.toFixed(0)}-hour year, not ${OEWS_ANNUAL_HOURS}. The wage units may have changed.`);
        }
      }

      const annualOnly = (read(row, 'ANNUAL') ?? '').trim().toUpperCase() === 'TRUE';
      const hourlyOnly = (read(row, 'HOURLY') ?? '').trim().toUpperCase() === 'TRUE';
      if (annualOnly && hourlyOnly) throw new Error(`OEWS ${where} is flagged as both annual-only and hourly-only.`);

      estimates.push({
        area,
        occCode,
        employment: employment.value === null ? null : Math.round(employment.value),
        jobsPer1000: parseMeasure(read(row, 'JOBS_1000'), 'JOBS_1000', MEASURE_BOUNDS.JOBS_1000, where).value,
        locationQuotient: parseMeasure(read(row, 'LOC_QUOTIENT'), 'LOC_QUOTIENT', MEASURE_BOUNDS.LOC_QUOTIENT, where).value,
        hourlyMean: hourlyMean.value,
        annualMean: annualMean.value,
        hourly,
        annual,
        wageBasis: annualOnly ? 'annual-only' : hourlyOnly ? 'hourly-only' : 'both',
        atOrAboveWageCap: [hourlyMean, annualMean, ...hourlyCells, ...annualCells].some((cell) => cell.capped),
      });
    }
  }

  ingest(input.national, 'national', '1');
  ingest(input.state, 'state', '2');

  // Snapshot bytes are hashed, so the order they are written in has to be a
  // property of the data rather than of the order two workbooks were read.
  const areaRank = new Map<string, number>([['US', -1], ...STATE_CODES.map((state, index) => [state, index] as [string, number])]);
  estimates.sort((left, right) => {
    const areaDelta = (areaRank.get(left.area) ?? 0) - (areaRank.get(right.area) ?? 0);
    return areaDelta !== 0 ? areaDelta : left.occCode.localeCompare(right.occCode);
  });
  const occupationList = [...occupations.values()].sort((left, right) => left.code.localeCompare(right.code));

  const statesCovered = new Set(estimates.filter((estimate) => estimate.area !== 'US').map((estimate) => estimate.area));
  const missingStates = STATE_CODES.filter((state) => !statesCovered.has(state));
  if (missingStates.length > 0) throw new Error(`OEWS release is missing every estimate for ${missingStates.join(', ')}.`);

  const slugOwners = new Map<string, string>();
  for (const occupation of occupationList) {
    const owner = slugOwners.get(occupation.slug);
    if (owner) throw new Error(`OEWS occupations ${owner} and ${occupation.code} both slug to "${occupation.slug}".`);
    slugOwners.set(occupation.slug, occupation.code);
  }

  const detailedCodes = occupationList.filter((occupation) => occupation.group === 'detailed');
  if (detailedCodes.length < 700) throw new Error(`OEWS release published only ${detailedCodes.length} detailed occupations; at least 700 are expected.`);

  const nationalTotal = estimates.find((estimate) => estimate.area === 'US' && estimate.occCode === '00-0000');
  if (!nationalTotal?.annualMean) throw new Error('OEWS release has no national all-occupations mean wage.');
  if (nationalTotal.annualMean < 40_000 || nationalTotal.annualMean > 150_000) {
    throw new Error(`National all-occupations mean wage of ${nationalTotal.annualMean} is outside the plausible range.`);
  }

  const withAnnualMedian = estimates.filter((estimate) => estimate.annual.median !== null).length;
  const coverage = withAnnualMedian / estimates.length;
  if (coverage < 0.9) throw new Error(`Only ${(coverage * 100).toFixed(1)}% of OEWS estimates carry an annual median wage; at least 90% are expected.`);

  for (const state of STATE_CODES) {
    const total = estimates.find((estimate) => estimate.area === state && estimate.occCode === '00-0000');
    if (!total?.annualMean) throw new Error(`OEWS release has no all-occupations mean wage for ${state}.`);
  }

  return {
    schemaVersion: '1.0.0',
    adapterVersion: BLS_OEWS_ADAPTER_VERSION,
    snapshotId: `bls-oews-${input.observationPeriod}-v1`,
    provider: 'U.S. Bureau of Labor Statistics',
    datasetId: 'bls-oews',
    observationPeriod: input.observationPeriod,
    referenceLabel,
    sourceStatus: 'final',
    fetchedAt: input.fetchedAt,
    verifiedAt: input.fetchedAt,
    publishedAt: input.publishedAt,
    sourceUrl: input.sourceUrl,
    nationalSourceUrl: input.nationalSourceUrl,
    sourceDocumentationUrl: BLS_OEWS_DOCUMENTATION_URL,
    attribution: `BLS Occupational Employment and Wage Statistics, ${referenceLabel} estimates. Cross-industry wages for wage and salary workers; the self-employed are not surveyed.`,
    semantics: `OEWS wages are survey estimates for ${referenceLabel}, not offers or current postings. Wages at or above ${OEWS_ANNUAL_WAGE_CAP.toLocaleString('en-US')} a year are published only as "at or above the top code". Estimates BLS could not publish are absent rather than zero.`,
    annualWageCap: OEWS_ANNUAL_WAGE_CAP,
    hourlyWageCap: OEWS_HOURLY_WAGE_CAP,
    rawSha256: input.rawSha256,
    validationStatus: 'passed',
    validationReport: [
      `All 51 states and DC published an all-occupations wage for ${referenceLabel}.`,
      `${detailedCodes.length} detailed occupations across ${estimates.length.toLocaleString('en-US')} area estimates.`,
      'Wage percentiles ascend within every published row.',
      `Annual and hourly means agree on a ${OEWS_ANNUAL_HOURS}-hour year within 1%.`,
      `${(coverage * 100).toFixed(1)}% of estimates carry a published annual median wage.`,
      `${occupationList.length} occupation titles produced ${slugOwners.size} distinct URL slugs.`,
      'Suppressed estimates are stored as null; top-coded wages are flagged, not invented.',
    ],
    occupations: occupationList,
    estimates,
  };
}

/**
 * The part of an OEWS release small enough to ship inside the application.
 *
 * The full release is 20 MB of wage rows — more than the whole Worker bundle —
 * so wage figures are served from D1 and only this index travels with the code.
 * It carries what page generation needs before any wage is read: which
 * occupations exist, and which occupation/state pairs OEWS actually published a
 * wage for. Pairs BLS suppressed are absent here, so a page is never generated
 * for a combination that would have nothing to say.
 */
export type BlsOewsIndex = {
  schemaVersion: '1.0.0';
  snapshotId: string;
  observationPeriod: string;
  referenceLabel: string;
  sourceStatus: 'final';
  publishedAt: string;
  fetchedAt: string;
  normalizedSha256: string;
  annualWageCap: number;
  occupations: OewsOccupation[];
  /** State code to the indexes, into `occupations`, that state published a wage for. */
  coverageByState: Record<string, number[]>;
  /** Indexes, into `occupations`, the national estimate published a wage for. */
  nationalCoverage: number[];
};

export const blsOewsIndexSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  snapshotId: z.string().min(1),
  observationPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  referenceLabel: z.string().min(1),
  sourceStatus: z.literal('final'),
  publishedAt: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  annualWageCap: z.literal(OEWS_ANNUAL_WAGE_CAP),
  occupations: z.array(occupationSchema).min(700),
  coverageByState: z.record(z.string().length(2), z.array(z.number().int().nonnegative()).min(1)),
  nationalCoverage: z.array(z.number().int().nonnegative()).min(700),
}).strict().superRefine((index, context) => {
  const missing = STATE_CODES.filter((state) => !index.coverageByState[state]?.length);
  if (missing.length > 0) {
    context.addIssue({ code: 'custom', path: ['coverageByState'], message: `No covered occupations for ${missing.join(', ')}.` });
  }
  const limit = index.occupations.length;
  for (const [state, indexes] of Object.entries(index.coverageByState)) {
    if (indexes.some((value) => value >= limit)) {
      context.addIssue({ code: 'custom', path: ['coverageByState', state], message: `${state} references an occupation beyond the list.` });
      break;
    }
  }
});

/**
 * Whether an estimate can carry a page of its own.
 *
 * A detailed occupation with a published median wage and an employment count is
 * the minimum for a page that answers "how much does this job pay here" with
 * something OEWS actually measured. Everything else — suppressed wages, rolled
 * up major groups, the all-occupations total, and the residual "All Other"
 * buckets nobody searches for — belongs on a hub, not a page.
 */
export function isPageWorthyEstimate(estimate: OewsEstimate, occupation: OewsOccupation): boolean {
  return occupation.group === 'detailed'
    && !occupation.residual
    && estimate.employment !== null
    && (estimate.annual.median !== null || estimate.hourly.median !== null);
}

export function deriveOewsIndex(snapshot: BlsOewsSnapshot): BlsOewsIndex {
  const occupationIndexByCode = new Map(snapshot.occupations.map((occupation, index) => [occupation.code, index]));
  const coverageByState: Record<string, number[]> = {};
  const nationalCoverage: number[] = [];

  for (const estimate of snapshot.estimates) {
    const occupationIndex = occupationIndexByCode.get(estimate.occCode);
    if (occupationIndex === undefined) throw new Error(`OEWS estimate references unknown occupation ${estimate.occCode}.`);
    if (!isPageWorthyEstimate(estimate, snapshot.occupations[occupationIndex])) continue;
    if (estimate.area === 'US') nationalCoverage.push(occupationIndex);
    else (coverageByState[estimate.area] ??= []).push(occupationIndex);
  }

  for (const indexes of [nationalCoverage, ...Object.values(coverageByState)]) indexes.sort((left, right) => left - right);

  return {
    schemaVersion: '1.0.0',
    snapshotId: snapshot.snapshotId,
    observationPeriod: snapshot.observationPeriod,
    referenceLabel: snapshot.referenceLabel,
    sourceStatus: snapshot.sourceStatus,
    publishedAt: snapshot.publishedAt,
    fetchedAt: snapshot.fetchedAt,
    normalizedSha256: snapshot.normalizedSha256,
    annualWageCap: snapshot.annualWageCap,
    occupations: snapshot.occupations,
    coverageByState,
    nationalCoverage,
  };
}

/**
 * The wage rows, packed small enough to travel with the application.
 *
 * A row per estimate costs 12 MB, which no Worker may hold. The same numbers as
 * integer columns cost 2.7 MB, because OEWS publishes annual wages in whole tens
 * of dollars and hourly wages in whole cents — so both are exact integers once
 * scaled, and the packing loses nothing. `deriveOewsWages` proves that on every
 * value it writes rather than trusting the claim.
 *
 * Deriving one basis from the other was measured and rejected: BLS rounds the
 * annual figure to the nearest ten independently of the hourly one, so an
 * hourly wage recomputed as annual ÷ 2,080 differs by a cent on 12% of values.
 * A site that asks readers to check its numbers against the source cannot
 * quietly publish a different number than the source did.
 */
export const OEWS_ABSENT = -1;
/** Annual wages are whole tens of dollars; hourly wages are whole cents. */
export const OEWS_ANNUAL_SCALE = 10;
export const OEWS_HOURLY_SCALE = 100;
export const OEWS_JOBS_PER_1000_SCALE = 1_000;
export const OEWS_LOCATION_QUOTIENT_SCALE = 100;

export const OEWS_WAGE_COLUMNS = [
  'employment', 'jobsPer1000', 'locationQuotient',
  'annualMean', 'annualP10', 'annualP25', 'annualMedian', 'annualP75', 'annualP90',
  'hourlyMean', 'hourlyP10', 'hourlyP25', 'hourlyMedian', 'hourlyP75', 'hourlyP90',
] as const;
export type OewsWageColumn = (typeof OEWS_WAGE_COLUMNS)[number];

export type BlsOewsWages = {
  schemaVersion: '1.0.0';
  snapshotId: string;
  /** Hash of the snapshot these columns were packed from. */
  normalizedSha256: string;
  rowCount: number;
  /** Areas in row order: `US` first, then state codes. */
  areas: string[];
  /** Row offset where each area's block starts, plus a final end offset. */
  areaOffsets: number[];
  /** Per row, an index into the index file's occupation list. Ascending inside an area. */
  occupationIndexes: number[];
  /** Per row: 0 both, 1 annual-only, 2 hourly-only. */
  wageBasis: number[];
  /** Per row, bit 0 set when a wage was published only as "at or above the top code". */
  flags: number[];
  columns: Record<OewsWageColumn, number[]>;
};

export const blsOewsWagesSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  snapshotId: z.string().min(1),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  rowCount: z.number().int().positive(),
  areas: z.array(z.string().min(2).max(2)).min(52),
  areaOffsets: z.array(z.number().int().nonnegative()).min(53),
  occupationIndexes: z.array(z.number().int().nonnegative()),
  wageBasis: z.array(z.number().int().min(0).max(2)),
  flags: z.array(z.number().int().min(0).max(1)),
  columns: z.object(
    Object.fromEntries(OEWS_WAGE_COLUMNS.map((column) => [column, z.array(z.number().int())])) as
      Record<OewsWageColumn, z.ZodArray<z.ZodNumber>>,
  ).strict(),
}).strict().superRefine((wages, context) => {
  const expectedLengths = [wages.occupationIndexes, wages.wageBasis, wages.flags, ...Object.values(wages.columns)];
  if (expectedLengths.some((column) => column.length !== wages.rowCount)) {
    context.addIssue({ code: 'custom', path: ['columns'], message: 'Every column must hold exactly rowCount values.' });
  }
  if (wages.areaOffsets.length !== wages.areas.length + 1) {
    context.addIssue({ code: 'custom', path: ['areaOffsets'], message: 'There must be one offset per area plus a final end offset.' });
  }
  if (wages.areaOffsets.at(-1) !== wages.rowCount) {
    context.addIssue({ code: 'custom', path: ['areaOffsets'], message: 'The final offset must be the row count.' });
  }
});

const WAGE_BASIS_CODES: Record<OewsWageBasis, number> = { both: 0, 'annual-only': 1, 'hourly-only': 2 };
export const OEWS_WAGE_BASIS_BY_CODE = ['both', 'annual-only', 'hourly-only'] as const satisfies readonly OewsWageBasis[];

function packScaled(value: number | null, scale: number, label: string): number {
  if (value === null) return OEWS_ABSENT;
  if (value < 0) throw new Error(`OEWS ${label} of ${value} is negative, which the packed encoding reserves for absent values.`);
  const packed = Math.round(value * scale);
  if (Math.abs(packed / scale - value) > Number.EPSILON * Math.max(1, Math.abs(value))) {
    throw new Error(`OEWS ${label} of ${value} does not survive packing at a scale of ${scale}.`);
  }
  return packed;
}

export function deriveOewsWages(snapshot: BlsOewsSnapshot): BlsOewsWages {
  const occupationIndexByCode = new Map(snapshot.occupations.map((occupation, index) => [occupation.code, index]));
  const areas: string[] = [];
  const areaOffsets: number[] = [];
  const occupationIndexes: number[] = [];
  const wageBasis: number[] = [];
  const flags: number[] = [];
  const columns = Object.fromEntries(OEWS_WAGE_COLUMNS.map((column) => [column, [] as number[]])) as Record<OewsWageColumn, number[]>;

  let previousArea: string | undefined;
  for (const estimate of snapshot.estimates) {
    if (estimate.area !== previousArea) {
      // Rows arrive grouped by area and ascending by occupation inside it, which
      // is what lets a lookup binary-search one area's block instead of building
      // a 37,000-entry map on every cold start.
      if (areas.includes(estimate.area)) throw new Error(`OEWS estimates for ${estimate.area} are not contiguous.`);
      areas.push(estimate.area);
      areaOffsets.push(occupationIndexes.length);
      previousArea = estimate.area;
    }
    const occupationIndex = occupationIndexByCode.get(estimate.occCode);
    if (occupationIndex === undefined) throw new Error(`OEWS estimate references unknown occupation ${estimate.occCode}.`);
    const lastInArea = occupationIndexes.at(-1);
    if (lastInArea !== undefined && occupationIndexes.length > areaOffsets.at(-1)! && occupationIndex <= lastInArea) {
      throw new Error(`OEWS estimates for ${estimate.area} are not ascending by occupation at ${estimate.occCode}.`);
    }
    occupationIndexes.push(occupationIndex);
    wageBasis.push(WAGE_BASIS_CODES[estimate.wageBasis]);
    flags.push(estimate.atOrAboveWageCap ? 1 : 0);

    const where = `${estimate.area} ${estimate.occCode}`;
    columns.employment.push(packScaled(estimate.employment, 1, `${where} employment`));
    columns.jobsPer1000.push(packScaled(estimate.jobsPer1000, OEWS_JOBS_PER_1000_SCALE, `${where} jobs per 1,000`));
    columns.locationQuotient.push(packScaled(estimate.locationQuotient, OEWS_LOCATION_QUOTIENT_SCALE, `${where} location quotient`));
    columns.annualMean.push(packScaled(estimate.annualMean, OEWS_ANNUAL_SCALE, `${where} annual mean`));
    columns.hourlyMean.push(packScaled(estimate.hourlyMean, OEWS_HOURLY_SCALE, `${where} hourly mean`));
    for (const [suffix, key] of [['P10', 'p10'], ['P25', 'p25'], ['Median', 'median'], ['P75', 'p75'], ['P90', 'p90']] as const) {
      columns[`annual${suffix}`].push(packScaled(estimate.annual[key], OEWS_ANNUAL_SCALE, `${where} annual ${key}`));
      columns[`hourly${suffix}`].push(packScaled(estimate.hourly[key], OEWS_HOURLY_SCALE, `${where} hourly ${key}`));
    }
  }
  areaOffsets.push(occupationIndexes.length);

  return {
    schemaVersion: '1.0.0',
    snapshotId: snapshot.snapshotId,
    normalizedSha256: snapshot.normalizedSha256,
    rowCount: occupationIndexes.length,
    areas,
    areaOffsets,
    occupationIndexes,
    wageBasis,
    flags,
    columns,
  };
}

function unpackScaled(packed: number, scale: number): number | null {
  return packed === OEWS_ABSENT ? null : packed / scale;
}

/**
 * Rebuild one estimate from the packed columns.
 *
 * The area is passed in rather than looked up: every caller reaches a row by
 * choosing an area first, so searching the offsets again would re-derive
 * something already known once per row.
 */
export function unpackOewsEstimate(
  wages: BlsOewsWages,
  occupations: readonly OewsOccupation[],
  row: number,
  area: OewsAreaId,
): OewsEstimate {
  const occupation = occupations[wages.occupationIndexes[row]];
  if (!occupation) throw new Error(`OEWS row ${row} references an occupation outside the index.`);
  const column = (name: OewsWageColumn) => wages.columns[name][row];
  return {
    area,
    occCode: occupation.code,
    employment: unpackScaled(column('employment'), 1),
    jobsPer1000: unpackScaled(column('jobsPer1000'), OEWS_JOBS_PER_1000_SCALE),
    locationQuotient: unpackScaled(column('locationQuotient'), OEWS_LOCATION_QUOTIENT_SCALE),
    hourlyMean: unpackScaled(column('hourlyMean'), OEWS_HOURLY_SCALE),
    annualMean: unpackScaled(column('annualMean'), OEWS_ANNUAL_SCALE),
    hourly: {
      p10: unpackScaled(column('hourlyP10'), OEWS_HOURLY_SCALE),
      p25: unpackScaled(column('hourlyP25'), OEWS_HOURLY_SCALE),
      median: unpackScaled(column('hourlyMedian'), OEWS_HOURLY_SCALE),
      p75: unpackScaled(column('hourlyP75'), OEWS_HOURLY_SCALE),
      p90: unpackScaled(column('hourlyP90'), OEWS_HOURLY_SCALE),
    },
    annual: {
      p10: unpackScaled(column('annualP10'), OEWS_ANNUAL_SCALE),
      p25: unpackScaled(column('annualP25'), OEWS_ANNUAL_SCALE),
      median: unpackScaled(column('annualMedian'), OEWS_ANNUAL_SCALE),
      p75: unpackScaled(column('annualP75'), OEWS_ANNUAL_SCALE),
      p90: unpackScaled(column('annualP90'), OEWS_ANNUAL_SCALE),
    },
    wageBasis: OEWS_WAGE_BASIS_BY_CODE[wages.wageBasis[row]],
    atOrAboveWageCap: (wages.flags[row] & 1) === 1,
  };
}

/**
 * Prove the packed columns reproduce the release exactly.
 *
 * Packing is only worth doing if it is provably lossless, and "provably" here
 * means every value of every row, at publication time, not a spot check. This
 * runs in the ingest so a release that would have shipped an altered wage never
 * reaches a snapshot file at all.
 */
export function verifyOewsWagesRoundTrip(snapshot: BlsOewsSnapshot, wages: BlsOewsWages): void {
  if (wages.rowCount !== snapshot.estimates.length) {
    throw new Error(`Packed OEWS wages hold ${wages.rowCount} rows, not the snapshot's ${snapshot.estimates.length}.`);
  }
  for (const [row, expected] of snapshot.estimates.entries()) {
    const areaPosition = wages.areas.indexOf(expected.area);
    if (areaPosition === -1 || row < wages.areaOffsets[areaPosition] || row >= wages.areaOffsets[areaPosition + 1]) {
      throw new Error(`Packed OEWS row ${row} does not fall inside the block for ${expected.area}.`);
    }
    const actual = unpackOewsEstimate(wages, snapshot.occupations, row, expected.area);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Packed OEWS row ${row} (${expected.area} ${expected.occCode}) does not reproduce the snapshot.`);
    }
  }
}

/**
 * Row holding one area's estimate for one occupation, or -1.
 *
 * Rows are grouped by area and ascending by occupation inside each group, so
 * this is a binary search over one area's block rather than a lookup table
 * built across all 37,000 rows.
 */
export function findOewsRow(wages: BlsOewsWages, area: string, occupationIndex: number): number {
  const areaPosition = wages.areas.indexOf(area);
  if (areaPosition === -1) return -1;
  let low = wages.areaOffsets[areaPosition];
  let high = wages.areaOffsets[areaPosition + 1] - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const candidate = wages.occupationIndexes[middle];
    if (candidate === occupationIndex) return middle;
    if (candidate < occupationIndex) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}
