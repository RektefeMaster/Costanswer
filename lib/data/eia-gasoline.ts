import { z } from 'zod';
import {
  EIA_GASOLINE_GEOGRAPHY_CODES,
  isEiaGasolineGeographyCode,
  type EiaGasolineGeographyCode,
} from '@/lib/location/gasoline-geography';
import { isStateCode, US_STATES, type StateCode } from '@/lib/location/states';

export const EIA_GASOLINE_SERIES_BY_CODE: Record<EiaGasolineGeographyCode, string> = {
  NUS: 'EMM_EPMR_PTE_NUS_DPG',
  R10: 'EMM_EPMR_PTE_R10_DPG',
  R1X: 'EMM_EPMR_PTE_R1X_DPG',
  R1Y: 'EMM_EPMR_PTE_R1Y_DPG',
  R1Z: 'EMM_EPMR_PTE_R1Z_DPG',
  R20: 'EMM_EPMR_PTE_R20_DPG',
  R30: 'EMM_EPMR_PTE_R30_DPG',
  R40: 'EMM_EPMR_PTE_R40_DPG',
  R50: 'EMM_EPMR_PTE_R50_DPG',
  R5XCA: 'EMM_EPMR_PTE_R5XCA_DPG',
  SCA: 'EMM_EPMR_PTE_SCA_DPG',
  SCO: 'EMM_EPMR_PTE_SCO_DPG',
  SFL: 'EMM_EPMR_PTE_SFL_DPG',
  SMA: 'EMM_EPMR_PTE_SMA_DPG',
  SMN: 'EMM_EPMR_PTE_SMN_DPG',
  SNY: 'EMM_EPMR_PTE_SNY_DPG',
  SOH: 'EMM_EPMR_PTE_SOH_DPG',
  STX: 'EMM_EPMR_PTE_STX_DPG',
  SWA: 'EMM_EPMR_PTE_SWA_DPG',
};

const STATE_CODE_BY_GEOGRAPHY: Partial<Record<EiaGasolineGeographyCode, StateCode>> = {
  SCA: 'CA',
  SCO: 'CO',
  SFL: 'FL',
  SMA: 'MA',
  SMN: 'MN',
  SNY: 'NY',
  SOH: 'OH',
  STX: 'TX',
  SWA: 'WA',
};

export const EIA_GASOLINE_SOURCE_URL = 'https://www.eia.gov/dnav/pet/pet_pri_gnd_a_epmr_pte_dpgal_w.htm';

function geographyKind(code: EiaGasolineGeographyCode): 'nation' | 'padd' | 'state' {
  if (code === 'NUS') return 'nation';
  if (code.startsWith('S')) return 'state';
  return 'padd';
}

export const gasolineGeographySchema = z.object({
  code: z.string().refine(isEiaGasolineGeographyCode, 'Unknown EIA gasoline geography.'),
  name: z.string().min(1),
  kind: z.enum(['nation', 'padd', 'state']),
  stateCode: z.string().refine(isStateCode, 'Unknown U.S. state code.').optional(),
  seriesId: z.string().regex(/^EMM_EPMR_PTE_[A-Z0-9]+_DPG$/),
  dollarsPerGallon: z.number().finite().positive(),
}).strict();

