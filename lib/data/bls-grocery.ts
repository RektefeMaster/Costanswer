import { z } from 'zod';
import { CENSUS_REGION_IDS, type CensusRegionId } from '@/lib/location/census-regions';

export const BLS_GROCERY_ADAPTER_VERSION = 'bls-apu-grocery-v1.1.0';
export const BLS_GROCERY_SNAPSHOT_EDITION = 'v2';
export const BLS_UNREGISTERED_SERIES_LIMIT = 25;

export const GROCERY_ITEM_IDS = [
  'milk-whole-gallon',
  'bread-white-lb',
  'eggs-grade-a-dozen',
  'ground-beef-lb',
  'chicken-whole-lb',
  'chicken-breast-lb',
  'bananas-lb',
  'potatoes-white-lb',
  'flour-all-purpose-lb',
  'bacon-sliced-lb',
  'pork-chops-boneless-lb',
  'ham-boneless-lb',
  'chuck-roast-lb',
  'tomatoes-field-lb',
  'lemons-lb',
  'lettuce-iceberg-lb',
  'potato-chips-16oz',
  'rice-white-lb',
  'spaghetti-lb',
  'cheddar-cheese-lb',
  'butter-stick-lb',
  'yogurt-8oz',
  'coffee-ground-lb',
  'sugar-white-lb',
  'orange-juice-16oz',
] as const;

export type GroceryItemId = (typeof GROCERY_ITEM_IDS)[number];

export const GROCERY_REGIONAL_ITEM_IDS = [
  'ground-beef-lb',
  'chicken-whole-lb',
  'chicken-breast-lb',
  'bananas-lb',
  'potatoes-white-lb',
  'bacon-sliced-lb',
  'pork-chops-boneless-lb',
  'ham-boneless-lb',
  'chuck-roast-lb',
  'tomatoes-field-lb',
  'lemons-lb',
  'lettuce-iceberg-lb',
  'potato-chips-16oz',
] as const;

export type GroceryRegionalItemId = (typeof GROCERY_REGIONAL_ITEM_IDS)[number];

export const GROCERY_UNITS = ['gallon', 'pound', 'dozen', '8-oz', '16-oz'] as const;
export type GroceryUnit = (typeof GROCERY_UNITS)[number];

type GroceryItemDefinition = {
  id: GroceryItemId;
  name: string;
  unit: GroceryUnit;
  unitLabel: string;
  itemCode: string;
  regional: boolean;
};

