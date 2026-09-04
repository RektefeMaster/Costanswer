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
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

type ToolContext = { toolId: string; category: CategoryId };

export type AnalyticsPayloads = {
  tool_opened: ToolContext;
  calculation_started: ToolContext;
  calculation_completed: ToolContext & { resultType: 'valid' };
  result_interaction: ToolContext & { interaction: 'math_toggle' | 'assumptions_toggle' | 'search_result_click' };
  search: { resultType: 'matched' | 'empty' };
  related_tool_click: ToolContext & { relatedToolId: string };
  share: ToolContext & { interaction: 'native_share' | 'copy_link' };
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
  related_tool_click: { ...TOOL_CONTEXT, relatedToolId: boundedId },
  share: { ...TOOL_CONTEXT, interaction: oneOf(['native_share', 'copy_link']) },
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
