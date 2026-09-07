import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { BMI_ENGINE_ID } from '../../calculations/health/formulas';

export const tool: ToolDefinition = {
  id: 'bmi',
  path: '/health/bmi',
  title: 'BMI Calculator',
  shortTitle: 'BMI',
  description: 'Estimate adult Body Mass Index from height and weight in metric or U.S. units. Category labels are secondary CDC screening ranges, not a diagnosis.',
  category: 'health',
  engine: BMI_ENGINE_ID,
  searchTerms: ['bmi calculator', 'body mass index calculator', 'calculate bmi', 'bmi metric', 'bmi pounds inches'],
  eyebrow: 'Height and weight ratio',
  accent: 'rose',
  featured: true,
  resultNature: 'formula-estimate',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 21, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'bmr', type: 'sibling' },
    { toolId: 'body-fat', type: 'sibling' },
  ],
};
