import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '0.15 hours of a two-person carpentry crew per square foot of walking surface for a simple pressure-treated deck.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const deckBuild: JobRecipe = {
  jobId: 'deck-build',
  version: '1.0.0',
  unit: 'sq-ft',
  trade: 'carpentry',
  crew: [{ socCode: '47-2031', role: 'Carpenters', count: sv(2, 'crew') }],
  laborHoursPerUnit: sv(0.15, 'hours'),
  materials: [{ componentId: 'pressure-treated-lumber', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0.12, 'waste'), critical: true }],
  equipment: [{ rateId: '8801', hoursPerUnit: sv(0.03, 'equip-hours'), label: 'Pickup truck' }],
  permit: { kind: 'excluded', note: 'Building permit fees are not included.' },
  disposal: { kind: 'excluded', note: 'Cut-off haul-away is not priced separately.' },
  modifiers: [
    { id: 'height', label: 'Height', defaultOptionId: 'low', options: [opt('low', 'Close to grade', 1, 'identity'), opt('elevated', 'Elevated with stairs', 1.2, 'named')] },
    { id: 'railing', label: 'Railing', defaultOptionId: 'wood', options: [opt('wood', 'Wood railing', 1, 'identity'), opt('premium', 'Cable or metal railing', 1.14, 'named')] },
    { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [opt('normal', 'Normal access', 1, 'identity'), opt('tight', 'Tight side yard', 1.12, 'named')] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: 'Lumber quantity is a named pressure-treated deck package per square foot of walking surface (joists, beam, ledger, rim, 2x6 decking, posts), not a single board.', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    waste: { kind: 'model_assumption', rationale: '12% lumber waste.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
