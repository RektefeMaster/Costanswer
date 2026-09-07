import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '0.04 hours of a two-person carpentry crew per square foot of siding (about 200 sq ft of wall per crew-day). No licensed nationwide production-rate file is used.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const sidingReplacement: JobRecipe = {
  jobId: 'siding-replacement',
  version: '1.0.0',
  unit: 'sq-ft',
  trade: 'carpentry',
  crew: [{ socCode: '47-2031', role: 'Carpenters', count: sv(2, 'crew') }],
  laborHoursPerUnit: sv(0.04, 'hours'),
  materials: [
    { componentId: 'vinyl-siding', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0.1, 'waste'), critical: true },
    { componentId: 'wood-siding', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0.1, 'waste'), critical: true },
  ],
  equipment: [{ rateId: '8801', hoursPerUnit: sv(0.01, 'equip-hours'), label: 'Pickup truck' }],
  permit: { kind: 'excluded', note: 'Building permit fees are not included.' },
  disposal: { kind: 'excluded', note: 'Tear-off dumpster, wrap, and trim packages beyond the siding finish are not priced.' },
  modifiers: [
    { id: 'material', label: 'Siding', defaultOptionId: 'vinyl', options: [opt('vinyl', 'Vinyl', 1, 'identity'), opt('wood', 'Wood', 1, 'identity')] },
    { id: 'stories', label: 'Stories', defaultOptionId: 'one', options: [opt('one', 'Mostly one story', 1, 'identity'), opt('two', 'Two stories or scaffolding', 1.22, 'named', true)] },
    { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [opt('normal', 'Normal access', 1, 'identity'), opt('tight', 'Tight lot or limited staging', 1.12, 'named')] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: 'Quantity is square feet of wall to cover. Only the selected finish line is priced. Housewrap, J-channel, and soffit are not separate sourced lines.', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    waste: { kind: 'model_assumption', rationale: '10% siding waste.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
