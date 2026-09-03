import { z } from 'zod';
import { isStateCode, STATE_CODES, type StateCode } from '@/lib/location/states';
import { FILING_STATUSES, type FilingStatus } from '@/lib/calculations/tax/types';

const isoDateTime = z.string().datetime();
const sha256Hex = z.string().regex(/^[a-f0-9]{64}$/);
const sourceUrl = z.string().url();

export const taxBracketSchema = z.object({
  notOver: z.number().finite().positive().nullable(),
  rate: z.number().finite().min(0).max(1),
}).strict();

const filingStatusNumberSchema = z.object({
  single: z.number().finite().min(0),
  marriedFilingJointly: z.number().finite().min(0),
  marriedFilingSeparately: z.number().finite().min(0),
  headOfHousehold: z.number().finite().min(0),
}).strict();

const filingStatusBracketsSchema = z.object({
  single: z.array(taxBracketSchema).min(1),
  marriedFilingJointly: z.array(taxBracketSchema).min(1),
  marriedFilingSeparately: z.array(taxBracketSchema).min(1),
  headOfHousehold: z.array(taxBracketSchema).min(1),
}).strict();

function addBracketIssues(
  brackets: z.infer<typeof taxBracketSchema>[],
  path: Array<string | number>,
  context: z.RefinementCtx,
) {
  let previous = 0;
  const lastIndex = brackets.length - 1;
  for (const [index, bracket] of brackets.entries()) {
    const isLast = index === lastIndex;
    if (isLast && bracket.notOver !== null) {
      context.addIssue({ code: 'custom', path: [...path, index, 'notOver'], message: 'The top tax bracket must be open-ended.' });
    }
    if (!isLast && bracket.notOver === null) {
      context.addIssue({ code: 'custom', path: [...path, index, 'notOver'], message: 'Only the top tax bracket may be open-ended.' });
    }
    if (bracket.notOver !== null) {
      if (!(bracket.notOver > previous)) {
        context.addIssue({ code: 'custom', path: [...path, index, 'notOver'], message: 'Bracket thresholds must be strictly increasing.' });
      }
      previous = bracket.notOver;
    }
  }
}

const stateMetadataSchema = z.object({
  stateCode: z.string().refine(isStateCode, 'Unknown U.S. state code.'),
  provider: z.string().min(1),
  sourceName: z.string().min(1),
  sourceUrl,
  publishedAt: isoDateTime,
  verifiedAt: isoDateTime,
  version: z.string().min(1),
}).strict();

const unsupportedStateSchema = stateMetadataSchema.extend({
  status: z.literal('unsupported'),
  reason: z.string().min(1),
  sourceStatus: z.literal('unsupported'),
}).strict();

const noneStateSchema = stateMetadataSchema.extend({
  status: z.literal('supported'),
  kind: z.literal('none'),
  sourceStatus: z.literal('verified'),
  notes: z.array(z.string().min(1)).min(1),
}).strict();

const flatStateSchema = stateMetadataSchema.extend({
  status: z.literal('supported'),
  kind: z.literal('flat'),
  sourceStatus: z.literal('verified'),
  rate: z.number().finite().min(0).max(1),
  exemptionByFilingStatus: filingStatusNumberSchema,
  notes: z.array(z.string().min(1)).min(1),
}).strict();

const flatWithSurtaxStateSchema = stateMetadataSchema.extend({
  status: z.literal('supported'),
  kind: z.literal('flatWithSurtax'),
  sourceStatus: z.literal('verified'),
  rate: z.number().finite().min(0).max(1),
  surtaxRate: z.number().finite().min(0).max(1),
  surtaxThreshold: z.number().finite().positive(),
  notes: z.array(z.string().min(1)).min(1),
}).strict();

const progressiveStateSchema = stateMetadataSchema.extend({
  status: z.literal('supported'),
  kind: z.literal('progressive'),
  sourceStatus: z.literal('verified'),
  scheduleTaxYear: z.number().int().min(2000).max(2100),
  standardDeductionByFilingStatus: filingStatusNumberSchema,
  bracketsByFilingStatus: filingStatusBracketsSchema,
  additionalTax: z.object({
    name: z.string().min(1),
    threshold: z.number().finite().positive(),
    rate: z.number().finite().min(0).max(1),
  }).strict().optional(),
  notes: z.array(z.string().min(1)).min(1),
}).strict();

export const stateTaxPolicySchema = z.union([
  unsupportedStateSchema,
  noneStateSchema,
  flatStateSchema,
  flatWithSurtaxStateSchema,
  progressiveStateSchema,
]);

