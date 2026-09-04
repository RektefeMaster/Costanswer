import { z } from 'zod';

export const ZCTA_COUNTY_ADAPTER_VERSION = 'census-zcta-county-v1.0.0';
export const ZCTA_COUNTY_SOURCE_URL =
  'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt';
export const ZCTA_COUNTY_DOCUMENTATION_URL =
  'https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.html';

/**
 * ZIP Code Tabulation Areas mapped to the counties they cover.
 *
 * A ZCTA is the Census approximation of a ZIP code, and it is not a tax or
 * travel boundary: about three in ten cross a county line. Counties are stored
 * in descending order of the land area the ZCTA occupies in each, so the first
 * is the best single answer and the rest are what makes an answer ambiguous.
 */
export const zctaCountySchema = z.object({
  zcta: z.string().regex(/^\d{5}$/),
  countyGeoids: z.array(z.string().regex(/^\d{5}$/)).min(1),
}).strict();

export const zctaCountySnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal(ZCTA_COUNTY_ADAPTER_VERSION),
  snapshotId: z.string().min(1),
  provider: z.literal('U.S. Census Bureau'),
  datasetId: z.literal('census-zcta-county'),
  observationPeriod: z.string().regex(/^\d{4}$/),
  sourceStatus: z.literal('verified'),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  sourceDocumentationUrl: z.string().url(),
  attribution: z.string().min(1),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string().min(1)).min(1),
  areas: z.array(zctaCountySchema).min(1),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export type ZctaCountySnapshot = z.infer<typeof zctaCountySnapshotSchema>;
export type ZctaCounty = z.infer<typeof zctaCountySchema>;

/**
 * Parse the Census relationship file.
 *
 * The file is one row per ZCTA-county intersection, so a ZCTA spanning three
 * counties appears three times. `AREALAND_PART` is the land area of that
 * intersection, which is what orders the counties.
 */
export function normalizeZctaCountyRelationship(
  fileText: string,
  metadata: { vintage: number; fetchedAt: string; rawSha256: string },
): Omit<ZctaCountySnapshot, 'normalizedSha256'> {
  const lines = fileText.replace(/^﻿/, '').split(/\r?\n/);
  const header = lines[0]?.split('|') ?? [];
  const column = (name: string) => {
    const index = header.indexOf(name);
    if (index === -1) throw new Error(`Census relationship file is missing the ${name} column.`);
    return index;
  };
  const zctaColumn = column('GEOID_ZCTA5_20');
  const countyColumn = column('GEOID_COUNTY_20');
  const areaColumn = column('AREALAND_PART');

  const byZcta = new Map<string, Array<{ geoid: string; area: number }>>();
  for (const line of lines.slice(1)) {
    const parts = line.split('|');
    if (parts.length !== header.length) continue;
    const zcta = parts[zctaColumn];
    const geoid = parts[countyColumn];
    if (!/^\d{5}$/.test(zcta) || !/^\d{5}$/.test(geoid)) continue;
    const area = Number(parts[areaColumn]);
    const rows = byZcta.get(zcta) ?? [];
    rows.push({ geoid, area: Number.isFinite(area) ? area : 0 });
    byZcta.set(zcta, rows);
  }
  if (byZcta.size < 20_000) {
    throw new Error(`Census relationship file yielded only ${byZcta.size} ZCTAs; the layout has probably changed.`);
  }

  const areas: ZctaCounty[] = [...byZcta.entries()]
    .map(([zcta, rows]) => ({
      zcta,
      countyGeoids: [...new Map(
        rows.sort((left, right) => right.area - left.area).map((row) => [row.geoid, row]),
      ).keys()],
    }))
    .sort((left, right) => left.zcta.localeCompare(right.zcta));

  const multiCounty = areas.filter((row) => row.countyGeoids.length > 1).length;
  const { vintage } = metadata;
  return {
    schemaVersion: '1.0.0',
    adapterVersion: ZCTA_COUNTY_ADAPTER_VERSION,
    snapshotId: `census-zcta-county-${vintage}-v1`,
    provider: 'U.S. Census Bureau',
    datasetId: 'census-zcta-county',
    observationPeriod: String(vintage),
    sourceStatus: 'verified',
    fetchedAt: metadata.fetchedAt,
    verifiedAt: metadata.fetchedAt,
    publishedAt: `${vintage}-01-01T00:00:00.000Z`,
    sourceUrl: ZCTA_COUNTY_SOURCE_URL,
    sourceDocumentationUrl: ZCTA_COUNTY_DOCUMENTATION_URL,
    attribution: `Source: U.S. Census Bureau, ${vintage} ZCTA to county relationship file.`,
    rawSha256: metadata.rawSha256,
    validationStatus: 'passed',
    validationReport: [
      `${areas.length} ZIP Code Tabulation Areas, each mapped to at least one county.`,
      `${multiCounty} of them cross a county line, so a ZIP is not always one jurisdiction.`,
      'Counties are ordered by the land area the ZCTA occupies in each, largest first.',
      'A ZCTA approximates a ZIP code. PO-box-only and point ZIP codes have no ZCTA and are not in this file.',
    ],
    areas,
  };
}
