import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '16 hours of a two-person HVAC crew per split-system heat-pump replacement. No licensed nationwide production-rate file is used.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const heatPumpReplacement: JobRecipe = {
  jobId: 'heat-pump-replacement',
  version: '1.0.0',
  unit: 'each',
  trade: 'hvac',
  crew: [{ socCode: '49-9021', role: 'HVAC mechanics', count: sv(2, 'crew') }],
  laborHoursPerUnit: sv(16, 'hours'),
  materials: [{ componentId: 'air-source-heat-pump', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0, 'qty'), critical: true }],
  equipment: [{ rateId: '8801', hoursPerUnit: sv(4, 'equip-hours'), label: 'Pickup truck' }],
  permit: { kind: 'excluded', note: 'Local permit fees are not included.' },
  disposal: { kind: 'excluded', note: 'Recovery and disposal of the old system are not priced separately.' },
  modifiers: [
    { id: 'efficiency', label: 'Equipment tier', defaultOptionId: 'standard', options: [opt('standard', 'Standard efficiency', 1, 'identity'), opt('high', 'High efficiency', 1.18, 'named')] },
    { id: 'ducts', label: 'Ductwork', defaultOptionId: 'reuse', options: [opt('reuse', 'Reuse existing ducts', 1, 'identity'), opt('revise', 'Revise or add ducts', 1.22, 'named', true)] },
    { id: 'access', label: 'Install access', defaultOptionId: 'normal', options: [opt('normal', 'Normal access', 1, 'identity'), opt('tight', 'Crawlspace, attic, or tight mechanical room', 1.15, 'named')] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: 'One 3-ton blower-coil air-source heat pump per recipe unit. Tonnage scales this equipment line from the 3-ton EIA baseline.', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
