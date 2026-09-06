/**
 * Runtime validation for everything the browser sends to the lead endpoints.
 *
 * The same posture the calculation engines already take: nothing is trusted,
 * every bound is explicit, and a rejection says what to fix in the reader's own
 * language rather than naming a field path.
 */
import { z } from 'zod';
import { LOCALES } from '@/lib/i18n/locales';

const ZIP = /^\d{5}$/;
const STATE = /^[A-Z]{2}$/;
/** Deliberately loose: names are not a validation problem worth failing on. */
const NAME_MAX = 60;

export const coverageRequestSchema = z.object({
  vertical: z.string().min(1).max(64),
  zip: z.string().regex(ZIP, 'Enter a five-digit ZIP code.'),
  pageId: z.string().min(1).max(120),
  locale: z.enum(LOCALES),
}).strict();

export type CoverageRequest = z.infer<typeof coverageRequestSchema>;

export const leadQualificationSchema = z.object({
  homeowner: z.boolean().optional(),
  propertyType: z.enum(['single_family', 'condo', 'townhouse', 'multi_family', 'mobile', 'commercial']).optional(),
  timeframe: z.enum(['immediately', 'within_1_month', 'within_3_months', 'within_6_months', 'planning']).optional(),
  workType: z.enum(['repair', 'replacement', 'new_installation']).optional(),
  currentCondition: z.enum(['emergency', 'poor', 'fair', 'good']).optional(),
  budgetRange: z.string().max(40).optional(),
}).strict();

export const leadProjectSchema = z.object({
  type: z.string().max(80).optional(),
  size: z.number().finite().positive().max(1_000_000).optional(),
  unit: z.string().max(24).optional(),
  qualityTier: z.string().max(40).optional(),
  estimatedLow: z.number().finite().nonnegative().max(100_000_000).optional(),
  estimatedHigh: z.number().finite().nonnegative().max(100_000_000).optional(),
  timeline: z.string().max(40).optional(),
}).strict();

export const leadContactSchema = z.object({
  firstName: z.string().trim().min(1).max(NAME_MAX).optional(),
  lastName: z.string().trim().min(1).max(NAME_MAX).optional(),
  phone: z.string().trim().min(7).max(24).optional(),
  email: z.string().trim().email('Enter an email address we can reach you at.').max(254).optional(),
  addressLine1: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
}).strict();

export const leadSubmissionSchema = z.object({
  vertical: z.string().min(1).max(64),
  pageId: z.string().min(1).max(120),
  calculatorId: z.string().max(120).optional(),
  locale: z.enum(LOCALES),
  zip: z.string().regex(ZIP, 'Enter a five-digit ZIP code.'),
  state: z.string().regex(STATE).optional(),
  project: leadProjectSchema.default({}),
  qualification: leadQualificationSchema.default({}),
  contact: leadContactSchema,
  consent: z.object({
    version: z.string().min(1).max(40),
    accepted: z.literal(true, { message: 'Tick the box so we can send your request.' }),
    partnerName: z.string().min(1).max(120),
  }).strict(),
  /** Anti-bot. A filled honeypot is a silent success, never an error message. */
  website: z.string().max(0).optional(),
  /** Milliseconds the form was on screen. Sub-second completion is not a person. */
  elapsedMs: z.number().int().nonnegative().max(86_400_000).optional(),
}).strict().superRefine((value, context) => {
  if (!value.contact.phone && !value.contact.email) {
    context.addIssue({
      code: 'custom',
      path: ['contact'],
      message: 'Give us a phone number or an email address so a professional can reach you.',
    });
  }
  const { estimatedLow, estimatedHigh } = value.project;
  if (estimatedLow !== undefined && estimatedHigh !== undefined && estimatedLow > estimatedHigh) {
    context.addIssue({ code: 'custom', path: ['project'], message: 'The estimate range is inverted.' });
  }
});

export type LeadSubmissionInput = z.infer<typeof leadSubmissionSchema>;

/**
 * Reasons to drop a submission without telling the sender why.
 *
 * A bot that learns which signal caught it adapts. A person never sees these
 * because a person never triggers them.
 */
export type SilentRejection = 'honeypot' | 'too_fast' | 'rate_limited';

export const MINIMUM_FORM_MS = 2_000;

export function silentRejectionFor(input: LeadSubmissionInput): SilentRejection | null {
  if (input.website && input.website.length > 0) return 'honeypot';
  if (input.elapsedMs !== undefined && input.elapsedMs < MINIMUM_FORM_MS) return 'too_fast';
  return null;
}
