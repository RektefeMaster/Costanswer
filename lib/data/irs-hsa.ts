import { z } from 'zod';
import snapshotJson from '@/data/irs-hsa/2026.json';

const dollars = z.number().int().positive();
const date = z.iso.date();
const sourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.url().refine((url) => {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'www.irs.gov'
      && !parsed.username && !parsed.password;
  }, 'Use a public IRS source without credentials.'),
  publishedAt: date.nullable(),
  detail: z.string().min(1),
}).strict();

export const HSA_COVERAGE = ['self-only', 'family'] as const;
export type HsaCoverage = (typeof HSA_COVERAGE)[number];

export const irsHsaSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  snapshotId: z.string().regex(/^irs-hsa-limits-2026-/),
  datasetId: z.literal('irs-hsa-limits'),
  observationPeriod: z.literal('2026'),
  coverageYear: z.literal(2026),
  fetchedAt: z.string().datetime(),
  verifiedAt: date,
  publishedAt: date,
  sourceStatus: z.literal('verified'),
  sourceUrl: z.url(),
  sourceDocumentationUrl: z.url(),
  attribution: z.string().min(1),
  limits: z.object({
    selfOnlyContribution: dollars,
    familyContribution: dollars,
    catchUpAge55: z.literal(1000),
    hdhpMinDeductibleSelfOnly: dollars,
    hdhpMinDeductibleFamily: dollars,
    hdhpMaxOutOfPocketSelfOnly: dollars,
    hdhpMaxOutOfPocketFamily: dollars,
    exceptedBenefitHra: dollars,
  }).strict(),
  sources: z.array(sourceSchema).min(2),
  validationReport: z.array(z.string().min(1)).min(1),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict().superRefine((snapshot, context) => {
  if (snapshot.limits.familyContribution <= snapshot.limits.selfOnlyContribution) {
    context.addIssue({ code: 'custom', message: 'Family HSA limit must exceed self-only.' });
  }
  if (snapshot.limits.hdhpMinDeductibleFamily !== snapshot.limits.hdhpMinDeductibleSelfOnly * 2) {
    context.addIssue({ code: 'custom', message: 'Family HDHP deductible must be twice self-only, which is how Rev. Proc. 2025-19 prints it.' });
  }
  if (snapshot.limits.hdhpMaxOutOfPocketFamily !== snapshot.limits.hdhpMaxOutOfPocketSelfOnly * 2) {
    context.addIssue({ code: 'custom', message: 'Family HDHP out-of-pocket maximum must be twice self-only.' });
  }
  const ids = snapshot.sources.map((source) => source.id);
  if (new Set(ids).size !== ids.length || !ids.includes('irs-rp-2025-19') || !ids.includes('irs-pub-969')) {
    context.addIssue({ code: 'custom', message: 'Required HSA sources must be unique and complete.' });
  }
});

export type IrsHsaSnapshot = z.infer<typeof irsHsaSnapshotSchema>;
export const irsHsaSnapshot = irsHsaSnapshotSchema.parse(snapshotJson);
export const irsHsaLimits = irsHsaSnapshot.limits;

export function hsaBaseLimit(coverage: HsaCoverage, snapshot: IrsHsaSnapshot = irsHsaSnapshot): number {
  return coverage === 'family' ? snapshot.limits.familyContribution : snapshot.limits.selfOnlyContribution;
}

export function hsaHdhpThresholds(coverage: HsaCoverage, snapshot: IrsHsaSnapshot = irsHsaSnapshot) {
  return coverage === 'family'
    ? { minDeductible: snapshot.limits.hdhpMinDeductibleFamily, maxOutOfPocket: snapshot.limits.hdhpMaxOutOfPocketFamily }
    : { minDeductible: snapshot.limits.hdhpMinDeductibleSelfOnly, maxOutOfPocket: snapshot.limits.hdhpMaxOutOfPocketSelfOnly };
}
