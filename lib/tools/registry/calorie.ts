import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { CALORIE_ENGINE_ID } from '../../calculations/health/formulas';

export const tool: ToolDefinition = {
  id: 'calorie',
  path: '/health/calorie',
  title: 'Calorie Calculator',
  shortTitle: 'Daily calories',
  description: 'Estimate daily calories from adult BMR and a documented activity factor. Maintenance is the primary result; optional offsets stay small.',
  category: 'health',
  engine: CALORIE_ENGINE_ID,
  searchTerms: ['calorie calculator', 'calories per day', 'daily calorie calculator', 'maintenance calories', 'how many calories do I need'],
  eyebrow: 'Estimated daily calories',
  accent: 'rose',
  featured: true,
  resultNature: 'formula-estimate',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'tdee', type: 'uses-engine' },
    { toolId: 'bmr', type: 'uses-engine' },
  ],
};
