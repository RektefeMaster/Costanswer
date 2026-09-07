import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'recipe-scaler',
  path: '/food/recipe-scaler',
  title: 'Recipe Scaler',
  shortTitle: 'Recipe scaler',
  description: 'Scale a recipe to more or fewer servings. Amounts round to the nearest 1/16.',
  category: 'food',
  engine: 'quantity-scaling-v1',
  searchTerms: ['scale a recipe', 'recipe scaler', 'servings calculator', 'double a recipe', 'halve a recipe', 'recipe fractions', 'ingredient quantity'],
  eyebrow: 'Scale servings and ingredients',
  accent: 'coral',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 16, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'unit-price', type: 'uses-engine' },
    { toolId: 'business-days', type: 'sibling' },
  ],
};