export const eiaGasolineSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal('eia-gasoline-weekly-v1.0.0'),
  snapshotId: z.string().min(1),
  provider: z.literal('U.S. Energy Information Administration'),
  datasetId: z.literal('petroleum/pri/gnd'),
  product: z.literal('regular-all-formulations'),
  frequency: z.literal('weekly'),
  observationPeriod: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  geographies: z.array(gasolineGeographySchema).length(EIA_GASOLINE_GEOGRAPHY_CODES.length),
}).strict().superRefine((snapshot, context) => {
  const expectedSnapshotId = `eia-gasoline-regular-weekly-${snapshot.observationPeriod}-v1`;
  if (snapshot.snapshotId !== expectedSnapshotId) {
    context.addIssue({ code: 'custom', path: ['snapshotId'], message: `Snapshot ID must be ${expectedSnapshotId}.` });
  }
  const seen = new Set<string>();
  for (const [index, row] of snapshot.geographies.entries()) {
    if (seen.has(row.code)) {
      context.addIssue({ code: 'custom', path: ['geographies', index, 'code'], message: `Duplicate geography: ${row.code}` });
    }
    seen.add(row.code);
    if (row.seriesId !== EIA_GASOLINE_SERIES_BY_CODE[row.code]) {
      context.addIssue({ code: 'custom', path: ['geographies', index, 'seriesId'], message: `Unexpected series for ${row.code}.` });
    }
    if (row.kind !== geographyKind(row.code)) {
      context.addIssue({ code: 'custom', path: ['geographies', index, 'kind'], message: `Unexpected kind for ${row.code}.` });
    }
    const stateCode = STATE_CODE_BY_GEOGRAPHY[row.code];
    if (stateCode) {
      if (row.stateCode !== stateCode || row.name !== US_STATES[stateCode]) {
        context.addIssue({ code: 'custom', path: ['geographies', index, 'name'], message: `State geography ${row.code} is mislabeled.` });
      }
    } else if (row.stateCode !== undefined) {
      context.addIssue({ code: 'custom', path: ['geographies', index, 'stateCode'], message: `Non-state geography ${row.code} cannot carry a state code.` });
    }
  }
  const missing = EIA_GASOLINE_GEOGRAPHY_CODES.filter((code) => !seen.has(code));
  if (missing.length > 0) {
    context.addIssue({ code: 'custom', path: ['geographies'], message: `Missing geographies: ${missing.join(', ')}` });
  }
});

export type EiaGasolineSnapshot = z.infer<typeof eiaGasolineSnapshotSchema>;
export type GasolineGeography = z.infer<typeof gasolineGeographySchema>;

type SnapshotMetadata = {
  fetchedAt: string;
  rawSha256: string;
};

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseTwoDigitDate(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value);
  if (!match) throw new Error(`Unrecognized EIA weekly date: ${value}`);
  const month = match[1];
  const day = match[2];
  const year = Number(match[3]);
  const fullYear = year >= 90 ? 1900 + year : 2000 + year;
  return `${fullYear}-${month}-${day}`;
}

function parseReleaseDate(value: string): string {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error(`Unrecognized EIA release date: ${value}`);
  return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
}

function geographyCodeFromSeries(seriesId: string): string | null {
  const match = /^EMM_EPMR_PTE_([A-Z0-9]+)_DPG$/.exec(seriesId);
  return match?.[1] ?? null;
}

const CANONICAL_NAMES: Record<EiaGasolineGeographyCode, string> = {
  NUS: 'U.S.',
  R10: 'East Coast (PADD 1)',
  R1X: 'New England (PADD 1A)',
  R1Y: 'Central Atlantic (PADD 1B)',
  R1Z: 'Lower Atlantic (PADD 1C)',
  R20: 'Midwest (PADD 2)',
  R30: 'Gulf Coast (PADD 3)',
  R40: 'Rocky Mountain (PADD 4)',
  R50: 'West Coast (PADD 5)',
  R5XCA: 'West Coast less California',
  SCA: 'California',
  SCO: 'Colorado',
  SFL: 'Florida',
  SMA: 'Massachusetts',
  SMN: 'Minnesota',
  SNY: 'New York',
  SOH: 'Ohio',
  STX: 'Texas',
  SWA: 'Washington',
};

