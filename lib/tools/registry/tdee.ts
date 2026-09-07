import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { TDEE_ENGINE_ID } from '../../calculations/health/formulas';

export const tool: ToolDefinition = {
  id: 'tdee',
  path: '/health/tdee',
  title: 'TDEE Calculator',
  shortTitle: 'TDEE',
  description: 'Estimate Total Daily Energy Expenditure as adult BMR times a labeled activity multiplier. The factor is a planning assumption.',
  category: 'health',
  engine: TDEE_ENGINE_ID,
  searchTerms: ['tdee calculator', 'total daily energy expenditure', 'tdee sedentary', 'maintenance tdee'],
  eyebrow: 'BMR × activity factor',
  accent: 'rose',
  featured: true,
  resultNature: 'formula-estimate',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'bmr', type: 'uses-engine' },
    { toolId: 'calorie', type: 'next-decision' },
  ],
};