export const GROCERY_ITEM_DEFINITIONS: GroceryItemDefinition[] = [
  { id: 'milk-whole-gallon', name: 'Milk, fresh, whole', unit: 'gallon', unitLabel: 'gallon', itemCode: '709112', regional: false },
  { id: 'bread-white-lb', name: 'Bread, white, pan', unit: 'pound', unitLabel: 'pound', itemCode: '702111', regional: false },
  { id: 'eggs-grade-a-dozen', name: 'Eggs, grade A, large', unit: 'dozen', unitLabel: 'dozen', itemCode: '708111', regional: false },
  { id: 'ground-beef-lb', name: 'Ground beef, 100% beef', unit: 'pound', unitLabel: 'pound', itemCode: '703112', regional: true },
  { id: 'chicken-whole-lb', name: 'Chicken, fresh, whole', unit: 'pound', unitLabel: 'pound', itemCode: '706111', regional: true },
  { id: 'chicken-breast-lb', name: 'Chicken breast, boneless', unit: 'pound', unitLabel: 'pound', itemCode: 'FF1101', regional: true },
  { id: 'bananas-lb', name: 'Bananas', unit: 'pound', unitLabel: 'pound', itemCode: '711211', regional: true },
  { id: 'potatoes-white-lb', name: 'Potatoes, white', unit: 'pound', unitLabel: 'pound', itemCode: '712112', regional: true },
  { id: 'flour-all-purpose-lb', name: 'Flour, white, all purpose', unit: 'pound', unitLabel: 'pound', itemCode: '701111', regional: false },
  { id: 'bacon-sliced-lb', name: 'Bacon, sliced', unit: 'pound', unitLabel: 'pound', itemCode: '704111', regional: true },
  { id: 'pork-chops-boneless-lb', name: 'Chops, boneless', unit: 'pound', unitLabel: 'pound', itemCode: '704212', regional: true },
  { id: 'ham-boneless-lb', name: 'Ham, boneless', unit: 'pound', unitLabel: 'pound', itemCode: '704312', regional: true },
  { id: 'chuck-roast-lb', name: 'Chuck roast, USDA Choice, boneless', unit: 'pound', unitLabel: 'pound', itemCode: '703213', regional: true },
  { id: 'tomatoes-field-lb', name: 'Tomatoes, field grown', unit: 'pound', unitLabel: 'pound', itemCode: '712311', regional: true },
  { id: 'lemons-lb', name: 'Lemons', unit: 'pound', unitLabel: 'pound', itemCode: '711412', regional: true },
  { id: 'lettuce-iceberg-lb', name: 'Lettuce, iceberg', unit: 'pound', unitLabel: 'pound', itemCode: '712211', regional: true },
  { id: 'potato-chips-16oz', name: 'Potato chips', unit: '16-oz', unitLabel: '16 oz', itemCode: '718311', regional: true },
  { id: 'rice-white-lb', name: 'Rice, white, long grain, uncooked', unit: 'pound', unitLabel: 'pound', itemCode: '701312', regional: false },
  { id: 'spaghetti-lb', name: 'Spaghetti and macaroni', unit: 'pound', unitLabel: 'pound', itemCode: '701322', regional: false },
  { id: 'cheddar-cheese-lb', name: 'Cheddar cheese, natural', unit: 'pound', unitLabel: 'pound', itemCode: '710212', regional: false },
  { id: 'butter-stick-lb', name: 'Butter, stick', unit: 'pound', unitLabel: 'pound', itemCode: 'FS1101', regional: false },
  { id: 'yogurt-8oz', name: 'Yogurt', unit: '8-oz', unitLabel: '8 oz', itemCode: 'FJ4101', regional: false },
  { id: 'coffee-ground-lb', name: 'Coffee, 100%, ground roast', unit: 'pound', unitLabel: 'pound', itemCode: '717311', regional: false },
  { id: 'sugar-white-lb', name: 'Sugar, white', unit: 'pound', unitLabel: 'pound', itemCode: '715211', regional: false },
  { id: 'orange-juice-16oz', name: 'Orange juice, frozen concentrate', unit: '16-oz', unitLabel: '16 oz', itemCode: '713111', regional: false },
];

const BLS_AREA_CODES = {
  US: '0000',
  Northeast: '0100',
  Midwest: '0200',
  South: '0300',
  West: '0400',
} as const;

export function blsSeriesId(area: keyof typeof BLS_AREA_CODES, itemCode: string): string {
  return `APU${BLS_AREA_CODES[area]}${itemCode}`;
}

export function grocerySeriesIds(): string[] {
  const ids: string[] = [];
  for (const item of GROCERY_ITEM_DEFINITIONS) {
    ids.push(blsSeriesId('US', item.itemCode));
    if (!item.regional) continue;
    for (const region of CENSUS_REGION_IDS) ids.push(blsSeriesId(region, item.itemCode));
  }
  return ids;
}

export function grocerySeriesIdBatches(limit = BLS_UNREGISTERED_SERIES_LIMIT): string[][] {
  const ids = grocerySeriesIds();
  const batches: string[][] = [];
  for (let index = 0; index < ids.length; index += limit) {
    batches.push(ids.slice(index, index + limit));
  }
  return batches;
}

const observationPeriodSchema = z.string().regex(/^\d{4}-\d{2}$/);

const groceryPricePointSchema = z.object({
  seriesId: z.string().regex(/^APU[0-9A-Z]+$/),
  observationPeriod: observationPeriodSchema,
  dollars: z.number().finite().positive(),
}).strict();

const groceryItemSchema = z.object({
  id: z.enum(GROCERY_ITEM_IDS),
  name: z.string().min(1),
  unit: z.enum(GROCERY_UNITS),
  unitLabel: z.string().min(1),
  itemCode: z.string().min(1),
  national: groceryPricePointSchema,
  regions: z.record(z.enum(CENSUS_REGION_IDS), groceryPricePointSchema).optional(),
}).strict();

