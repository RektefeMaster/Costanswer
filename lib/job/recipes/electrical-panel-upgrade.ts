import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '12 hours of a two-person electrician crew for a residential panel upgrade.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const electricalPanelUpgrade: JobRecipe = {
  jobId: 'electrical-panel-upgrade',
  version: '1.0.0',
  unit: 'each',
  trade: 'electrical',
  crew: [{ socCode: '47-2111', role: 'Electricians', count: sv(2, 'crew') }],
  laborHoursPerUnit: sv(12, 'hours'),
  materials: [{ componentId: 'service-panel-200a', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0, 'qty'), critical: true }],
  equipment: [{ rateId: '8801', hoursPerUnit: sv(3, 'equip-hours'), label: 'Pickup truck' }],
  permit: { kind: 'excluded', note: 'Electrical permit fees are not included.' },
  disposal: { kind: 'excluded', note: 'Disposal of the old panel is not priced separately.' },
  modifiers: [
    { id: 'service', label: 'Service size', defaultOptionId: 'to-200', options: [opt('to-200', 'Upgrade to 200 amp', 1, 'identity'), opt('same', 'Replace like-for-like', 0.9, 'named')] },
    { id: 'location', label: 'Panel location', defaultOptionId: 'easy', options: [opt('easy', 'Accessible interior or exterior', 1, 'identity'), opt('hard', 'Finished wall or long feeder run', 1.2, 'named', true)] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: 'One service panel per recipe unit.', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
