import { z } from 'zod';
import snapshotJson from '@/data/aca-subsidy/2026.json';

const positiveDollars = z.number().finite().int().positive();
const percent = z.number().finite().min(0).max(100);
const guideline = z.object({ firstPerson: positiveDollars, additionalPerson: positiveDollars }).strict();
const date = z.iso.date();

export const acaSubsidySnapshotSchema = z.object({
  snapshotId: z.string().regex(/^aca-subsidy-2026-/),
  coverageYear: z.literal(2026),
  povertyGuidelineYear: z.literal(2025),
  verifiedAt: date,
  sourceStatus: z.literal('official-rules'),
  minimumIncomePercentFpl: z.literal(100),
  maximumIncomePercentFpl: z.literal(400),
  employerAffordabilityPercent: z.literal(9.96),
  excessAdvanceCreditRepaymentCap: z.null(),
  povertyGuidelines: z.object({ contiguous: guideline, alaska: guideline, hawaii: guideline }).strict(),
  contributionBands: z.array(z.object({
    lowerIncomePercentFpl: z.number().finite().min(100).max(400),
    upperIncomePercentFpl: z.number().finite().min(100).max(400),
    initialContributionPercent: percent,
    finalContributionPercent: percent,
  }).strict()).length(6),
  sources: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    url: z.url().refine((url) => {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && ['www.irs.gov', 'www.govinfo.gov'].includes(parsed.hostname)
        && !parsed.username && !parsed.password && !parsed.search;
    }, 'Use a public official IRS or Federal Register source without credentials or query parameters.'),
    publishedAt: date.nullable(),
    detail: z.string().min(1),
  }).strict()).min(4),
  /**
   * Digest of this document without this field.
   *
   * The schema below proves the table is *shaped* like the IRS one: bands
   * ordered, adjacent, nondecreasing. It cannot tell 9.96 from a hand-typed
   * 9.69, both of which are valid percentages in a valid band. The hash is what
   * makes a single edited digit fail the build, and lib/data/verify.ts checks it.
   */
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict().superRefine((snapshot, context) => {
  const bands = snapshot.contributionBands;
  if (bands[0].lowerIncomePercentFpl !== 100 || bands.at(-1)!.upperIncomePercentFpl !== 400) {
    context.addIssue({ code: 'custom', message: 'Contribution bands must cover 100 through 400 percent of FPL.' });
  }
  bands.forEach((band, index) => {
    if (band.upperIncomePercentFpl <= band.lowerIncomePercentFpl
      || band.finalContributionPercent < band.initialContributionPercent
      || (index > 0 && (bands[index - 1].upperIncomePercentFpl !== band.lowerIncomePercentFpl
        || bands[index - 1].finalContributionPercent > band.initialContributionPercent))) {
      context.addIssue({ code: 'custom', message: 'Contribution bands must be ordered, adjacent, and nondecreasing.', path: ['contributionBands', index] });
    }
  });
  const sourceIds = snapshot.sources.map((source) => source.id);
  if (new Set(sourceIds).size !== sourceIds.length
    || !['irs-contribution-table', 'hhs-poverty-guidelines', 'irs-eligibility-and-formula', 'irs-income-exceptions'].every((id) => sourceIds.includes(id))) {
    context.addIssue({ code: 'custom', message: 'Required official sources must be unique and complete.' });
  }
  if (snapshot.sources.some((source) => source.publishedAt !== null && source.publishedAt > snapshot.verifiedAt)) {
    context.addIssue({ code: 'custom', message: 'Source publication cannot follow verification.' });
  }
});

export type AcaSubsidySnapshot = z.infer<typeof acaSubsidySnapshotSchema>;
export const acaSubsidySnapshot = acaSubsidySnapshotSchema.parse(snapshotJson);
