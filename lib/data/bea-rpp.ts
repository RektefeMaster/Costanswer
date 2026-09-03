import { z } from 'zod';

export const BEA_RPP_CATEGORIES = [
  'allItems',
  'goods',
  'housingRents',
  'utilities',
  'otherServices',
] as const;

export type BeaRppCategory = (typeof BEA_RPP_CATEGORIES)[number];

const rppRowSchema = z.object({
  geoFips: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(BEA_RPP_CATEGORIES),
  lineCode: z.number().int().min(1).max(5),
  value: z.number().finite().positive(),
  year: z.literal(2024),
}).strict();

export const beaRppSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal('bea-rpp-v1.0.0'),
  snapshotId: z.string().min(1),
  provider: z.literal('U.S. Bureau of Economic Analysis'),
  datasetId: z.literal('bea-rpp'),
  observationPeriod: z.literal('2024'),
  referenceYear: z.literal(2024),
  sourceStatus: z.literal('final'),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  metroSourceUrl: z.string().url(),
  attribution: z.string().min(1),
  national: z.literal(100),
  notInflation: z.literal(true),
  categories: z.tuple([
    z.literal('allItems'),
    z.literal('goods'),
    z.literal('housingRents'),
    z.literal('utilities'),
    z.literal('otherServices'),
  ]),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string()).min(1),
  states: z.array(rppRowSchema),
  metros: z.array(rppRowSchema),
  nonmetroUs: z.array(rppRowSchema),
}).strict().superRefine((snapshot, context) => {
  const stateKeys = new Set<string>();
  const stateFips = new Set<string>();
  for (const [index, row] of snapshot.states.entries()) {
    if (row.value === 1 || row.value === 1.0) {
      // National is 100, not 1.0. A state may theoretically be 1 only if BEA published that; still reject obvious 100↔1 conversion on national.
    }
    if (row.geoFips === '00000' && Math.abs(row.value - 100) > 0.001) {
      context.addIssue({ code: 'custom', path: ['states', index, 'value'], message: 'National RPP must be 100.' });
    }
    const key = `${row.geoFips}:${row.category}`;
    if (stateKeys.has(key)) {
      context.addIssue({ code: 'custom', path: ['states', index], message: `Duplicate BEA state RPP ${key}.` });
    }
    stateKeys.add(key);
    if (/^\d{5}$/.test(row.geoFips) && row.geoFips.endsWith('000') && row.geoFips !== '00000') {
      stateFips.add(row.geoFips.slice(0, 2));
    }
  }
  if (stateFips.size < 51) {
    context.addIssue({ code: 'custom', path: ['states'], message: 'BEA RPP must cover all states and D.C.' });
  }
  const metroKeys = new Set<string>();
  for (const [index, row] of snapshot.metros.entries()) {
    const key = `${row.geoFips}:${row.category}`;
    if (metroKeys.has(key)) {
      context.addIssue({ code: 'custom', path: ['metros', index], message: `Duplicate BEA metro RPP ${key}.` });
    }
    metroKeys.add(key);
    if (row.value < 10) {
      context.addIssue({ code: 'custom', path: ['metros', index, 'value'], message: 'RPP values are an index around 100, not a 1.0 ratio.' });
    }
  }
  for (const [index, row] of snapshot.states.entries()) {
    if (row.value < 10) {
      context.addIssue({ code: 'custom', path: ['states', index, 'value'], message: 'RPP values are an index around 100, not a 1.0 ratio.' });
    }
  }
});

export type BeaRppSnapshot = z.infer<typeof beaRppSnapshotSchema>;
export type BeaRppRow = z.infer<typeof rppRowSchema>;
