import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '0.12 hours of a two-person fence crew per linear foot of wood privacy fence on mostly flat ground.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const fenceInstall: JobRecipe = {
  jobId: 'fence-install',
  version: '1.0.0',
  unit: 'linear-ft',
  trade: 'fencing',
  crew: [{ socCode: '47-4031', role: 'Fence erectors', count: sv(2, 'crew') }],
  laborHoursPerUnit: sv(0.12, 'hours'),
  materials: [
    { componentId: 'wood-privacy-fence', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0.08, 'waste'), critical: true },
  ],
  equipment: [
    { rateId: '8801', hoursPerUnit: sv(0.02, 'equip-hours'), label: 'Pickup truck' },
    { rateId: '8541', hoursPerUnit: sv(0.015, 'equip-hours'), label: 'Skid steer' },
  ],
  permit: { kind: 'excluded', note: 'Fence permit fees are not included.' },
  disposal: { kind: 'excluded', note: 'Old-fence haul-away is not included.' },
  modifiers: [
    { id: 'height', label: 'Height', defaultOptionId: 'six', options: [opt('four', '4 ft', 1, 'identity'), opt('six', '6 ft', 1, 'identity')] },
    { id: 'slope', label: 'Grade', defaultOptionId: 'flat', options: [opt('flat', 'Mostly flat', 1, 'identity'), opt('sloped', 'Sloped or stepped', 1.18, 'named')] },
    { id: 'gates', label: 'Gates', defaultOptionId: 'one', options: [opt('none', 'No gate', 0.96, 'named'), opt('one', 'One walk gate', 1, 'identity'), opt('drive', 'Drive gate', 1.12, 'named')] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: 'Wood privacy uses the named 6 ft package per linear foot; 4 ft scales that package to 4/6.', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    waste: { kind: 'model_assumption', rationale: '8% material waste.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
