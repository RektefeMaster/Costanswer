import { z } from 'zod';
import snapshotJson from '@/data/irs-rmd/current.json';

const date = z.iso.date();
const period = z.number().finite().positive().max(40);

const lifetimeRow = z.object({
  age: z.number().int().min(72).max(120),
  period,
}).strict();

export const irsRmdSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  snapshotId: z.string().regex(/^irs-rmd-uniform-lifetime-/),
  datasetId: z.literal('irs-rmd-tables'),
  observationPeriod: z.literal('2026'),
  distributionYear: z.literal(2026),
  tableEffectiveYear: z.literal(2022),
  fetchedAt: z.string().datetime(),
  verifiedAt: date,
  sourceStatus: z.literal('verified'),
  sourceUrl: z.url(),
  sourceDocumentationUrl: z.url(),
  attribution: z.string().min(1),
  uniformLifetime: z.array(lifetimeRow).length(49),
  requiredBeginningAges: z.array(z.object({
    bornOnOrAfter: z.number().int().nullable(),
    age: z.union([z.literal(72), z.literal(73), z.literal(75)]),
  }).strict()).length(3),
  sources: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    url: z.url().refine((url) => {
      const parsed = new URL(url);
      return parsed.protocol === 'https:'
        && ['www.irs.gov', 'www.congress.gov'].includes(parsed.hostname)
        && !parsed.username && !parsed.password;
    }, 'Use a public IRS or Congress source without credentials.'),
    publishedAt: date.nullable(),
    detail: z.string().min(1),
  }).strict()).min(2),
  validationReport: z.array(z.string().min(1)).min(1),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict().superRefine((snapshot, context) => {
  const rows = snapshot.uniformLifetime;
  if (rows[0].age !== 72 || rows.at(-1)!.age !== 120) {
    context.addIssue({ code: 'custom', message: 'Table III must run from age 72 through 120.' });
  }
  rows.forEach((row, index) => {
    if (index === 0) return;
    if (row.age !== rows[index - 1].age + 1) {
      context.addIssue({ code: 'custom', message: 'Table III ages must be consecutive.', path: ['uniformLifetime', index] });
    }
    if (row.period >= rows[index - 1].period) {
      context.addIssue({ code: 'custom', message: 'Table III periods must fall as age rises.', path: ['uniformLifetime', index] });
    }
  });
  if (rows.at(-1)!.period !== 2) {
    context.addIssue({ code: 'custom', message: 'Age 120 and over must be 2.0.' });
  }
});

export type IrsRmdSnapshot = z.infer<typeof irsRmdSnapshotSchema>;
export const irsRmdSnapshot = irsRmdSnapshotSchema.parse(snapshotJson);

const byAge = new Map(irsRmdSnapshot.uniformLifetime.map((row) => [row.age, row.period]));

/** Table III denominator for the owner’s age as of birthday in the distribution year. */
export function uniformLifetimePeriod(age: number, snapshot: IrsRmdSnapshot = irsRmdSnapshot): number | undefined {
  if (!Number.isInteger(age) || age < 72) return undefined;
  if (age >= 120) return snapshot.uniformLifetime.at(-1)!.period;
  return byAge.get(age);
}

/**
 * The age RMDs must begin, from SECURE 2.0 rather than from Table III.
 *
 * Born 1951–1959: 73. Born 1960 or later: 75. Anyone older already started at 72.
 */
export function rmdRequiredBeginningAge(birthYear: number, snapshot: IrsRmdSnapshot = irsRmdSnapshot): number {
  for (const row of snapshot.requiredBeginningAges) {
    if (row.bornOnOrAfter === null || birthYear >= row.bornOnOrAfter) return row.age;
  }
  throw new Error('The required-beginning-age table has no matching row. Re-ingest the RMD snapshot.');
}
