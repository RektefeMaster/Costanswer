/**
 * The read-only description of a page that the monetization layer works from.
 *
 * Built after a calculator has produced its answer, from facts the reader has
 * already seen. Frozen and inert by construction — see `boundary.ts` for why
 * that matters and what it prevents.
 */
import { assertPlainData, freezeDeep, type CalculationFacts } from './boundary';
import type { Locale } from '@/lib/i18n/locales';

export const MONETIZATION_VERTICALS = [
  'home_services',
  'diy',
  'automotive',
  'travel',
  'financial',
  'insurance',
  'health',
  'general',
] as const;
export type MonetizationVertical = (typeof MONETIZATION_VERTICALS)[number];

/**
 * How much regulatory and reputational weight a page carries.
 *
 * `restricted` is not "high, but more so": it means no commercial module of any
 * kind may render, whatever the flags say. Health estimates are the example —
 * a BMI figure next to a paid offer is a different product than the one this
 * site claims to be.
 */
export const RISK_CLASSES = ['low', 'medium', 'high', 'restricted'] as const;
export type RiskClass = (typeof RISK_CLASSES)[number];

export const USER_INTENTS = ['hire_professional', 'diy', 'researching', 'unknown'] as const;
export type UserIntent = (typeof USER_INTENTS)[number];

export type MonetizationLocation = {
  readonly country?: string;
  readonly state?: string;
  readonly city?: string;
  readonly zip?: string;
};

export type MonetizationProject = {
  readonly type?: string;
  readonly size?: number;
  readonly unit?: string;
  readonly qualityTier?: string;
  readonly estimatedLow?: number;
  readonly estimatedHigh?: number;
  readonly estimatedMidpoint?: number;
  readonly timeline?: string;
};

export type MonetizationContext = {
  readonly pageId: string;
  readonly calculatorId?: string;
  readonly calculatorType?: string;
  readonly locale: Locale;
  readonly vertical: MonetizationVertical;
  readonly intent: UserIntent;
  readonly location?: MonetizationLocation;
  readonly project?: MonetizationProject;
  readonly leadEligible: boolean;
  readonly affiliateEligible: boolean;
  readonly adsEligible: boolean;
  readonly riskClass: RiskClass;
  /** Present only when a calculator produced the page. Never a live result. */
  readonly facts?: CalculationFacts;
};

export type MonetizationContextInput = {
  pageId: string;
  calculatorId?: string;
  calculatorType?: string;
  locale: Locale;
  vertical: MonetizationVertical;
  intent?: UserIntent;
  location?: MonetizationLocation;
  project?: MonetizationProject;
  leadEligible: boolean;
  affiliateEligible: boolean;
  adsEligible: boolean;
  riskClass: RiskClass;
  facts?: CalculationFacts;
};

const ZIP = /^\d{5}$/;

/**
 * Build the context.
 *
 * Two rules are applied here rather than trusted to callers, because both are
 * the kind of thing a busy component gets wrong:
 *
 *   - `restricted` clears every eligibility flag. A page cannot opt itself back
 *     in by passing `leadEligible: true`.
 *   - a malformed ZIP is dropped rather than carried, so coverage lookups never
 *     run on a half-typed value and no campaign is matched on nonsense.
 */
export function createMonetizationContext(input: MonetizationContextInput): MonetizationContext {
  const restricted = input.riskClass === 'restricted';
  const location = normalizeLocation(input.location);

  const context: MonetizationContext = {
    pageId: input.pageId,
    calculatorId: input.calculatorId,
    calculatorType: input.calculatorType,
    locale: input.locale,
    vertical: input.vertical,
    intent: input.intent ?? 'unknown',
    location,
    project: normalizeProject(input.project),
    leadEligible: !restricted && input.leadEligible,
    affiliateEligible: !restricted && input.affiliateEligible,
    adsEligible: !restricted && input.adsEligible,
    riskClass: input.riskClass,
    facts: input.facts,
  };

  assertPlainData(context, 'MonetizationContext');
  return freezeDeep(context);
}

function normalizeLocation(location: MonetizationLocation | undefined): MonetizationLocation | undefined {
  if (!location) return undefined;
  const zip = typeof location.zip === 'string' && ZIP.test(location.zip.trim()) ? location.zip.trim() : undefined;
  const state = typeof location.state === 'string' && /^[A-Z]{2}$/.test(location.state) ? location.state : undefined;
  const next: MonetizationLocation = {
    country: location.country ?? (state || zip ? 'US' : undefined),
    state,
    city: location.city?.trim() || undefined,
    zip,
  };
  return Object.values(next).some((value) => value !== undefined) ? next : undefined;
}

function normalizeProject(project: MonetizationProject | undefined): MonetizationProject | undefined {
  if (!project) return undefined;
  const size = Number.isFinite(project.size) && (project.size as number) > 0 ? project.size : undefined;
  const next: MonetizationProject = {
    type: project.type,
    size,
    unit: size === undefined ? undefined : project.unit,
    qualityTier: project.qualityTier,
    estimatedLow: finitePositive(project.estimatedLow),
    estimatedHigh: finitePositive(project.estimatedHigh),
    estimatedMidpoint: finitePositive(project.estimatedMidpoint),
    timeline: project.timeline,
  };
  return Object.values(next).some((value) => value !== undefined) ? next : undefined;
}

function finitePositive(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** A context for a page with no calculator — a guide, a hub, an info page. */
export function contentPageContext(pageId: string, locale: Locale, adsEligible: boolean): MonetizationContext {
  return createMonetizationContext({
    pageId,
    locale,
    vertical: 'general',
    leadEligible: false,
    affiliateEligible: false,
    adsEligible,
    riskClass: 'low',
  });
}
