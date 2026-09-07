import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '3 hours of one plumber for a like-for-like tank water heater swap in an accessible location.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const waterHeaterReplacement: JobRecipe = {
  jobId: 'water-heater-replacement',
  version: '1.0.0',
  unit: 'each',
  trade: 'plumbing',
  crew: [{ socCode: '47-2152', role: 'Plumbers', count: sv(1, 'crew') }],
  laborHoursPerUnit: sv(3, 'hours'),
  materials: [{ componentId: 'tank-water-heater', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0, 'qty'), critical: true }, { componentId: 'tank-water-heater-electric', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0, 'qty'), critical: true }],
  equipment: [{ rateId: '8801', hoursPerUnit: sv(1.5, 'equip-hours'), label: 'Pickup truck' }],
  permit: { kind: 'excluded', note: 'Local permit fees are not included.' },
  disposal: { kind: 'excluded', note: 'Haul-away of the old heater is not priced separately.' },
  modifiers: [
    { id: 'fuel', label: 'Fuel', defaultOptionId: 'gas', options: [opt('gas', 'Natural gas', 1, 'identity'), opt('electric', 'Electric', 1, 'identity')] },
    { id: 'location', label: 'Location', defaultOptionId: 'garage', options: [opt('garage', 'Garage or utility room', 1, 'identity'), opt('attic', 'Attic or tight closet', 1.2, 'named', true)] },
    { id: 'code', label: 'Code upgrades', defaultOptionId: 'like-for-like', options: [opt('like-for-like', 'Like-for-like swap', 1, 'identity'), opt('upgrades', 'Pan, expansion tank, or venting upgrades', 1.16, 'named')] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: 'One EIA typical tank per recipe unit: 40-gallon gas or 36-gallon electric, selected by the fuel modifier. Only the selected tank is priced.', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
