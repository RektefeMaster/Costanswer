import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '4 hours of a two-person carpentry crew per prehung exterior door. No licensed nationwide production-rate file is used.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const exteriorDoorReplacement: JobRecipe = {
  jobId: 'exterior-door-replacement',
  version: '1.0.0',
  unit: 'each',
  trade: 'carpentry',
  crew: [{ socCode: '47-2031', role: 'Carpenters', count: sv(2, 'crew') }],
  laborHoursPerUnit: sv(4, 'hours'),
  materials: [
    { componentId: 'exterior-door-fiberglass', quantityPerUnit: sv(20, 'qty'), wastePercent: sv(0, 'qty'), critical: true },
    { componentId: 'exterior-door-metal', quantityPerUnit: sv(20, 'qty'), wastePercent: sv(0, 'qty'), critical: true },
    { componentId: 'exterior-door-wood', quantityPerUnit: sv(20, 'qty'), wastePercent: sv(0, 'qty'), critical: true },
  ],
  equipment: [{ rateId: '8801', hoursPerUnit: sv(1, 'equip-hours'), label: 'Pickup truck' }],
  permit: { kind: 'excluded', note: 'Building permit fees are not included.' },
  disposal: { kind: 'excluded', note: 'Haul-away of the old door, sidelights, and storm doors are not priced.' },
  modifiers: [
    { id: 'material', label: 'Door material', defaultOptionId: 'fiberglass', options: [opt('fiberglass', 'Fiberglass prehung', 1, 'identity'), opt('metal', 'Metal prehung', 1, 'identity'), opt('wood', 'Wood prehung', 1, 'identity')] },
    { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [opt('normal', 'Normal access', 1, 'identity'), opt('tight', 'Tight stoop or finished trim', 1.14, 'named')] },
    { id: 'hardware', label: 'Hardware', defaultOptionId: 'reuse', options: [opt('reuse', 'Reuse lockset', 1, 'identity'), opt('new', 'New lockset and closer work', 1.1, 'named')] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: 'Each door is priced as 20 sq ft of prehung leaf (a 36-inch by 80-inch unit). Only the selected material line is priced.', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
