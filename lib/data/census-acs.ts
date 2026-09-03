import { z } from 'zod';

export const CENSUS_SENTINEL_VALUES = [
  -222222222,
  -333333333,
  -555555555,
  -666666666,
  -888888888,
  -999999999,
] as const;

export function isCensusSentinel(value: number): boolean {
  return (CENSUS_SENTINEL_VALUES as readonly number[]).includes(value);
}

const acsRowSchema = z.object({
  geoId: z.string().regex(/^(0400000US\d{2}|0500000US\d{5}|1600000US\d{7}|310M700US\d{5})$/),
  kind: z.enum(['state', 'county', 'place', 'cbsa']),
  population: z.number().int().nonnegative().nullable(),
  populationMoe: z.number().int().nonnegative().nullable(),
  medianHouseholdIncome: z.number().int().positive().nullable(),
  medianHouseholdIncomeMoe: z.number().int().nonnegative().nullable(),
}).strict();

export const censusAcsSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal('census-acs5-table-based-v1.0.0'),
  snapshotId: z.string().min(1),
  provider: z.literal('U.S. Census Bureau'),
  datasetId: z.literal('census-acs5'),
  observationPeriod: z.literal('2024'),
  release: z.literal('ACS 5-Year 2024'),
  surveyYears: z.literal('2020-2024'),
  sourceStatus: z.literal('final'),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  attribution: z.string().min(1),
  variables: z.object({
    B01003_001: z.object({ label: z.string(), universe: z.string() }).strict(),
    B19013_001: z.object({ label: z.string(), universe: z.string() }).strict(),
  }).strict(),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string()).min(1),
  rows: z.array(acsRowSchema).min(1000),
}).strict().superRefine((snapshot, context) => {
  const seen = new Set<string>();
  for (const [index, row] of snapshot.rows.entries()) {
    if (seen.has(row.geoId)) {
      context.addIssue({ code: 'custom', path: ['rows', index, 'geoId'], message: `Duplicate ACS geography ${row.geoId}.` });
    }
    seen.add(row.geoId);
    if (row.population === 0) {
      context.addIssue({ code: 'custom', path: ['rows', index, 'population'], message: 'ACS population sentinel/zero must not be stored as a valid population.' });
    }
    if (row.medianHouseholdIncome === 0) {
      context.addIssue({ code: 'custom', path: ['rows', index, 'medianHouseholdIncome'], message: 'ACS income sentinel/zero must not be stored as valid income.' });
    }
  }
});

export type CensusAcsSnapshot = z.infer<typeof censusAcsSnapshotSchema>;
export type CensusAcsRow = z.infer<typeof acsRowSchema>;
