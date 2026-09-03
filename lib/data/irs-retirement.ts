import { z } from 'zod';

const positiveUsd = z.number().int().positive();

export const irsRetirementSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal('irs-retirement-limits-v1.0.0'),
  snapshotId: z.string().min(1),
  provider: z.literal('Internal Revenue Service'),
  datasetId: z.literal('irs-retirement-limits'),
  observationPeriod: z.string().regex(/^\d{4}$/),
  sourceStatus: z.literal('verified'),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  noticeUrl: z.string().url(),
  colaTableUrl: z.string().url(),
  attribution: z.string().min(1),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string()).min(1),
  limits: z.object({
    electiveDeferral401k: positiveUsd,
    catchUp401kAge50: positiveUsd,
    catchUp401kAges60to63: positiveUsd,
    definedContributionOverall: positiveUsd,
    iraLimit: positiveUsd,
    catchUpIraAge50: positiveUsd,
    rothCatchUpPriorYearFicaWageThreshold: positiveUsd,
  }).strict(),
}).strict().superRefine((snapshot, context) => {
  const expectedSnapshotId = `irs-retirement-limits-${snapshot.observationPeriod}-v1`;
  if (snapshot.snapshotId !== expectedSnapshotId) {
    context.addIssue({
      code: 'custom',
      path: ['snapshotId'],
      message: `Expected ${expectedSnapshotId}.`,
    });
  }
  if (snapshot.limits.catchUp401kAges60to63 <= snapshot.limits.catchUp401kAge50) {
    context.addIssue({
      code: 'custom',
      path: ['limits', 'catchUp401kAges60to63'],
      message: 'Ages 60–63 catch-up must be higher than the general age-50 catch-up.',
    });
  }
  if (snapshot.limits.definedContributionOverall <= snapshot.limits.electiveDeferral401k) {
    context.addIssue({
      code: 'custom',
      path: ['limits', 'definedContributionOverall'],
      message: 'Section 415(c) overall limit must exceed the elective deferral limit.',
    });
  }
});

export type IrsRetirementSnapshot = z.infer<typeof irsRetirementSnapshotSchema>;
