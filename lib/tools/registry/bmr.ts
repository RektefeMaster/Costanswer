import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaOnly } from '../data-manifest';
import { BMR_ENGINE_ID } from '../../calculations/health/formulas';

export const tool: ToolDefinition = {
  id: 'bmr',
  path: '/health/bmr',
  title: 'BMR Calculator',
  shortTitle: 'BMR',
  description: 'Estimate adult Basal Metabolic Rate with the Mifflin–St Jeor equation. This is not a measured metabolic rate.',
  category: 'health',
  engine: BMR_ENGINE_ID,
  searchTerms: ['bmr calculator', 'basal metabolic rate calculator', 'mifflin st jeor', 'resting calorie estimate'],
  eyebrow: 'Estimated basal calories',
  accent: 'rose',
  featured: true,
  resultNature: 'formula-estimate',
  data: formulaOnly('BMR is the Mifflin–St Jeor equation applied to the inputs.'),
  metaTitle: 'BMR Calculator: Basal Metabolic Rate (Mifflin–St Jeor)',
  metaDescription: 'Estimate resting calorie burn from age, sex, height, and weight. Not a medical prescription.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'tdee', type: 'next-decision' },
    { toolId: 'calorie', type: 'next-decision' },
  ],
};
