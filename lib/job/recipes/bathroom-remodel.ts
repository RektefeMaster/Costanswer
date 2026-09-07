import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '40 hours of mixed-trade crew time for a standard full bathroom on the same layout. Composite recipes cannot be high confidence.',
  confidenceImpact: 'lowers_to_low',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const bathroomRemodel: JobRecipe = {
  jobId: 'bathroom-remodel',
  version: '1.0.0',
  unit: 'each',
  trade: 'multi',
  crew: [
    { socCode: '47-2152', role: 'Plumbers', count: sv(1, 'crew') },
    { socCode: '47-2031', role: 'Carpenters', count: sv(1, 'crew') },
    { socCode: '47-2111', role: 'Electricians', count: sv(0.4, 'crew') },
    { socCode: '47-2141', role: 'Painters', count: sv(0.4, 'crew') },
  ],
  laborHoursPerUnit: sv(40, 'hours'),
  materials: [
    { componentId: 'bath-tile', quantityPerUnit: sv(140, 'qty'), wastePercent: sv(0.12, 'waste'), critical: true },
    { componentId: 'toilet', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0, 'qty'), critical: true },
    { componentId: 'vanity', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0, 'qty'), critical: true },
  ],
  equipment: [{ rateId: '8801', hoursPerUnit: sv(8, 'equip-hours'), label: 'Pickup truck' }],
  permit: { kind: 'excluded', note: 'Plumbing and building permits are not included.' },
  disposal: { kind: 'excluded', note: 'Demo dumpster is not included.' },
  modifiers: [
    { id: 'size', label: 'Size', defaultOptionId: 'standard', options: [opt('small', 'Small (about 40 sq ft)', 0.82, 'named'), opt('standard', 'Standard (about 60 sq ft)', 1, 'identity'), opt('large', 'Large (about 100 sq ft)', 1.28, 'named')] },
    { id: 'finish', label: 'Finish', defaultOptionId: 'builder', options: [opt('builder', 'Builder grade', 1, 'identity'), opt('mid', 'Mid grade', 1.22, 'named')] },
    { id: 'layout', label: 'Layout', defaultOptionId: 'same', options: [opt('same', 'Same layout', 1, 'identity'), opt('move', 'Move plumbing', 1.35, 'named', true)] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'low',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: 'One standard full bath uses about 140 sq ft of ceramic tile (floor plus shower walls), one toilet, and one 36-inch vanity. A separate tub or shower pan is not a priced line. Size modifiers scale the modeled total.', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    waste: { kind: 'model_assumption', rationale: '12% tile waste.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
