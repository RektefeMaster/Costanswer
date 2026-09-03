import { z } from 'zod';
import { isStateCode, STATE_CODES, US_STATES, type StateCode } from '@/lib/location/states';
import { cbsaId, countyId, placeId, stateId } from '@/lib/location/ids';

const stateCodeSchema = z.string().refine(isStateCode, 'Unknown U.S. state code.');

const stateRecordSchema = z.object({
  id: z.string(),
  kind: z.literal('state'),
  state: stateCodeSchema,
  stateFips: z.string().regex(/^\d{2}$/),
  name: z.string().min(1),
  geographyVintage: z.literal('2024'),
}).strict();

const countyRecordSchema = z.object({
  id: z.string(),
  kind: z.literal('county'),
  geoid: z.string().regex(/^\d{5}$/),
  stateFips: z.string().regex(/^\d{2}$/),
  countyFips: z.string().regex(/^\d{3}$/),
  state: stateCodeSchema,
  name: z.string().min(1),
  geographyVintage: z.literal('2024'),
}).strict();

const placeRecordSchema = z.object({
  id: z.string(),
  kind: z.literal('place'),
  geoid: z.string().regex(/^\d{7}$/),
  stateFips: z.string().regex(/^\d{2}$/),
  placeCode: z.string().regex(/^\d{5}$/),
  state: stateCodeSchema,
  name: z.string().min(1),
  lsad: z.string(),
  geographyVintage: z.literal('2024'),
  principalOfCbsa: z.string().regex(/^\d{5}$/),
}).strict();

const cbsaRecordSchema = z.object({
  id: z.string(),
  kind: z.literal('cbsa'),
  cbsaCode: z.string().regex(/^\d{5}$/),
  name: z.string().min(1),
  metroKind: z.literal('metro'),
  stateCodes: z.array(stateCodeSchema).min(1),
  multiState: z.boolean(),
  countyGeoids: z.array(z.string().regex(/^\d{5}$/)).min(1),
  geographyVintage: z.literal('omb-2023-07-21'),
}).strict();