export const blsGrocerySnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal(BLS_GROCERY_ADAPTER_VERSION),
  snapshotId: z.string().min(1),
  provider: z.literal('U.S. Bureau of Labor Statistics'),
  datasetId: z.literal('AP'),
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
  items: z.array(groceryItemSchema).length(GROCERY_ITEM_IDS.length),
}).strict().superRefine((snapshot, context) => {
  const expectedSnapshotId = `bls-apu-grocery-${snapshot.observationPeriod}-${BLS_GROCERY_SNAPSHOT_EDITION}`;
  if (snapshot.snapshotId !== expectedSnapshotId) {
    context.addIssue({ code: 'custom', path: ['snapshotId'], message: `Snapshot ID must be ${expectedSnapshotId}.` });
  }
  const seen = new Set<string>();
  let completeRegionalItems = 0;
  for (const [index, item] of snapshot.items.entries()) {
    if (seen.has(item.id)) {
      context.addIssue({ code: 'custom', path: ['items', index, 'id'], message: `Duplicate grocery item: ${item.id}` });
    }
    seen.add(item.id);
    if (item.id !== GROCERY_ITEM_IDS[index]) {
      context.addIssue({ code: 'custom', path: ['items', index, 'id'], message: 'Grocery items must keep their catalog order.' });
    }
    if (item.national.observationPeriod !== snapshot.observationPeriod) {
      context.addIssue({ code: 'custom', path: ['items', index, 'national'], message: `${item.id} national period does not match the snapshot month.` });
    }
    const definition = GROCERY_ITEM_DEFINITIONS[index];
    if (item.itemCode !== definition.itemCode || item.name !== definition.name) {
      context.addIssue({ code: 'custom', path: ['items', index], message: `${item.id} does not match the catalog definition.` });
    }
    if (item.regions) {
      const regionKeys = Object.keys(item.regions) as CensusRegionId[];
      if (regionKeys.length === CENSUS_REGION_IDS.length
        && CENSUS_REGION_IDS.every((region) => item.regions?.[region]?.observationPeriod === snapshot.observationPeriod)) {
        completeRegionalItems += 1;
      }
    }
  }
  if (completeRegionalItems < 2) {
    context.addIssue({ code: 'custom', path: ['items'], message: 'At least two grocery items must have complete same-month census-region prices.' });
  }
});

export type BlsGrocerySnapshot = z.infer<typeof blsGrocerySnapshotSchema>;
export type GroceryItem = z.infer<typeof groceryItemSchema>;

export function groceryItemsWithRegions(items: GroceryItem[]): Array<GroceryItem & { regions: NonNullable<GroceryItem['regions']> }> {
  return items.filter((item): item is GroceryItem & { regions: NonNullable<GroceryItem['regions']> } => {
    if (!item.regions) return false;
    return CENSUS_REGION_IDS.every((region) => item.regions?.[region]);
  });
}

const blsSeriesPointSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
  period: z.string().regex(/^M(0[1-9]|1[0-2])$/),
  periodName: z.string(),
  value: z.string(),
});

export const blsApiResponseSchema = z.object({
  status: z.literal('REQUEST_SUCCEEDED'),
  Results: z.object({
    series: z.array(z.object({
      seriesID: z.string(),
      data: z.array(blsSeriesPointSchema),
    })).min(1),
  }),
});

export function mergeBlsApiResponses(payloads: unknown[]): z.infer<typeof blsApiResponseSchema> {
  const series = payloads.flatMap((payload) => blsApiResponseSchema.parse(payload).Results.series);
  if (series.length === 0) throw new Error('Merged BLS grocery response has no series.');
  const seen = new Set<string>();
  for (const row of series) {
    if (seen.has(row.seriesID)) throw new Error(`Duplicate BLS series in merged response: ${row.seriesID}`);
    seen.add(row.seriesID);
  }
  return { status: 'REQUEST_SUCCEEDED', Results: { series } };
}

type SnapshotMetadata = {
  fetchedAt: string;
  rawSha256: string;
};

