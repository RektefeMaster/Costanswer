import { z } from 'zod';
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

const categorySchema = z.enum(['money', 'home', 'auto', 'everyday', 'food', 'shopping']);
const toolContextSchema = z.object({
  toolId: z.string().min(1).max(80),
  category: categorySchema,
}).strict();

const eventSchemas = {
  tool_opened: toolContextSchema,
  calculation_started: toolContextSchema,
  calculation_completed: toolContextSchema.extend({ resultType: z.enum(['valid']) }).strict(),
  result_interaction: toolContextSchema.extend({ interaction: z.enum(['math_toggle', 'assumptions_toggle', 'search_result_click']) }).strict(),
  search: z.object({ resultType: z.enum(['matched', 'empty']) }).strict(),
  related_tool_click: toolContextSchema.extend({ relatedToolId: z.string().min(1).max(80) }).strict(),
  share: toolContextSchema.extend({ interaction: z.enum(['native_share', 'copy_link']) }).strict(),
} satisfies Record<AnalyticsEventName, z.ZodType>;

export type AnalyticsPayloads = {
  [Name in AnalyticsEventName]: z.infer<(typeof eventSchemas)[Name]>;
};

export type AnalyticsEvent<Name extends AnalyticsEventName = AnalyticsEventName> = {
  name: Name;
  payload: AnalyticsPayloads[Name];
};

/** Strict runtime boundary: unknown or extra fields are rejected, never forwarded. */
export function parseAnalyticsEvent<Name extends AnalyticsEventName>(name: Name, payload: unknown): AnalyticsEvent<Name> | null {
  const parsed = eventSchemas[name].safeParse(payload);
  return parsed.success ? { name, payload: parsed.data as AnalyticsPayloads[Name] } : null;
}

/** Provider-neutral local bus. Emission stays off until analytics is explicitly enabled. */
export function emitAnalyticsEvent<Name extends AnalyticsEventName>(name: Name, payload: AnalyticsPayloads[Name]): void {
  if (typeof window === 'undefined' || !integrationConfig.analyticsEnabled) return;
  const event = parseAnalyticsEvent(name, payload);
  if (!event) return;
  window.dispatchEvent(new CustomEvent('costanswer:analytics', { detail: event }));
}
