import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '0.015 hours of a two-person drywall crew per square foot of board for hanging only. No licensed nationwide production-rate file is used.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const drywallInstall: JobRecipe = {
  jobId: 'drywall-install',
  version: '1.0.0',
  unit: 'sq-ft',
  trade: 'drywall',
  crew: [{ socCode: '47-2081', role: 'Drywall installers', count: sv(2, 'crew') }],
  laborHoursPerUnit: sv(0.015, 'hours'),
  materials: [{ componentId: 'drywall-board', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0.1, 'waste'), critical: true }],
  equipment: [{ rateId: '8801', hoursPerUnit: sv(0.008, 'equip-hours'), label: 'Pickup truck' }],
  permit: { kind: 'excluded', note: 'No permit is modeled for hanging drywall.' },
  disposal: { kind: 'excluded', note: 'Tape, joint compound, texture, paint, and scrap haul-away are not priced.' },
  modifiers: [
    { id: 'location', label: 'Location', defaultOptionId: 'walls', options: [opt('walls', 'Walls', 1, 'identity'), opt('ceilings', 'Ceilings or both', 1.16, 'named')] },
    { id: 'occupied', label: 'House', defaultOptionId: 'empty', options: [opt('empty', 'Mostly empty', 1, 'identity'), opt('lived-in', 'Furniture and protection', 1.12, 'named')] },
    { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [opt('normal', 'Normal access', 1, 'identity'), opt('tight', 'Tight stairs or finished rooms', 1.12, 'named')] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: 'Quantity is square feet of drywall board. The NREL intercept is board only; tape and mud are not sourced lines and are excluded.', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    waste: { kind: 'model_assumption', rationale: '10% board waste.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
