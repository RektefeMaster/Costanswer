import { z } from 'zod';

export const BLS_CPI_SERIES_ID = 'CUUR0000SA0';
export const BLS_CPI_ADAPTER_VERSION = 'bls-cpi-u-nsa-v1.0.0';
export const BLS_CPI_FIRST_PERIOD = '1913-01';
export const BLS_CPI_API_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
export const BLS_UNREGISTERED_YEAR_SPAN = 10;

const observationPeriodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const cpiObservationSchema = z.object({
  period: observationPeriodSchema,
  index: z.number().finite().positive(),
}).strict();

export const blsCpiSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal(BLS_CPI_ADAPTER_VERSION),
  snapshotId: z.string().min(1),
  provider: z.literal('U.S. Bureau of Labor Statistics'),
  datasetId: z.literal('CU'),
  seriesId: z.literal(BLS_CPI_SERIES_ID),
  frequency: z.literal('monthly'),
  observationPeriod: observationPeriodSchema,
  sourceStatus: z.literal('preliminary'),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  sourceDocumentationUrl: z.string().url(),
  termsUrl: z.string().url(),
  attribution: z.string(),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string()).min(1),
  observations: z.array(cpiObservationSchema).min(1_200),
}).strict().superRefine((snapshot, context) => {
  const expectedSnapshotId = `bls-cpi-u-nsa-${snapshot.observationPeriod}-v1`;
  if (snapshot.snapshotId !== expectedSnapshotId) {
    context.addIssue({ code: 'custom', path: ['snapshotId'], message: `Snapshot ID must be ${expectedSnapshotId}.` });
  }
  if (snapshot.observations[0]?.period !== BLS_CPI_FIRST_PERIOD) {
    context.addIssue({ code: 'custom', path: ['observations'], message: `CPI series must begin at ${BLS_CPI_FIRST_PERIOD}.` });
  }
  const last = snapshot.observations.at(-1);
  if (last && last.period !== snapshot.observationPeriod) {
    context.addIssue({ code: 'custom', path: ['observationPeriod'], message: 'Observation period must match the latest CPI month.' });
  }
  const seen = new Set<string>();
  for (const [index, row] of snapshot.observations.entries()) {
    if (seen.has(row.period)) {
      context.addIssue({ code: 'custom', path: ['observations', index, 'period'], message: `Duplicate CPI month: ${row.period}` });
    }
    seen.add(row.period);
    if (index > 0 && row.period <= snapshot.observations[index - 1].period) {
      context.addIssue({ code: 'custom', path: ['observations', index, 'period'], message: 'CPI months must be sorted ascending.' });
      break;
    }
  }
});

export type BlsCpiSnapshot = z.infer<typeof blsCpiSnapshotSchema>;
export type CpiObservation = z.infer<typeof cpiObservationSchema>;

const blsSeriesPointSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
  period: z.string().regex(/^M(0[1-9]|1[0-2])$/),
  value: z.string(),
});

export const blsCpiApiResponseSchema = z.object({
  status: z.literal('REQUEST_SUCCEEDED'),
  Results: z.object({
    series: z.array(z.object({
      seriesID: z.literal(BLS_CPI_SERIES_ID),
      data: z.array(blsSeriesPointSchema).min(1),
    })).length(1),
  }),
});

type SnapshotMetadata = {
  fetchedAt: string;
  rawSha256: string;
};

export function nextMonthPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function blsCpiYearWindows(firstYear = 1913, lastYear = new Date().getUTCFullYear()): Array<{ startyear: string; endyear: string }> {
  if (!Number.isInteger(firstYear) || !Number.isInteger(lastYear) || lastYear < firstYear) {
    throw new Error('CPI year windows need a real first and last year.');
  }
  const windows: Array<{ startyear: string; endyear: string }> = [];
  for (let start = firstYear; start <= lastYear; start += BLS_UNREGISTERED_YEAR_SPAN) {
    const end = Math.min(start + BLS_UNREGISTERED_YEAR_SPAN - 1, lastYear);
    windows.push({ startyear: String(start), endyear: String(end) });
  }
  return windows;
}

export function observationsFromBlsCpiResponse(raw: unknown): CpiObservation[] {
  const parsed = blsCpiApiResponseSchema.parse(raw);
  const observations = parsed.Results.series[0].data.flatMap((point) => {
    if (point.value === '-' || point.value === '.') return [];
    const index = Number(point.value);
    if (!Number.isFinite(index) || index <= 0) throw new Error(`Invalid CPI-U value for ${point.year}-${point.period}.`);
    return [{ period: `${point.year}-${point.period.slice(1)}`, index }];
  });
  if (observations.length === 0) throw new Error('BLS CPI response has no positive monthly observations.');
  return observations;
}

export const BLS_CPI_TIMESERIES_URL = 'https://download.bls.gov/pub/time.series/cu/cu.data.1.AllItems';

