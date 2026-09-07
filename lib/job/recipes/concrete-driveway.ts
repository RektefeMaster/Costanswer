import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '0.04 hours of a three-person concrete crew per square foot of 4-inch broom-finished driveway, excluding truck wait.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const concreteDriveway: JobRecipe = {
  jobId: 'concrete-driveway',
  version: '1.0.0',
  unit: 'sq-ft',
  trade: 'concrete',
  crew: [{ socCode: '47-2051', role: 'Cement masons', count: sv(3, 'crew') }],
  laborHoursPerUnit: sv(0.04, 'hours'),
  materials: [{ componentId: 'ready-mix-concrete', quantityPerUnit: sv(0.0123, 'qty'), wastePercent: sv(0.08, 'waste'), critical: true }],
  equipment: [
    { rateId: '8414', hoursPerUnit: sv(0.004, 'equip-hours'), label: 'Concrete mixer truck (cost proxy)' },
    { rateId: '8510', hoursPerUnit: sv(0.002, 'equip-hours'), label: 'Concrete saw' },
  ],
  permit: { kind: 'excluded', note: 'Driveway or right-of-way permits are not included.' },
  disposal: { kind: 'excluded', note: 'Form and leftover-mix disposal are not included.' },
  modifiers: [
    { id: 'thickness', label: 'Thickness', defaultOptionId: 'four', options: [opt('four', '4 inches', 1, 'identity'), opt('five', '5 inches', 1.06, 'named')] },
    { id: 'finish', label: 'Finish', defaultOptionId: 'broom', options: [opt('broom', 'Broom finish', 1, 'identity'), opt('stamped', 'Stamped or colored', 1.28, 'named', true)] },
    { id: 'access', label: 'Truck access', defaultOptionId: 'normal', options: [opt('normal', 'Chute reach', 1, 'identity'), opt('pump', 'Needs a pump or long wheelbarrow run', 1.2, 'named')] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: '0.0123 cubic yards per square foot is a 4-inch slab (1/81 CY per sq ft).', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    waste: { kind: 'model_assumption', rationale: '8% ready-mix waste and overage.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Five-inch slabs add a small finish-time factor. Extra concrete quantity is applied to the ready-mix line, not by scaling the whole job 18%.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
