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
export type AnalyticsPayload = {
  toolId?: string;
  category?: string;
  interaction?: string;
  resultType?: string;
};

export function emitAnalyticsEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('howmuchusa:analytics', { detail: { name, ...payload } }));
}

