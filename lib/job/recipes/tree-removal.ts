import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '4 hours of a two-person tree crew per medium tree in an open yard, plus FEMA chipper and pickup cost proxies.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const treeRemoval: JobRecipe = {
  jobId: 'tree-removal',
  version: '1.0.0',
  unit: 'each',
  trade: 'tree',
  crew: [{ socCode: '37-3013', role: 'Tree trimmers', count: sv(2, 'crew') }],
  laborHoursPerUnit: sv(4, 'hours'),
  materials: [],
  equipment: [
    { rateId: '8201', hoursPerUnit: sv(4, 'equip-hours'), label: 'Brush chipper' },
    { rateId: '8801', hoursPerUnit: sv(4, 'equip-hours'), label: 'Pickup truck' },
  ],
  permit: { kind: 'excluded', note: 'Local tree-removal permits are not included.' },
  disposal: { kind: 'excluded', note: 'Dump fees beyond chipping on site are not included.' },
  modifiers: [
    { id: 'height', label: 'Height', defaultOptionId: 'medium', options: [opt('small', 'Under 30 ft', 0.7, 'named'), opt('medium', '30–60 ft', 1, 'identity'), opt('large', 'Over 60 ft', 1.55, 'named', true)] },
    { id: 'proximity', label: 'Near structures', defaultOptionId: 'clear', options: [opt('clear', 'Open yard', 1, 'identity'), opt('near', 'Near a house, wires, or fence', 1.35, 'named', true)] },
    { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [opt('normal', 'Truck access', 1, 'identity'), opt('tight', 'Backyard or no truck access', 1.25, 'named')] },
    { id: 'stump', label: 'Stump', defaultOptionId: 'leave', options: [opt('leave', 'Leave stump', 1, 'identity'), opt('grind', 'Grind stump', 1.18, 'named')] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