export function parseEiaGasolineWeeklyHtml(html: string): {
  observationPeriod: string;
  releaseDate: string;
  rows: Array<{ code: EiaGasolineGeographyCode; seriesId: string; dollarsPerGallon: number }>;
} {
  const releaseMatch = html.match(/Release Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (!releaseMatch) throw new Error('EIA gasoline table is missing a release date.');
  const headerDates = [...html.matchAll(/<th class="Series5">(\d{2}\/\d{2}\/\d{2})<\/th>/g)].map((match) => match[1]);
  if (headerDates.length < 1) throw new Error('EIA gasoline table is missing weekly date headers.');
  const observationPeriod = parseTwoDigitDate(headerDates[headerDates.length - 1]);
  const columnCount = headerDates.length;

  const rowChunks = html.split(/<tr class="DataRow">/).slice(1);
  const parsed = new Map<EiaGasolineGeographyCode, { seriesId: string; dollarsPerGallon: number }>();
  for (const chunk of rowChunks) {
    const nameMatch = chunk.match(/class="DataStub1">([\s\S]*?)<\/td>/);
    const seriesMatch = chunk.match(/s=(EMM_EPMR_PTE_[A-Z0-9]+_DPG)/);
    const values = [...chunk.matchAll(/class="(?:DataB|Current2)">([^<]+)/g)].map((match) => match[1].trim());
    if (!nameMatch || !seriesMatch) continue;
    const code = geographyCodeFromSeries(seriesMatch[1]);
    if (!code || !isEiaGasolineGeographyCode(code)) continue;
    if (values.length !== columnCount) {
      throw new Error(`EIA gasoline row ${stripTags(nameMatch[1])} does not have ${columnCount} weekly values.`);
    }
    const dollarsPerGallon = Number(values[values.length - 1]);
    if (!Number.isFinite(dollarsPerGallon) || dollarsPerGallon <= 0) {
      throw new Error(`EIA gasoline row ${code} has a non-positive price.`);
    }
    if (parsed.has(code)) throw new Error(`Duplicate EIA gasoline geography: ${code}`);
    parsed.set(code, { seriesId: seriesMatch[1], dollarsPerGallon });
  }

  const missing = EIA_GASOLINE_GEOGRAPHY_CODES.filter((code) => !parsed.has(code));
  if (missing.length > 0) throw new Error(`Missing EIA gasoline geographies: ${missing.join(', ')}`);

  return {
    observationPeriod,
    releaseDate: parseReleaseDate(releaseMatch[1]),
    rows: EIA_GASOLINE_GEOGRAPHY_CODES.map((code) => {
      const row = parsed.get(code);
      if (!row) throw new Error(`Missing EIA gasoline geography: ${code}`);
      return { code, ...row };
    }),
  };
}

type GasolineRow = { code: EiaGasolineGeographyCode; seriesId: string; dollarsPerGallon: number };

function geographiesFromRows(rows: GasolineRow[]): EiaGasolineSnapshot['geographies'] {
  return rows.map((row) => {
    const kind = geographyKind(row.code);
    const stateCode = STATE_CODE_BY_GEOGRAPHY[row.code];
    if (row.seriesId !== EIA_GASOLINE_SERIES_BY_CODE[row.code]) {
      throw new Error(`Unexpected series ID for ${row.code}: ${row.seriesId}`);
    }
    if (!Number.isFinite(row.dollarsPerGallon) || row.dollarsPerGallon <= 0) {
      throw new Error(`EIA gasoline row ${row.code} has a non-positive price.`);
    }
    return {
      code: row.code,
      name: stateCode ? US_STATES[stateCode] : CANONICAL_NAMES[row.code],
      kind,
      ...(stateCode ? { stateCode } : {}),
      seriesId: row.seriesId,
      dollarsPerGallon: row.dollarsPerGallon,
    };
  });
}

function gasolineSnapshotFromRows(
  parsed: { observationPeriod: string; releaseDate: string; rows: GasolineRow[] },
  metadata: SnapshotMetadata,
  validationReport: string[],
  sourceUrl: string,
): Omit<EiaGasolineSnapshot, 'normalizedSha256'> {
  return {
    schemaVersion: '1.0.0',
    adapterVersion: 'eia-gasoline-weekly-v1.0.0',
    snapshotId: `eia-gasoline-regular-weekly-${parsed.observationPeriod}-v1`,
    provider: 'U.S. Energy Information Administration',
    datasetId: 'petroleum/pri/gnd',
    product: 'regular-all-formulations',
    frequency: 'weekly',
    observationPeriod: parsed.observationPeriod,
    releaseDate: parsed.releaseDate,
    sourceStatus: 'preliminary',
    fetchedAt: metadata.fetchedAt,
    verifiedAt: metadata.fetchedAt,
    publishedAt: metadata.fetchedAt,
    sourceUrl,
    sourceDocumentationUrl: 'https://www.eia.gov/petroleum/gasdiesel/',
    termsUrl: 'https://www.eia.gov/about/copyrights_reuse.php',
    attribution: 'Source: U.S. Energy Information Administration, weekly retail gasoline prices, regular all formulations.',
    rawSha256: metadata.rawSha256,
    validationStatus: 'passed',
    validationReport,
    geographies: geographiesFromRows(parsed.rows),
  };
}

export const EIA_GASOLINE_API_ROUTE = 'https://api.eia.gov/v2/petroleum/pri/gnd/data/';

const eiaGasolineApiRowSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  series: z.string().regex(/^EMM_EPMR_PTE_[A-Z0-9]+_DPG$/).optional(),
  duoarea: z.string().optional(),
  value: z.union([z.string(), z.number()]),
});