export function observationsFromBlsTimeSeries(text: string, seriesId = BLS_CPI_SERIES_ID): CpiObservation[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2 || !/series_id/i.test(lines[0]) || !/\byear\b/i.test(lines[0]) || !/\bperiod\b/i.test(lines[0])) {
    throw new Error('BLS CPI time-series file is missing the series_id/year/period header.');
  }
  const observations: CpiObservation[] = [];
  for (const line of lines.slice(1)) {
    const parts = line.split(/\t/).map((part) => part.trim());
    if (parts.length < 4) continue;
    const [rowSeriesId, year, periodCode, valueText] = parts;
    if (rowSeriesId !== seriesId) continue;
    const monthMatch = /^M(0[1-9]|1[0-2])$/.exec(periodCode);
    if (!monthMatch) continue;
    if (valueText === '-' || valueText === '.' || valueText === '') continue;
    const index = Number(valueText);
    if (!Number.isFinite(index) || index <= 0) {
      throw new Error(`Invalid official CPI-U value for ${year}-${monthMatch[1]}: ${valueText}`);
    }
    observations.push({ period: `${year}-${monthMatch[1]}`, index });
  }
  if (observations.length === 0) throw new Error(`BLS time-series file has no monthly ${seriesId} observations.`);
  const seen = new Set<string>();
  for (const row of observations) {
    if (seen.has(row.period)) throw new Error(`Duplicate CPI month in official file: ${row.period}`);
    seen.add(row.period);
  }
  return observations.sort((left, right) => left.period.localeCompare(right.period));
}

export function mergeCpiObservations(base: CpiObservation[], incoming: CpiObservation[]): CpiObservation[] {
  const byPeriod = new Map(base.map((row) => [row.period, row]));
  for (const row of incoming) {
    const existing = byPeriod.get(row.period);
    if (existing && existing.index !== row.index) {
      throw new Error(`CPI-U value for ${row.period} changed from ${existing.index} to ${row.index}. Review the official revision before replacing the snapshot.`);
    }
    byPeriod.set(row.period, row);
  }
  return [...byPeriod.values()].sort((left, right) => left.period.localeCompare(right.period));
}

export function normalizeBlsCpiObservations(
  observations: CpiObservation[],
  metadata: SnapshotMetadata,
): Omit<BlsCpiSnapshot, 'normalizedSha256'> {
  const sorted = [...observations].sort((left, right) => left.period.localeCompare(right.period));
  const latest = sorted.at(-1);
  if (!latest) throw new Error('CPI snapshot has no observations.');
  if (sorted[0].period !== BLS_CPI_FIRST_PERIOD) {
    throw new Error(`CPI series must begin at ${BLS_CPI_FIRST_PERIOD}, not ${sorted[0].period}.`);
  }
  if (sorted.length < 1_200) throw new Error('CPI series is missing historical months.');
  const seen = new Set<string>();
  const gaps: string[] = [];
  for (const [index, row] of sorted.entries()) {
    if (seen.has(row.period)) throw new Error(`Duplicate CPI month: ${row.period}`);
    seen.add(row.period);
    if (index > 0) {
      const expected = nextMonthPeriod(sorted[index - 1].period);
      if (row.period !== expected) gaps.push(`${sorted[index - 1].period} → ${row.period}`);
    }
  }
  if (gaps.length > 24) throw new Error(`CPI series has too many missing months: ${gaps.join(', ')}`);
  return {
    schemaVersion: '1.0.0',
    adapterVersion: BLS_CPI_ADAPTER_VERSION,
    snapshotId: `bls-cpi-u-nsa-${latest.period}-v1`,
    provider: 'U.S. Bureau of Labor Statistics',
    datasetId: 'CU',
    seriesId: BLS_CPI_SERIES_ID,
    frequency: 'monthly',
    observationPeriod: latest.period,
    sourceStatus: 'preliminary',
    fetchedAt: metadata.fetchedAt,
    verifiedAt: metadata.fetchedAt,
    publishedAt: metadata.fetchedAt,
    sourceUrl: BLS_CPI_TIMESERIES_URL,
    sourceDocumentationUrl: 'https://www.bls.gov/cpi/',
    termsUrl: 'https://www.bls.gov/bls/linksite.htm',
    attribution: 'Source: U.S. Bureau of Labor Statistics, Consumer Price Index for All Urban Consumers (CPI-U), U.S. city average, all items, not seasonally adjusted (CUUR0000SA0).',
    rawSha256: metadata.rawSha256,
    validationStatus: 'passed',
    validationReport: [
      'CPI-U NSA all-items observations are finite, positive, sorted, and unique.',
      `Monthly observations run from ${sorted[0].period} through ${latest.period}.`,
      `${sorted.length} finite positive index values.`,
      gaps.length === 0
        ? 'Every month in the range has a published CPI-U value.'
        : `BLS omitted ${gaps.length} month(s) (${gaps.join('; ')}); those months are not offered in the calculator.`,
    ],
    observations: sorted,
  };
}

export function cpiIndexForPeriod(observations: CpiObservation[], period: string): number {
  const row = observations.find((observation) => observation.period === period);
  if (!row) throw new Error(`No CPI-U observation for ${period}.`);
  return row.index;
}

export function cpiPeriodBounds(observations: CpiObservation[]): { firstPeriod: string; lastPeriod: string; years: number[] } {
  const first = observations[0];
  const last = observations.at(-1);
  if (!first || !last) throw new Error('CPI snapshot has no observations.');
  const firstYear = Number(first.period.slice(0, 4));
  const lastYear = Number(last.period.slice(0, 4));
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  return { firstPeriod: first.period, lastPeriod: last.period, years };
}