export const geographySnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal('census-omb-geography-v1.0.0'),
  snapshotId: z.string().min(1),
  provider: z.string().min(1),
  datasetId: z.literal('census-omb-geography'),
  observationPeriod: z.literal('2024'),
  censusGeographyVintage: z.literal('2024'),
  ombDelineation: z.literal('2023-07-21'),
  ombBulletin: z.literal('23-01'),
  sourceStatus: z.enum(['verified', 'final']),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  attribution: z.string().min(1),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string()).min(1),
  states: z.array(stateRecordSchema).length(51),
  counties: z.array(countyRecordSchema).min(3100),
  cbsas: z.array(cbsaRecordSchema).min(380),
  places: z.array(placeRecordSchema).min(500),
  countyToCbsa: z.array(z.object({
    cbsaCode: z.string().regex(/^\d{5}$/),
    countyGeoid: z.string().regex(/^\d{5}$/),
  }).strict()),
  principalCities: z.array(z.object({
    placeGeoid: z.string().regex(/^\d{7}$/),
    cbsaCode: z.string().regex(/^\d{5}$/),
    principalCityName: z.string().min(1),
    state: stateCodeSchema,
    metroKind: z.literal('metro'),
    gazetteerMatch: z.string().nullable(),
  }).strict()),
}).strict().superRefine((snapshot, context) => {
  const stateIds = new Set<string>();
  for (const [index, row] of snapshot.states.entries()) {
    if (row.id !== stateId(row.state as StateCode)) {
      context.addIssue({ code: 'custom', path: ['states', index, 'id'], message: `State ID must be ${stateId(row.state as StateCode)}.` });
    }
    if (row.name !== US_STATES[row.state as StateCode]) {
      context.addIssue({ code: 'custom', path: ['states', index, 'name'], message: `State name does not match ${row.state}.` });
    }
    if (stateIds.has(row.id)) {
      context.addIssue({ code: 'custom', path: ['states', index, 'id'], message: `Duplicate canonical ID ${row.id}.` });
    }
    stateIds.add(row.id);
  }
  if (STATE_CODES.some((code) => !stateIds.has(stateId(code)))) {
    context.addIssue({ code: 'custom', path: ['states'], message: 'Geography snapshot is missing a state or D.C. row.' });
  }

  const countyIds = new Set<string>();
  const countyGeoids = new Set<string>();
  for (const [index, row] of snapshot.counties.entries()) {
    const expected = countyId(row.geoid);
    if (row.id !== expected) {
      context.addIssue({ code: 'custom', path: ['counties', index, 'id'], message: `County ID must be ${expected}.` });
    }
    if (row.geoid !== `${row.stateFips}${row.countyFips}`) {
      context.addIssue({ code: 'custom', path: ['counties', index, 'geoid'], message: 'County GEOID must equal state FIPS + county FIPS.' });
    }
    if (countyIds.has(row.id) || countyGeoids.has(row.geoid)) {
      context.addIssue({ code: 'custom', path: ['counties', index, 'id'], message: `Duplicate county identity ${row.id}.` });
    }
    countyIds.add(row.id);
    countyGeoids.add(row.geoid);
  }

  const cbsaIds = new Set<string>();
  const cbsaCodes = new Set<string>();
  for (const [index, row] of snapshot.cbsas.entries()) {
    const expected = cbsaId(row.cbsaCode);
    if (row.id !== expected) {
      context.addIssue({ code: 'custom', path: ['cbsas', index, 'id'], message: `CBSA ID must be ${expected}.` });
    }
    if (row.multiState !== row.stateCodes.length > 1) {
      context.addIssue({ code: 'custom', path: ['cbsas', index, 'multiState'], message: 'multiState must match stateCodes length.' });
    }
    if (cbsaIds.has(row.id) || cbsaCodes.has(row.cbsaCode)) {
      context.addIssue({ code: 'custom', path: ['cbsas', index, 'id'], message: `Duplicate CBSA identity ${row.id}.` });
    }
    cbsaIds.add(row.id);
    cbsaCodes.add(row.cbsaCode);
    for (const geoid of row.countyGeoids) {
      if (!countyGeoids.has(geoid)) {
        context.addIssue({ code: 'custom', path: ['cbsas', index, 'countyGeoids'], message: `CBSA ${row.cbsaCode} references missing county ${geoid}.` });
      }
    }
  }

  const placeIds = new Set<string>();
  for (const [index, row] of snapshot.places.entries()) {
    const expected = placeId(row.geoid);
    if (row.id !== expected) {
      context.addIssue({ code: 'custom', path: ['places', index, 'id'], message: `Place ID must be ${expected}.` });
    }
    if (row.geoid !== `${row.stateFips}${row.placeCode}`) {
      context.addIssue({ code: 'custom', path: ['places', index, 'geoid'], message: 'Place GEOID must equal state FIPS + place code.' });
    }
    if (!cbsaCodes.has(row.principalOfCbsa)) {
      context.addIssue({ code: 'custom', path: ['places', index, 'principalOfCbsa'], message: `Place ${row.geoid} principal city CBSA ${row.principalOfCbsa} is missing.` });
    }
    if (placeIds.has(row.id)) {
      context.addIssue({ code: 'custom', path: ['places', index, 'id'], message: `Duplicate place identity ${row.id}.` });
    }
    placeIds.add(row.id);
  }
});

export type GeographySnapshot = z.infer<typeof geographySnapshotSchema>;
export type GeographyState = z.infer<typeof stateRecordSchema>;
export type GeographyCounty = z.infer<typeof countyRecordSchema>;
export type GeographyPlace = z.infer<typeof placeRecordSchema>;
export type GeographyCbsa = z.infer<typeof cbsaRecordSchema>;