export const eiaGasolineApiResponseSchema = z.object({
  response: z.object({
    frequency: z.literal('weekly').optional(),
    data: z.array(eiaGasolineApiRowSchema).min(1),
  }),
});

function seriesIdFromApiRow(row: z.infer<typeof eiaGasolineApiRowSchema>): string | null {
  if (row.series) return row.series;
  if (row.duoarea && isEiaGasolineGeographyCode(row.duoarea)) return EIA_GASOLINE_SERIES_BY_CODE[row.duoarea];
  return null;
}

export function parseEiaGasolineApiResponse(raw: unknown): {
  observationPeriod: string;
  releaseDate: string;
  rows: GasolineRow[];
} {
  const parsed = eiaGasolineApiResponseSchema.parse(raw);
  const latestPeriod = parsed.response.data.reduce(
    (latest, row) => (row.period > latest ? row.period : latest),
    parsed.response.data[0].period,
  );
  const found = new Map<EiaGasolineGeographyCode, GasolineRow>();
  for (const row of parsed.response.data) {
    if (row.period !== latestPeriod) continue;
    const seriesId = seriesIdFromApiRow(row);
    if (!seriesId) continue;
    const code = geographyCodeFromSeries(seriesId);
    if (!code || !isEiaGasolineGeographyCode(code)) continue;
    const dollarsPerGallon = Number(row.value);
    if (!Number.isFinite(dollarsPerGallon) || dollarsPerGallon <= 0) {
      throw new Error(`EIA gasoline API row ${code} has a non-positive price.`);
    }
    const existing = found.get(code);
    if (existing && existing.dollarsPerGallon !== dollarsPerGallon) {
      throw new Error(`Conflicting EIA gasoline API values for ${code}.`);
    }
    found.set(code, { code, seriesId, dollarsPerGallon });
  }
  const missing = EIA_GASOLINE_GEOGRAPHY_CODES.filter((code) => !found.has(code));
  if (missing.length > 0) throw new Error(`Missing EIA gasoline API geographies: ${missing.join(', ')}`);
  return {
    observationPeriod: latestPeriod,
    releaseDate: latestPeriod,
    rows: EIA_GASOLINE_GEOGRAPHY_CODES.map((code) => {
      const row = found.get(code);
      if (!row) throw new Error(`Missing EIA gasoline API geography: ${code}`);
      return row;
    }),
  };
}

export function normalizeEiaGasolineApiResponse(raw: unknown, metadata: SnapshotMetadata): Omit<EiaGasolineSnapshot, 'normalizedSha256'> {
  const parsed = parseEiaGasolineApiResponse(raw);
  return gasolineSnapshotFromRows(parsed, metadata, [
    'EIA Open Data API v2 petroleum/pri/gnd weekly regular all-formulations series parsed.',
    'Required PADD, selected-state and U.S. series are present with positive dollar-per-gallon prices.',
    `Official series IDs: ${EIA_GASOLINE_GEOGRAPHY_CODES.map((code) => EIA_GASOLINE_SERIES_BY_CODE[code]).join(', ')}.`,
  ], EIA_GASOLINE_API_ROUTE);
}

export function normalizeEiaGasolineHtml(html: string, metadata: SnapshotMetadata): Omit<EiaGasolineSnapshot, 'normalizedSha256'> {
  const parsed = parseEiaGasolineWeeklyHtml(html);
  return gasolineSnapshotFromRows(parsed, metadata, [
    'EIA weekly regular gasoline HTML table parsed.',
    'Release date and latest week-ending date are present.',
    'Required PADD, selected-state and U.S. series are present with positive dollar-per-gallon prices.',
    'City rows are ignored; they are not used as state substitutes.',
  ], EIA_GASOLINE_SOURCE_URL);
}
