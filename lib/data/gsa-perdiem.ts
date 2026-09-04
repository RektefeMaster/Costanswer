import { z } from 'zod';
import { getStateName, isStateCode } from '@/lib/location/states';

export const GSA_PERDIEM_ADAPTER_VERSION = 'gsa-perdiem-conus-v1.0.0';
export const GSA_PERDIEM_API_URL = 'https://api.gsa.gov/travel/perdiem/v2/rates/conus/lodging';
export const GSA_PERDIEM_RATES_URL = 'https://www.gsa.gov/travel/plan-a-trip/per-diem-rates';
export const GSA_MIE_BREAKDOWN_URL = 'https://www.gsa.gov/travel/plan-book/per-diem-rates/mie-breakdown';

/**
 * GSA publishes lodging caps by federal fiscal year, month by month.
 *
 * Many destinations are seasonal: a beach town's October cap is not its July
 * cap. A trip that crosses a month boundary therefore has to price each night
 * against the month that night falls in, not against one headline number.
 */
export const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;
export type MonthKey = (typeof MONTH_KEYS)[number];

const monthlyLodgingSchema = z.object(
  Object.fromEntries(MONTH_KEYS.map((key) => [key, z.number().finite().positive()])) as Record<
    MonthKey,
    z.ZodNumber
  >,
).strict();

export const perDiemDestinationSchema = z.object({
  /** Stable lookup key: state, then a slug of the destination name. */
  key: z.string().min(1),
  city: z.string().min(1),
  county: z.string().min(1).nullable(),
  state: z.string().refine(isStateCode, 'Destination state must be a CONUS state or D.C.'),
  /** True for the per-state fallback GSA calls the standard rate. */
  isStandardRate: z.boolean(),
  lodgingByMonth: monthlyLodgingSchema,
  mieTotal: z.number().finite().positive(),
}).strict();

/**
 * The M&IE tier table GSA publishes alongside the rates.
 *
 * `firstLastDay` is published as an explicit dollar amount rather than derived,
 * so the figure shown matches GSA's own table exactly instead of a rounding of
 * three quarters of the total.
 */
export const mieBreakdownSchema = z.object({
  total: z.number().finite().positive(),
  breakfast: z.number().finite().nonnegative(),
  lunch: z.number().finite().nonnegative(),
  dinner: z.number().finite().nonnegative(),
  incidentals: z.number().finite().nonnegative(),
  firstLastDay: z.number().finite().positive(),
}).strict();

export const gsaPerDiemSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal(GSA_PERDIEM_ADAPTER_VERSION),
  snapshotId: z.string().min(1),
  provider: z.literal('U.S. General Services Administration'),
  datasetId: z.literal('gsa-perdiem-conus'),
  /** Federal fiscal year, which runs October through September. */
  observationPeriod: z.string().regex(/^\d{4}$/),
  fiscalYear: z.number().int().min(2000).max(2100),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceStatus: z.literal('verified'),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  sourceDocumentationUrl: z.string().url(),
  mieBreakdownUrl: z.string().url(),
  attribution: z.string().min(1),
  firstLastDayShare: z.literal(0.75),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string().min(1)).min(1),
  destinations: z.array(perDiemDestinationSchema).min(1),
  mieBreakdowns: z.array(mieBreakdownSchema).min(1),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict().superRefine((snapshot, context) => {
  const tiers = new Set(snapshot.mieBreakdowns.map((row) => row.total));
  for (const [index, destination] of snapshot.destinations.entries()) {
    if (!tiers.has(destination.mieTotal)) {
      context.addIssue({
        code: 'custom',
        path: ['destinations', index, 'mieTotal'],
        message: `M&IE total ${destination.mieTotal} has no published breakdown.`,
      });
    }
  }
  const keys = new Set(snapshot.destinations.map((row) => row.key));
  if (keys.size !== snapshot.destinations.length) {
    context.addIssue({ code: 'custom', path: ['destinations'], message: 'Destination keys must be unique.' });
  }
  for (const [index, row] of snapshot.mieBreakdowns.entries()) {
    const parts = row.breakfast + row.lunch + row.dinner + row.incidentals;
    if (Math.abs(parts - row.total) > 0.005) {
      context.addIssue({
        code: 'custom',
        path: ['mieBreakdowns', index],
        message: `Meal components ${parts} do not sum to the ${row.total} M&IE total.`,
      });
    }
    if (Math.abs(row.firstLastDay - row.total * 0.75) > 0.005) {
      context.addIssue({
        code: 'custom',
        path: ['mieBreakdowns', index, 'firstLastDay'],
        message: 'Published first and last day amount must equal three quarters of the M&IE total.',
      });
    }
  }
});

