import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaOnly } from '../data-manifest';
import { FRACTION_ENGINE_ID } from '../../calculations/math/version';

export const tool: ToolDefinition = {
  id: 'fraction',
  path: '/math/fraction',
  title: 'Fraction Calculator',
  shortTitle: 'Fractions',
  description: 'Add, subtract, multiply, divide, and simplify fractions with exact integer arithmetic, then show mixed and decimal forms.',
  category: 'math',
  engine: FRACTION_ENGINE_ID,
  searchTerms: ['fraction calculator', 'add fractions', 'simplify fraction', 'mixed number calculator', '1/2 plus 1/3'],
  eyebrow: 'Exact fraction arithmetic',
  accent: 'violet',
  featured: true,
  resultNature: 'exact',
  data: formulaOnly('Fraction arithmetic is exact.'),
  metaTitle: 'Fraction Calculator: Add, Subtract, Multiply, Divide',
  metaDescription: 'Exact fraction arithmetic with simplified results. Not a decimal approximation engine.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'percentage', type: 'sibling' },
    { toolId: 'scientific', type: 'sibling' },
  ],
};
