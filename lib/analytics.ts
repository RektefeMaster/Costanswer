import { CATEGORY_IDS, type CategoryId } from './categories';
import { integrationConfig } from './integration-config';

export const ANALYTICS_EVENTS = [
  'tool_opened',
  'calculation_started',
  'calculation_completed',
  'result_interaction',
  'search',
  'related_tool_click',
  'share',
  'advanced_opened',
  'compare_used',
  'reverse_used',
  'quote_checked',
  'source_clicked',
  'guide_to_calculator',
  'language_switched',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

type ToolContext = { toolId: string; category: CategoryId };

/**
 * Locales this site is planned to serve.
 *
 * Declared here rather than imported because the localization module does not
 * exist yet, and `language_switched` needs a closed set to validate against —
 * an open string would let a switcher send whatever it liked. When `lib/i18n`
 * lands it should import this list rather than declaring a second one.
 */
export const ANALYTICS_LOCALES = ['en-US', 'es-US'] as const;
export type AnalyticsLocale = (typeof ANALYTICS_LOCALES)[number];

/** What the Job Cost quote checker concluded. Never the quoted amount. */
export const QUOTE_VERDICTS = ['within', 'below', 'above', 'unassessable'] as const;

export type AnalyticsPayloads = {
  tool_opened: ToolContext;
  calculation_started: ToolContext;
  calculation_completed: ToolContext & { resultType: 'valid' };
  result_interaction: ToolContext & { interaction: 'math_toggle' | 'assumptions_toggle' | 'search_result_click' };
  search: { resultType: 'matched' | 'empty' };
  related_tool_click: ToolContext & { relatedToolId: string };
  share: ToolContext & { interaction: 'native_share' | 'copy_link' };
  /** Which collapsed section, by its stable id — never its contents. */
  advanced_opened: ToolContext & { section: string };
  compare_used: ToolContext;
  /** Which input the reader solved backwards for, by field id. */
  reverse_used: ToolContext & { solvedFor: string };
  /** The verdict only. The quoted figure is a price and never leaves the page. */
  quote_checked: ToolContext & { verdict: (typeof QUOTE_VERDICTS)[number] };
  source_clicked: ToolContext & { sourceId: string };
  guide_to_calculator: ToolContext & { guideSlug: string };
  language_switched: { from: AnalyticsLocale; to: AnalyticsLocale };
};

export type AnalyticsEvent<Name extends AnalyticsEventName = AnalyticsEventName> = {
  name: Name;
  payload: AnalyticsPayloads[Name];
};

/**
 * Per-field checks, written out rather than pulled from a schema library.
 *
 * This module is imported by every calculator shell, so a validator here lands
 * in the bundle of every page — including the ones with no calculator at all.
 * The rules are a short allowlist and the boundary is exercised by
 * tests/platform-contracts.spec.ts, so they are cheaper to state directly.
 */
type FieldCheck = (value: unknown) => boolean;

const boundedId: FieldCheck = (value) => typeof value === 'string' && value.length >= 1 && value.length <= 80;
const oneOf = (allowed: readonly string[]): FieldCheck => (value) => typeof value === 'string' && allowed.includes(value);

const TOOL_CONTEXT: Record<string, FieldCheck> = {
  toolId: boundedId,
  category: oneOf(CATEGORY_IDS),
};

const eventFields: Record<AnalyticsEventName, Record<string, FieldCheck>> = {
  tool_opened: TOOL_CONTEXT,
  calculation_started: TOOL_CONTEXT,
  calculation_completed: { ...TOOL_CONTEXT, resultType: oneOf(['valid']) },
  result_interaction: { ...TOOL_CONTEXT, interaction: oneOf(['math_toggle', 'assumptions_toggle', 'search_result_click']) },
  search: { resultType: oneOf(['matched', 'empty']) },
  /*
   * The plan also lists `related_calculator_clicked`. It is not added: this
   * event already carries exactly that — tool context plus the id of the tool
   * clicked through to — and two names for one action would split the funnel
   * between them for no gain.
   */
  related_tool_click: { ...TOOL_CONTEXT, relatedToolId: boundedId },
  share: { ...TOOL_CONTEXT, interaction: oneOf(['native_share', 'copy_link']) },
  advanced_opened: { ...TOOL_CONTEXT, section: boundedId },
  compare_used: TOOL_CONTEXT,
  reverse_used: { ...TOOL_CONTEXT, solvedFor: boundedId },
  quote_checked: { ...TOOL_CONTEXT, verdict: oneOf(QUOTE_VERDICTS) },
  source_clicked: { ...TOOL_CONTEXT, sourceId: boundedId },
  guide_to_calculator: { ...TOOL_CONTEXT, guideSlug: boundedId },
  language_switched: { from: oneOf(ANALYTICS_LOCALES), to: oneOf(ANALYTICS_LOCALES) },
};

/** Strict runtime boundary: unknown or extra fields are rejected, never forwarded. */
export function parseAnalyticsEvent<Name extends AnalyticsEventName>(name: Name, payload: unknown): AnalyticsEvent<Name> | null {
  const fields = eventFields[name];
  if (!fields || payload === null || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const entries = Object.entries(payload as Record<string, unknown>);
  if (entries.length !== Object.keys(fields).length) return null;
  for (const [key, value] of entries) {
    const check = Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : undefined;
    if (!check || !check(value)) return null;
  }
  return { name, payload: payload as AnalyticsPayloads[Name] };
}

/** Provider-neutral local bus. Emission stays off until analytics is explicitly enabled. */
export function emitAnalyticsEvent<Name extends AnalyticsEventName>(name: Name, payload: AnalyticsPayloads[Name]): void {
  if (typeof window === 'undefined' || !integrationConfig.analyticsEnabled) return;
  const event = parseAnalyticsEvent(name, payload);
  if (!event) return;
  window.dispatchEvent(new CustomEvent('costanswer:analytics', { detail: event }));
}
