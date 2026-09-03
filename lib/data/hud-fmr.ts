import { z } from 'zod';
import { hudFmrId } from '@/lib/location/ids';

export const HUD_BEDROOM_KEYS = ['studio', 'br1', 'br2', 'br3', 'br4'] as const;
export type HudBedroomKey = (typeof HUD_BEDROOM_KEYS)[number];

export const HUD_AREA_KINDS = ['msa', 'hmfa', 'nonmetro', 'exception'] as const;

const bedroomsSchema = z.object({
  studio: z.number().int().positive(),
  br1: z.number().int().positive(),
  br2: z.number().int().positive(),
  br3: z.number().int().positive(),
  br4: z.number().int().positive(),
}).strict();

const hudAreaSchema = z.object({
  id: z.string(),
  hudAreaCode: z.string().regex(/^[A-Z0-9]+$/),
  fiscalYear: z.number().int().min(2020).max(2040),
  officialName: z.string().min(1),
  kind: z.enum(HUD_AREA_KINDS),
  stateCodes: z.array(z.string().length(2)).min(1),
  bedrooms: bedroomsSchema,
  identityMethod: z.literal('official-hud-area-code'),
}).strict();

export const hudFmrSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal('hud-fmr-county-v1.0.0'),
  snapshotId: z.string().min(1),
  provider: z.literal('U.S. Department of Housing and Urban Development'),
  datasetId: z.literal('hud-fmr'),
  observationPeriod: z.string().regex(/^\d{4}$/),
  fiscalYear: z.number().int(),
  sourceStatus: z.enum(['final', 'revised', 'verified']),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  revisionId: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceDocumentationUrl: z.string().url(),
  attribution: z.string().min(1),
  semantics: z.string().min(1),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string()).min(1),
  areas: z.array(hudAreaSchema).min(2000),
  countyMaps: z.array(z.object({
    countyGeoid: z.string().regex(/^\d{5}$/),
    hudAreaCode: z.string().regex(/^[A-Z0-9]+$/),
    areaId: z.string(),
  }).strict()).min(3000),
  ambiguousCounties: z.array(z.object({
    countyGeoid: z.string().regex(/^\d{5}$/),
    hudAreaCodes: z.array(z.string().regex(/^[A-Z0-9]+$/)).min(2),
  }).strict()),
}).strict().superRefine((snapshot, context) => {
  if (snapshot.fiscalYear !== Number(snapshot.observationPeriod)) {
    context.addIssue({ code: 'custom', path: ['observationPeriod'], message: 'HUD observation period must be the fiscal year.' });
  }
  if (snapshot.effectiveFrom >= snapshot.effectiveTo) {
    context.addIssue({ code: 'custom', path: ['effectiveTo'], message: 'HUD effectiveTo must be after effectiveFrom.' });
  }
  const areaCodes = new Set<string>();
  const areaIds = new Set<string>();
  for (const [index, area] of snapshot.areas.entries()) {
    const expected = hudFmrId(area.hudAreaCode);
    if (area.id !== expected) {
      context.addIssue({ code: 'custom', path: ['areas', index, 'id'], message: `HUD area ID must be ${expected}.` });
    }
    if (area.fiscalYear !== snapshot.fiscalYear) {
      context.addIssue({ code: 'custom', path: ['areas', index, 'fiscalYear'], message: 'Area fiscal year must match the snapshot.' });
    }
    if (areaCodes.has(area.hudAreaCode) || areaIds.has(area.id)) {
      context.addIssue({ code: 'custom', path: ['areas', index, 'id'], message: `Duplicate HUD area ${area.id}.` });
    }
    areaCodes.add(area.hudAreaCode);
    areaIds.add(area.id);
  }
  const mappedCounties = new Set<string>();
  for (const [index, row] of snapshot.countyMaps.entries()) {
    if (!areaCodes.has(row.hudAreaCode)) {
      context.addIssue({ code: 'custom', path: ['countyMaps', index, 'hudAreaCode'], message: `County map references missing HUD area ${row.hudAreaCode}.` });
    }
    if (row.areaId !== hudFmrId(row.hudAreaCode)) {
      context.addIssue({ code: 'custom', path: ['countyMaps', index, 'areaId'], message: 'County map areaId must match hudAreaCode.' });
    }
    if (mappedCounties.has(row.countyGeoid)) {
      context.addIssue({ code: 'custom', path: ['countyMaps', index, 'countyGeoid'], message: `Duplicate unique county map for ${row.countyGeoid}.` });
    }
    mappedCounties.add(row.countyGeoid);
  }
  for (const [index, row] of snapshot.ambiguousCounties.entries()) {
    if (mappedCounties.has(row.countyGeoid)) {
      context.addIssue({ code: 'custom', path: ['ambiguousCounties', index, 'countyGeoid'], message: `County ${row.countyGeoid} cannot be both unique and ambiguous.` });
    }
    for (const code of row.hudAreaCodes) {
      if (!areaCodes.has(code)) {
        context.addIssue({ code: 'custom', path: ['ambiguousCounties', index, 'hudAreaCodes'], message: `Ambiguous county references missing HUD area ${code}.` });
      }
    }
  }
});

export type HudFmrSnapshot = z.infer<typeof hudFmrSnapshotSchema>;
export type HudFmrArea = z.infer<typeof hudAreaSchema>;

export type HudRelease = {
  snapshotId: string;
  fiscalYear: number;
  publishedAt: string;
  effectiveFrom: string;
  effectiveTo: string;
  revisionId: string;
  latestPublished: boolean;
};

export function hudSnapshotIsEffectiveOn(snapshot: Pick<HudFmrSnapshot, 'effectiveFrom' | 'effectiveTo'>, asOf: string): boolean {
  return snapshot.effectiveFrom <= asOf && asOf <= snapshot.effectiveTo;
}

export function resolveEffectiveHudRelease(releases: HudRelease[], asOf: string): HudRelease {
  const eligible = releases.filter((release) => release.effectiveFrom <= asOf && asOf <= release.effectiveTo);
  if (eligible.length === 0) {
    throw new Error(`No HUD FMR release is effective on ${asOf}.`);
  }
  eligible.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || right.fiscalYear - left.fiscalYear);
  return eligible[0];
}

export function resolveLatestPublishedHudRelease(releases: HudRelease[]): HudRelease {
  const flagged = releases.find((release) => release.latestPublished);
  if (flagged) return flagged;
  return [...releases].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || right.fiscalYear - left.fiscalYear)[0];
}
