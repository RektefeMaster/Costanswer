import { z } from 'zod';
import { STATE_CODES, US_STATES, type StateCode } from '@/lib/location/states';

const eiaRowSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  stateid: z.string(),
  stateDescription: z.string(),
  sectorid: z.literal('RES'),
  sectorName: z.literal('residential'),
  price: z.string(),
  sales: z.string(),
  revenue: z.string(),
  'price-units': z.literal('cents per kilowatt-hour'),
  'sales-units': z.literal('million kilowatt hours'),
  'revenue-units': z.literal('million dollars'),
});

export const eiaApiResponseSchema = z.object({
  response: z.object({
    total: z.string(),
    dateFormat: z.literal('YYYY-MM'),
    frequency: z.literal('monthly'),
    data: z.array(eiaRowSchema).min(1),
  }),
});

export const electricityStateRateSchema = z.object({
  stateCode: z.string().refine((value): value is StateCode => value in US_STATES),
  stateName: z.string(),
  priceCentsPerKwh: z.number().finite().positive(),
  salesMillionKwh: z.number().finite().positive(),
  revenueMillionDollars: z.number().finite().positive(),
});

export const eiaElectricitySnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal('eia-retail-sales-v1.0.0'),
  snapshotId: z.string().min(1),
  provider: z.literal('U.S. Energy Information Administration'),
  datasetId: z.literal('electricity/retail-sales'),
  sector: z.literal('residential'),
  frequency: z.literal('monthly'),
  observationPeriod: z.string().regex(/^\d{4}-\d{2}$/),
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
  states: z.array(electricityStateRateSchema).length(51),
}).superRefine((snapshot, context) => {
  const seen = new Set<StateCode>();
  for (const [index, row] of snapshot.states.entries()) {
    if (seen.has(row.stateCode)) {
      context.addIssue({ code: 'custom', path: ['states', index, 'stateCode'], message: `Duplicate state code: ${row.stateCode}` });
    }
    seen.add(row.stateCode);
    if (row.stateName !== US_STATES[row.stateCode]) {
      context.addIssue({ code: 'custom', path: ['states', index, 'stateName'], message: `State name does not match ${row.stateCode}.` });
    }
  }
  const missing = STATE_CODES.filter((stateCode) => !seen.has(stateCode));
  if (missing.length > 0) {
    context.addIssue({ code: 'custom', path: ['states'], message: `Missing state codes: ${missing.join(', ')}` });
  }
});

export type EiaElectricitySnapshot = z.infer<typeof eiaElectricitySnapshotSchema>;
export type ElectricityStateRate = z.infer<typeof electricityStateRateSchema>;

type SnapshotMetadata = {
  fetchedAt: string;
  rawSha256: string;
};

export function normalizeEiaElectricityResponse(raw: unknown, metadata: SnapshotMetadata): Omit<EiaElectricitySnapshot, 'normalizedSha256'> {
  const parsed = eiaApiResponseSchema.parse(raw);
  const latestPeriod = parsed.response.data.reduce(
    (latest, row) => row.period > latest ? row.period : latest,
    parsed.response.data[0].period,
  );
  const stateCodes = new Set<string>(STATE_CODES);
  const rows = parsed.response.data.filter((row) => row.period === latestPeriod && stateCodes.has(row.stateid));
  const seen = new Set<string>();
  const validationReport: string[] = [];

  const states = rows.map((row) => {
    if (seen.has(row.stateid)) throw new Error(`Duplicate EIA state row: ${row.stateid}`);
    seen.add(row.stateid);
    const stateCode = row.stateid as StateCode;
    const price = Number(row.price);
    const sales = Number(row.sales);
    const revenue = Number(row.revenue);
    if (![price, sales, revenue].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error(`Non-positive or invalid EIA value for ${stateCode}`);
    }
    const derivedPrice = 100 * revenue / sales;
    if (Math.abs(price - derivedPrice) > 0.06) {
      throw new Error(`EIA revenue/sales invariant failed for ${stateCode}: ${price} vs ${derivedPrice}`);
    }
    if (row.stateDescription !== US_STATES[stateCode]) {
      throw new Error(`EIA state name mismatch for ${stateCode}`);
    }
    return {
      stateCode,
      stateName: row.stateDescription,
      priceCentsPerKwh: price,
      salesMillionKwh: sales,
      revenueMillionDollars: revenue,
    };
  }).sort((a, b) => a.stateCode.localeCompare(b.stateCode));

  const missingStates = STATE_CODES.filter((stateCode) => !seen.has(stateCode));
  if (missingStates.length > 0) throw new Error(`Missing EIA states: ${missingStates.join(', ')}`);
  validationReport.push('Transport and API response schema passed.');
  validationReport.push('Residential sector and expected units confirmed.');
  validationReport.push('Exactly one row for each of 50 states and the District of Columbia.');
  validationReport.push('All price, sales and revenue values are finite and positive.');
  validationReport.push('Price approximately equals 100 × revenue ÷ sales for every geography.');

  const publishedAt = metadata.fetchedAt;
  return {
    schemaVersion: '1.0.0',
    adapterVersion: 'eia-retail-sales-v1.0.0',
    snapshotId: `eia-electricity-residential-${latestPeriod}-v1`,
    provider: 'U.S. Energy Information Administration',
    datasetId: 'electricity/retail-sales',
    sector: 'residential',
    frequency: 'monthly',
    observationPeriod: latestPeriod,
    sourceStatus: 'preliminary',
    fetchedAt: metadata.fetchedAt,
    verifiedAt: metadata.fetchedAt,
    publishedAt,
    sourceUrl: `https://api.eia.gov/v2/electricity/retail-sales/data/?frequency=monthly&sectorid=RES&period=${latestPeriod}`,
    sourceDocumentationUrl: 'https://www.eia.gov/opendata/documentation.php',
    termsUrl: 'https://www.eia.gov/opendata/terms-of-service.php',
    attribution: 'Source: U.S. Energy Information Administration, Form EIA-861M monthly estimates.',
    rawSha256: metadata.rawSha256,
    validationStatus: 'passed',
    validationReport,
    states,
  };
}