export type GsaPerDiemSnapshot = z.infer<typeof gsaPerDiemSnapshotSchema>;
export type PerDiemDestination = z.infer<typeof perDiemDestinationSchema>;
export type MieBreakdown = z.infer<typeof mieBreakdownSchema>;

/**
 * GSA's API repeats the Washington DC metro rate under Maryland and Virginia
 * as well as DC, with the same city name and the same numbers. Those extra
 * rows are the same ceiling, not a different destination, so pickers and ZIP
 * lookups should treat them as the DC rate rather than "District of Columbia, VA".
 */
export function isDuplicateDcMetroRow(destination: PerDiemDestination): boolean {
  return destination.city === 'District of Columbia' && destination.state !== 'DC';
}

export function formatPerDiemDestinationLabel(destination: PerDiemDestination): string {
  if (destination.isStandardRate) {
    const state = isStateCode(destination.state) ? getStateName(destination.state) : destination.state;
    return `${state} standard CONUS rate`;
  }
  if (destination.city === 'District of Columbia') return 'Washington, DC';
  return `${destination.city.trim()}, ${destination.state}`;
}

/**
 * Read the M&IE tier table off GSA's own breakdown page.
 *
 * The API returns only the M&IE total for a destination. How that total splits
 * across meals, and what the first and last day of travel are worth, is
 * published separately, so it is parsed rather than assumed: taking three
 * quarters and rounding would not reproduce GSA's own published figures for
 * every tier.
 */
export function parseMieBreakdowns(pageHtml: string): MieBreakdown[] {
  const text = pageHtml
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

  // Rows read: total, breakfast, lunch, dinner, incidentals, first and last day.
  const rowPattern = /\$(\d+)\s+\$(\d+)\s+\$(\d+)\s+\$(\d+)\s+\$(\d+)\s+\$(\d+(?:\.\d{2})?)/g;
  const seen = new Map<number, MieBreakdown>();
  for (const match of text.matchAll(rowPattern)) {
    const [total, breakfast, lunch, dinner, incidentals, firstLastDay] = match.slice(1).map(Number);
    const components = breakfast + lunch + dinner + incidentals;
    // The page also carries an OCONUS table and unrelated dollar runs; only
    // rows that actually behave like an M&IE tier are accepted.
    if (Math.abs(components - total) > 0.005) continue;
    if (Math.abs(firstLastDay - total * 0.75) > 0.005) continue;
    seen.set(total, { total, breakfast, lunch, dinner, incidentals, firstLastDay });
  }
  const rows = [...seen.values()].sort((left, right) => left.total - right.total);
  if (rows.length < 3) {
    throw new Error(`GSA M&IE breakdown page yielded only ${rows.length} usable tiers; the table layout has probably changed.`);
  }
  return rows;
}

/** GSA's API returns month columns with three-letter capitalised names. */
const API_MONTH_COLUMNS: Record<MonthKey, string> = {
  jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
  jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
};

export function destinationKey(state: string, city: string, county: string | null): string {
  const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return county ? `${state}:${slug(city)}:${slug(county)}` : `${state}:${slug(city)}`;
}

type ApiRow = Record<string, string | null>;