function latestValidPoint(data: Array<z.infer<typeof blsSeriesPointSchema>>): { observationPeriod: string; dollars: number } | null {
  for (const point of data) {
    if (point.value === '-' || point.value === '.') continue;
    const dollars = Number(point.value);
    if (!Number.isFinite(dollars) || dollars <= 0) continue;
    return { observationPeriod: `${point.year}-${point.period.slice(1)}`, dollars };
  }
  return null;
}

export function normalizeBlsGroceryResponse(raw: unknown, metadata: SnapshotMetadata): Omit<BlsGrocerySnapshot, 'normalizedSha256'> {
  const parsed = blsApiResponseSchema.parse(raw);
  const bySeriesId = new Map(parsed.Results.series.map((series) => [series.seriesID, series.data]));
  const items = GROCERY_ITEM_DEFINITIONS.map((definition) => {
    const nationalSeriesId = blsSeriesId('US', definition.itemCode);
    const nationalData = bySeriesId.get(nationalSeriesId);
    if (!nationalData) throw new Error(`Missing BLS series ${nationalSeriesId}.`);
    const national = latestValidPoint(nationalData);
    if (!national) throw new Error(`BLS series ${nationalSeriesId} has no positive observation.`);
    const item = {
      id: definition.id,
      name: definition.name,
      unit: definition.unit,
      unitLabel: definition.unitLabel,
      itemCode: definition.itemCode,
      national: { seriesId: nationalSeriesId, ...national },
      regions: undefined as GroceryItem['regions'],
    };
    if (!definition.regional) return item;
    const regions: Partial<NonNullable<GroceryItem['regions']>> = {};
    for (const region of CENSUS_REGION_IDS) {
      const seriesId = blsSeriesId(region, definition.itemCode);
      const data = bySeriesId.get(seriesId);
      if (!data) continue;
      const point = latestValidPoint(data);
      if (!point || point.observationPeriod !== national.observationPeriod) continue;
      regions[region] = { seriesId, ...point };
    }
    if (CENSUS_REGION_IDS.every((region) => regions[region])) {
      item.regions = regions as NonNullable<GroceryItem['regions']>;
    }
    return item;
  });

  const observationPeriod = items[0]?.national.observationPeriod;
  if (!observationPeriod) throw new Error('BLS grocery snapshot is missing a national observation period.');
  const mismatched = items.filter((item) => item.national.observationPeriod !== observationPeriod);
  if (mismatched.length > 0) {
    throw new Error(`BLS grocery items do not share one month: ${mismatched.map((item) => item.id).join(', ')}`);
  }

  const completeRegionalItems = items.filter((item) => item.regions && CENSUS_REGION_IDS.every((region) => item.regions?.[region])).length;
  if (completeRegionalItems < 2) {
    throw new Error('BLS grocery snapshot needs at least two items with complete census-region prices.');
  }

  return {
    schemaVersion: '1.0.0',
    adapterVersion: BLS_GROCERY_ADAPTER_VERSION,
    snapshotId: `bls-apu-grocery-${observationPeriod}-${BLS_GROCERY_SNAPSHOT_EDITION}`,
    provider: 'U.S. Bureau of Labor Statistics',
    datasetId: 'AP',
    frequency: 'monthly',
    observationPeriod,
    sourceStatus: 'preliminary',
    fetchedAt: metadata.fetchedAt,
    verifiedAt: metadata.fetchedAt,
    publishedAt: metadata.fetchedAt,
    sourceUrl: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
    sourceDocumentationUrl: 'https://www.bls.gov/help/hlpforma.htm#AP',
    termsUrl: 'https://www.bls.gov/bls/linksite.htm',
    attribution: 'Source: U.S. Bureau of Labor Statistics, Average Price Data, U.S. city average and census regions.',
    rawSha256: metadata.rawSha256,
    validationStatus: 'passed',
    validationReport: [
      'BLS public API response schema passed.',
      `${items.length} national staple series share observation month ${observationPeriod}.`,
      `${completeRegionalItems} items have complete same-month prices for all four census regions.`,
      'Missing or stale regional series are omitted rather than filled with national substitutes.',
    ],
    items,
  };
}
