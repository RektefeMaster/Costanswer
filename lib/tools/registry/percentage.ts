import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { PERCENTAGE_ENGINE_ID } from '../../calculations/math/version';

export const tool: ToolDefinition = {
  id: 'percentage',
  path: '/math/percentage',
  title: 'Percentage Calculator',
  shortTitle: 'Percentage',
  description: 'What is X% of Y, X is what percent of Y, or X is Y% of what. Division by zero is rejected.',
  category: 'math',
  engine: PERCENTAGE_ENGINE_ID,
  searchTerms: [
    'percentage calculator',
    'percent calculator',
    'calculate percentage',
    'what is 15 percent of 200',
    'x is what percent of y',
    'percent off',
    'discount calculator',
    'percent off calculator',
    'sale price',
    'what percent',
  ],
  eyebrow: 'Three percent questions',
  accent: 'violet',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 21, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'percent-change', type: 'sibling' },
    { toolId: 'tip', type: 'next-decision' },
    { toolId: 'fraction', type: 'sibling' },
  ],
};