function requireAmount(value: string | null, label: string): number {
  if (value === null) throw new Error(`${label} is missing.`);
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${label} is not a positive amount: ${value}`);
  return amount;
}

/**
 * Returns the snapshot without its hash: `sealNormalizedSnapshot` computes that
 * over exactly this object, and the integrity check recomputes it the same way
 * after stripping the field back off.
 */
export function normalizeGsaPerDiemResponse(
  payload: unknown,
  mieBreakdowns: MieBreakdown[],
  metadata: { fiscalYear: number; fetchedAt: string; rawSha256: string },
): Omit<GsaPerDiemSnapshot, 'normalizedSha256'> {
  if (!Array.isArray(payload)) throw new Error('GSA per diem response must be an array of destinations.');
  const rows = payload as ApiRow[];

  const destinations: PerDiemDestination[] = rows.map((row) => {
    const state = row.State ?? '';
    const city = (row.City ?? '').trim();
    if (!isStateCode(state)) throw new Error(`GSA row has a non-CONUS or unknown state: ${state}`);
    const county = row.County && row.County.trim() !== '' ? row.County : null;
    const isStandardRate = city === 'Standard Rate';
    const lodgingByMonth = Object.fromEntries(
      MONTH_KEYS.map((key) => [key, requireAmount(row[API_MONTH_COLUMNS[key]], `${city}, ${state} ${key} lodging`)]),
    ) as Record<MonthKey, number>;
    return {
      key: destinationKey(state, city, isStandardRate ? null : county),
      city,
      county: isStandardRate ? null : county,
      state,
      isStandardRate,
      lodgingByMonth,
      mieTotal: requireAmount(row.Meals, `${city}, ${state} M&IE`),
    };
  }).sort((left, right) => left.state.localeCompare(right.state) || left.city.localeCompare(right.city) || left.key.localeCompare(right.key));

  const standardCount = destinations.filter((row) => row.isStandardRate).length;
  if (standardCount === 0) throw new Error('GSA response has no standard rate rows to fall back on.');
  const states = new Set(destinations.map((row) => row.state));
  const seasonal = destinations.filter((row) => new Set(Object.values(row.lodgingByMonth)).size > 1).length;

  const { fiscalYear } = metadata;
  return {
    schemaVersion: '1.0.0',
    adapterVersion: GSA_PERDIEM_ADAPTER_VERSION,
    snapshotId: `gsa-perdiem-conus-fy${fiscalYear}-v1`,
    provider: 'U.S. General Services Administration',
    datasetId: 'gsa-perdiem-conus',
    observationPeriod: String(fiscalYear),
    fiscalYear,
    // Federal travel per diem runs on the federal fiscal year.
    effectiveFrom: `${fiscalYear - 1}-10-01`,
    effectiveTo: `${fiscalYear}-09-30`,
    sourceStatus: 'verified',
    fetchedAt: metadata.fetchedAt,
    verifiedAt: metadata.fetchedAt,
    publishedAt: `${fiscalYear - 1}-10-01T00:00:00.000Z`,
    sourceUrl: `${GSA_PERDIEM_API_URL}/${fiscalYear}`,
    sourceDocumentationUrl: GSA_PERDIEM_RATES_URL,
    mieBreakdownUrl: GSA_MIE_BREAKDOWN_URL,
    attribution: `Source: U.S. General Services Administration, FY${fiscalYear} per diem rates for the continental United States (CONUS).`,
    firstLastDayShare: 0.75,
    rawSha256: metadata.rawSha256,
    validationStatus: 'passed',
    validationReport: [
      `${destinations.length} CONUS destinations across ${states.size} states and D.C., each with twelve monthly lodging caps.`,
      `${standardCount} per-state standard rates cover any locality GSA does not list separately.`,
      `${seasonal} destinations have seasonal lodging caps, so a trip is priced month by month.`,
      `M&IE totals resolve to ${mieBreakdowns.length} published tiers, each summing to its meal components.`,
      'Alaska, Hawaii, U.S. territories and foreign locations are not in this dataset. Those are set by DoD and the State Department, not GSA.',
    ],
    destinations,
    mieBreakdowns: [...mieBreakdowns].sort((left, right) => left.total - right.total),
  };
}
