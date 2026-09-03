import { z } from 'zod';

export const FREDDIE_MAC_PMMS_SOURCE_URL = 'https://www.freddiemac.com/pmms';
export const FREDDIE_MAC_PMMS_ADAPTER_VERSION = 'freddie-mac-pmms-v1.0.0';

const MONTH_NUMBERS: Record<string, string> = {
  January: '01',
  February: '02',
  March: '03',
  April: '04',
  May: '05',
  June: '06',
  July: '07',
  August: '08',
  September: '09',
  October: '10',
  November: '11',
  December: '12',
};

const financialProductSchema = z.object({
  '@type': z.literal('FinancialProduct'),
  category: z.literal('Mortgage'),
  name: z.string(),
  description: z.string(),
  interestRate: z.union([z.string(), z.number()]),
});

export const freddieMacPmmsSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal(FREDDIE_MAC_PMMS_ADAPTER_VERSION),
  snapshotId: z.string().min(1),
  provider: z.literal('Freddie Mac'),
  datasetId: z.literal('pmms'),
  frequency: z.literal('weekly'),
  observationPeriod: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceStatus: z.literal('preliminary'),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceUrl: z.literal(FREDDIE_MAC_PMMS_SOURCE_URL),
  sourceDocumentationUrl: z.string().url(),
  termsUrl: z.string().url(),
  attribution: z.string(),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string()).min(1),
  thirtyYearFixedPercent: z.number().finite().min(1).max(20),
  fifteenYearFixedPercent: z.number().finite().min(1).max(20),
}).strict().superRefine((snapshot, context) => {
  const expectedSnapshotId = `freddie-mac-pmms-${snapshot.observationPeriod}-v1`;
  if (snapshot.snapshotId !== expectedSnapshotId) {
    context.addIssue({ code: 'custom', path: ['snapshotId'], message: `Snapshot ID must be ${expectedSnapshotId}.` });
  }
  if (snapshot.fifteenYearFixedPercent > snapshot.thirtyYearFixedPercent + 1) {
    context.addIssue({
      code: 'custom',
      path: ['fifteenYearFixedPercent'],
      message: 'The 15-year average is implausibly above the 30-year average.',
    });
  }
});

export type FreddieMacPmmsSnapshot = z.infer<typeof freddieMacPmmsSnapshotSchema>;

type SnapshotMetadata = {
  fetchedAt: string;
  rawSha256: string;
};

function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptPattern)) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // Ignore unrelated or malformed page JSON-LD.
    }
  }
  return blocks.flatMap((block) => {
    if (Array.isArray(block)) return block;
    if (block && typeof block === 'object' && '@graph' in block) {
      const graph = (block as { '@graph': unknown })['@graph'];
      if (Array.isArray(graph)) return graph;
    }
    return [block];
  });
}

function parseRate(value: string | number): number {
  const rate = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(rate)) throw new Error('Freddie Mac PMMS interest rate is not a finite number.');
  return rate;
}

function parseObservationDate(description: string): string {
  const match = description.match(/as of ([A-Za-z]+) (\d{1,2}), (\d{4})/i);
  if (!match) throw new Error('Freddie Mac PMMS JSON-LD is missing an observation date.');
  const monthName = `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()}`;
  const month = MONTH_NUMBERS[monthName];
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!month || !Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error(`Freddie Mac PMMS observation date is invalid: ${description}`);
  }
  const isoDate = `${year}-${month}-${String(day).padStart(2, '0')}`;
  const timestamp = Date.parse(`${isoDate}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== isoDate) {
    throw new Error(`Freddie Mac PMMS observation date is not a real calendar day: ${isoDate}`);
  }
  return isoDate;
}

function productNameKind(name: string): 'thirty' | 'fifteen' | null {
  const normalized = name.toLowerCase().replace(/\s+/g, '');
  if (normalized.includes('30-year') || normalized.includes('30year')) return 'thirty';
  if (normalized.includes('15-year') || normalized.includes('15year')) return 'fifteen';
  return null;
}

export function normalizeFreddieMacPmmsHtml(html: string, metadata: SnapshotMetadata): Omit<FreddieMacPmmsSnapshot, 'normalizedSha256'> {
  const products = jsonLdBlocks(html).flatMap((block) => {
    const parsed = financialProductSchema.safeParse(block);
    return parsed.success ? [parsed.data] : [];
  });

  let thirtyYear: number | undefined;
  let fifteenYear: number | undefined;
  let observationPeriod: string | undefined;
  for (const product of products) {
    const kind = productNameKind(product.name);
    if (!kind) continue;
    const date = parseObservationDate(product.description);
    if (observationPeriod && observationPeriod !== date) {
      throw new Error('Freddie Mac PMMS 15-year and 30-year quotes do not share one week.');
    }
    observationPeriod = date;
    if (kind === 'thirty') thirtyYear = parseRate(product.interestRate);
    if (kind === 'fifteen') fifteenYear = parseRate(product.interestRate);
  }

  if (thirtyYear === undefined || fifteenYear === undefined || !observationPeriod) {
    throw new Error('Freddie Mac PMMS page is missing 15-year or 30-year FinancialProduct JSON-LD.');
  }
  if (thirtyYear < 1 || thirtyYear > 20 || fifteenYear < 1 || fifteenYear > 20) {
    throw new Error('Freddie Mac PMMS rates are outside the accepted 1–20 percent range.');
  }

  return {
    schemaVersion: '1.0.0',
    adapterVersion: FREDDIE_MAC_PMMS_ADAPTER_VERSION,
    snapshotId: `freddie-mac-pmms-${observationPeriod}-v1`,
    provider: 'Freddie Mac',
    datasetId: 'pmms',
    frequency: 'weekly',
    observationPeriod,
    sourceStatus: 'preliminary',
    fetchedAt: metadata.fetchedAt,
    verifiedAt: metadata.fetchedAt,
    publishedAt: metadata.fetchedAt,
    sourceUrl: FREDDIE_MAC_PMMS_SOURCE_URL,
    sourceDocumentationUrl: FREDDIE_MAC_PMMS_SOURCE_URL,
    termsUrl: 'https://www.freddiemac.com/about/legal',
    attribution: 'Source: Freddie Mac Primary Mortgage Market Survey (PMMS), national weekly averages for 30-year and 15-year fixed-rate mortgages.',
    rawSha256: metadata.rawSha256,
    validationStatus: 'passed',
    validationReport: [
      'Freddie Mac PMMS HTML contained FinancialProduct JSON-LD for 15-year and 30-year fixed rates.',
      `Both averages are dated ${observationPeriod}.`,
      'Rates are finite percentages inside the 1–20 percent sanity bounds.',
    ],
    thirtyYearFixedPercent: thirtyYear,
    fifteenYearFixedPercent: fifteenYear,
  };
}
