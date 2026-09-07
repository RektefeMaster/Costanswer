import { z } from 'zod';
import snapshotJson from '@/data/medicare/2026.json';

export const MEDICARE_FILING_STATUSES = ['single', 'married-joint', 'married-separate'] as const;
export type MedicareFilingStatus = (typeof MEDICARE_FILING_STATUSES)[number];

const money = z.number().finite().nonnegative().max(100_000);
const date = z.iso.date();

/**
 * One rung of the income-related adjustment ladder.
 *
 * CMS prints most rungs as "more than X", but the top one as "greater than or
 * equal to X". At exactly $500,000 those two readings give different premiums,
 * so the boundary is carried per bracket rather than assumed uniform.
 */
const bracketSchema = z.object({
  threshold: z.number().finite().positive().max(10_000_000).nullable(),
  thresholdIsInclusive: z.boolean(),
  partBMonthlyAdjustment: money,
  partDMonthlyAdjustment: money,
}).strict();
export type MedicareIrmaaBracket = z.infer<typeof bracketSchema>;

const ladderSchema = z.array(bracketSchema).min(3).superRefine((brackets, context) => {
  if (brackets[0].threshold !== null || brackets[0].partBMonthlyAdjustment !== 0 || brackets[0].partDMonthlyAdjustment !== 0) {
    context.addIssue({ code: 'custom', message: 'The first bracket must be the unadjusted standard premium.' });
  }
  brackets.forEach((bracket, index) => {
    if (index === 0) return;
    const previous = brackets[index - 1];
    if (bracket.threshold === null
      || (previous.threshold !== null && bracket.threshold <= previous.threshold)
      || bracket.partBMonthlyAdjustment < previous.partBMonthlyAdjustment
      || bracket.partDMonthlyAdjustment < previous.partDMonthlyAdjustment) {
      context.addIssue({ code: 'custom', path: [index], message: 'Brackets must rise in income and never fall in adjustment.' });
    }
  });
});

export const medicareSnapshotSchema = z.object({
  snapshotId: z.string().regex(/^medicare-2026-/),
  coverageYear: z.literal(2026),
  /** IRMAA is set from the return filed two years before the premium year. */
  irmaaIncomeTaxYear: z.literal(2024),
  verifiedAt: date,
  sourceStatus: z.literal('official-rules'),
  partA: z.object({
    inpatientDeductiblePerBenefitPeriod: money,
    coinsuranceDays61To90: money,
    coinsuranceLifetimeReserveDay: money,
    lifetimeReserveDays: z.literal(60),
    skilledNursingCoinsuranceDays21To100: money,
    monthlyPremium30To39Quarters: money,
    monthlyPremiumUnder30Quarters: money,
  }).strict(),
  partB: z.object({
    standardMonthlyPremium: money,
    annualDeductible: money,
    coinsurancePercentAfterDeductible: z.literal(20),
  }).strict(),
  irmaaBrackets: z.object({
    single: ladderSchema,
    'married-joint': ladderSchema,
    'married-separate': ladderSchema,
  }).strict(),
  sources: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    url: z.url().refine((url) => {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && ['www.cms.gov', 'www.ssa.gov', 'secure.ssa.gov'].includes(parsed.hostname)
        && !parsed.username && !parsed.password;
    }, 'Use a public official CMS or SSA source without credentials.'),
    publishedAt: date.nullable(),
    detail: z.string().min(1),
  }).strict()).min(3),
  /**
   * Digest of this document without this field.
   *
   * The schema proves the ladder is shaped like the CMS table: rising income,
   * never-falling adjustments. It cannot tell $202.90 from a typed $209.20. The
   * hash is what fails the build on a single wrong digit.
   */
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict().superRefine((snapshot, context) => {
  const sourceIds = snapshot.sources.map((source) => source.id);
  if (new Set(sourceIds).size !== sourceIds.length || !sourceIds.includes('cms-part-a-b-2026')) {
    context.addIssue({ code: 'custom', message: 'Required official sources must be unique and complete.' });
  }
  if (snapshot.sources.some((source) => source.publishedAt !== null && source.publishedAt > snapshot.verifiedAt)) {
    context.addIssue({ code: 'custom', message: 'Source publication cannot follow verification.' });
  }
  // Married-filing-separately skips the middle rungs entirely, so it is shorter
  // than the other two by construction rather than by omission.
  if (snapshot.irmaaBrackets.single.length !== snapshot.irmaaBrackets['married-joint'].length) {
    context.addIssue({ code: 'custom', message: 'Single and joint ladders must have the same number of rungs.' });
  }
});

export type MedicareSnapshot = z.infer<typeof medicareSnapshotSchema>;
export const medicareSnapshot = medicareSnapshotSchema.parse(snapshotJson);

/**
 * The bracket an income falls in, honouring each rung's own boundary rule.
 *
 * Returns the index as well as the bracket, so a caller can say "you are one
 * rung up" without re-deriving the ladder.
 */
export function medicareIrmaaBracketFor(
  magi: number,
  filingStatus: MedicareFilingStatus,
  snapshot: MedicareSnapshot = medicareSnapshot,
): { bracket: MedicareIrmaaBracket; index: number; nextThreshold: number | null } {
  const ladder = snapshot.irmaaBrackets[filingStatus];
  let index = 0;
  for (let position = 1; position < ladder.length; position += 1) {
    const { threshold, thresholdIsInclusive } = ladder[position];
    if (threshold === null) continue;
    if (thresholdIsInclusive ? magi >= threshold : magi > threshold) index = position;
  }
  return { bracket: ladder[index], index, nextThreshold: ladder[index + 1]?.threshold ?? null };
}