export const federalTaxYearSchema = z.object({
  taxYear: z.number().int().min(2000).max(2100),
  provider: z.literal('Internal Revenue Service'),
  sourceName: z.string().min(1),
  sourceUrl,
  publishedAt: isoDateTime,
  verifiedAt: isoDateTime,
  sourceStatus: z.literal('verified'),
  version: z.string().min(1),
  standardDeductionByFilingStatus: filingStatusNumberSchema,
  bracketsByFilingStatus: filingStatusBracketsSchema,
}).strict().superRefine((federal, context) => {
  for (const status of FILING_STATUSES) {
    addBracketIssues(federal.bracketsByFilingStatus[status], ['bracketsByFilingStatus', status], context);
  }
});

export const ficaTaxYearSchema = z.object({
  taxYear: z.number().int().min(2000).max(2100),
  provider: z.literal('Social Security Administration'),
  sourceName: z.string().min(1),
  sourceUrl,
  additionalMedicareSourceUrl: sourceUrl,
  publishedAt: isoDateTime,
  verifiedAt: isoDateTime,
  sourceStatus: z.literal('verified'),
  version: z.string().min(1),
  socialSecurityWageBase: z.number().finite().positive(),
  socialSecurityRate: z.number().finite().min(0).max(1),
  medicareRate: z.number().finite().min(0).max(1),
  additionalMedicareRate: z.number().finite().min(0).max(1),
  additionalMedicareThresholdByFilingStatus: filingStatusNumberSchema,
}).strict();

export const taxYearSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal('us-tax-v1.0.0'),
  snapshotId: z.string().min(1),
  taxYear: z.number().int().min(2000).max(2100),
  provider: z.string().min(1),
  publishedAt: isoDateTime,
  verifiedAt: isoDateTime,
  sourceStatus: z.literal('verified'),
  version: z.string().min(1),
  federal: federalTaxYearSchema,
  fica: ficaTaxYearSchema,
  states: z.array(stateTaxPolicySchema).length(51),
  normalizedSha256: sha256Hex,
}).strict().superRefine((snapshot, context) => {
  const expectedSnapshotId = `us-tax-${snapshot.taxYear}-v1`;
  if (snapshot.snapshotId !== expectedSnapshotId) {
    context.addIssue({ code: 'custom', path: ['snapshotId'], message: `Snapshot ID must be ${expectedSnapshotId}.` });
  }
  if (snapshot.federal.taxYear !== snapshot.taxYear) {
    context.addIssue({ code: 'custom', path: ['federal', 'taxYear'], message: 'Federal tax year must match the snapshot tax year.' });
  }
  if (snapshot.fica.taxYear !== snapshot.taxYear) {
    context.addIssue({ code: 'custom', path: ['fica', 'taxYear'], message: 'FICA tax year must match the snapshot tax year.' });
  }
  if (snapshot.fica.socialSecurityWageBase <= 0) {
    context.addIssue({ code: 'custom', path: ['fica', 'socialSecurityWageBase'], message: 'Social Security wage base must be positive.' });
  }
  const seen = new Set<StateCode>();
  const sortedCodes = [...snapshot.states].map((row) => row.stateCode).sort();
  for (const [index, row] of snapshot.states.entries()) {
    if (seen.has(row.stateCode)) {
      context.addIssue({ code: 'custom', path: ['states', index, 'stateCode'], message: `Duplicate state code: ${row.stateCode}` });
    }
    seen.add(row.stateCode);
    if (row.stateCode !== sortedCodes[index]) {
      context.addIssue({ code: 'custom', path: ['states', index, 'stateCode'], message: 'State rows must be sorted by state code.' });
    }
    if (row.status === 'supported' && row.kind === 'progressive') {
      for (const status of FILING_STATUSES) {
        addBracketIssues(row.bracketsByFilingStatus[status], ['states', index, 'bracketsByFilingStatus', status], context);
      }
    }
  }
  const missing = STATE_CODES.filter((stateCode) => !seen.has(stateCode));
  if (missing.length > 0) {
    context.addIssue({ code: 'custom', path: ['states'], message: `Missing state codes: ${missing.join(', ')}` });
  }
});

export type TaxYearSnapshot = z.infer<typeof taxYearSnapshotSchema>;
export type StateTaxPolicy = z.infer<typeof stateTaxPolicySchema>;
export type FederalTaxYear = z.infer<typeof federalTaxYearSchema>;
export type FicaTaxYear = z.infer<typeof ficaTaxYearSchema>;
export type SupportedStatePolicy = Extract<StateTaxPolicy, { status: 'supported' }>;

export function filingStatusValues<T>(value: T): Record<FilingStatus, T> {
  return {
    single: value,
    marriedFilingJointly: value,
    marriedFilingSeparately: value,
    headOfHousehold: value,
  };
}
