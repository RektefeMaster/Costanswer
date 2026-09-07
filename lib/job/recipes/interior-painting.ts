import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '0.012 hours of a two-person painting crew per square foot of wall for two coats with standard prep.',
  confidenceImpact: 'lowers_to_medium',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const interiorPainting: JobRecipe = {
  jobId: 'interior-painting',
  version: '1.0.0',
  unit: 'sq-ft',
  trade: 'painting',
  crew: [{ socCode: '47-2141', role: 'Painters', count: sv(2, 'crew') }],
  laborHoursPerUnit: sv(0.012, 'hours'),
  materials: [{ componentId: 'interior-paint', quantityPerUnit: sv(0.00571, 'qty'), wastePercent: sv(0.1, 'waste'), critical: true }],
  equipment: [],
  permit: { kind: 'excluded', note: 'No permit is modeled for interior painting.' },
  disposal: { kind: 'excluded', note: 'Masking waste is not priced separately.' },
  modifiers: [
    { id: 'prep', label: 'Prep', defaultOptionId: 'standard', options: [opt('standard', 'Standard prep', 1, 'identity'), opt('heavy', 'Heavy patching or popcorn', 1.3, 'named', true)] },
    { id: 'coats', label: 'Coats', defaultOptionId: 'two', options: [opt('two', 'Two coats', 1, 'identity'), opt('three', 'Primer plus two coats', 1.22, 'named')] },
    { id: 'height', label: 'Ceiling height', defaultOptionId: 'eight', options: [opt('eight', 'About 8 ft', 1, 'identity'), opt('tall', 'About 9 ft', 1, 'identity')] },
    { id: 'occupied', label: 'House', defaultOptionId: 'empty', options: [opt('empty', 'Mostly empty', 1, 'identity'), opt('lived-in', 'Furniture and protection', 1.14, 'named')] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'medium',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: { kind: 'model_assumption', rationale: 'Two coats at about 350 sq ft of wall per gallon per coat, so 0.00571 gallon per sq ft before waste. Nine-foot ceilings increase wall area in the intake conversion, not with a second lump factor.', confidenceImpact: 'none', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    waste: { kind: 'model_assumption', rationale: '10% paint waste.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
