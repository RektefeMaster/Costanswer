import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '0.15 hours of a two-person glazier crew per square foot of vinyl window (about two crew-hours per typical 15 sq ft unit). No licensed nationwide production-rate file is used.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const windowReplacement: JobRecipe = {
  jobId: 'window-replacement',
  version: '1.0.0',
  unit: 'sq-ft',
  trade: 'glazing',
  crew: [{ socCode: '47-2121', role: 'Glaziers', count: sv(2, 'crew') }],
  laborHoursPerUnit: sv(0.15, 'hours'),
  materials: [{ componentId: 'vinyl-window', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0, 'qty'), critical: true }],
  equipment: [{ rateId: '8801', hoursPerUnit: sv(0.02, 'equip-hours'), label: 'Pickup truck' }],
  permit: { kind: 'excluded', note: 'Window permit fees are not included.' },
  disposal: { kind: 'excluded', note: 'Haul-away of old sash, interior casing, and exterior trim beyond the unit are not priced.' },
  modifiers: [
    { id: 'stories', label: 'Stories', defaultOptionId: 'one', options: [opt('one', 'Mostly first story', 1, 'identity'), opt('two', 'Second story or higher', 1.18, 'named')] },
    { id: 'removal', label: 'Existing windows', defaultOptionId: 'standard', options: [opt('standard', 'Standard tear-out', 1, 'identity'), opt('full-frame', 'Full-frame or structural opening', 1.16, 'named')] },
    { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [opt('normal', 'Normal access', 1, 'identity'), opt('tight', 'Tight lot or limited staging', 1.12, 'named')] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: 'Quantity is square feet of vinyl window unit (width × height × count). The NREL intercept is already per square foot of window.', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
