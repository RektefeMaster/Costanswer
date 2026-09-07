import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { PERCENT_CHANGE_ENGINE_ID } from '../../calculations/math/version';

export const tool: ToolDefinition = {
  id: 'percent-change',
  path: '/math/percent-change',
  title: 'Percent Change Calculator',
  shortTitle: 'Percent change',
  description: 'Percentage increase or decrease from an original value to a new value. A zero baseline is not defined.',
  category: 'math',
  engine: PERCENT_CHANGE_ENGINE_ID,
  searchTerms: ['percent change calculator', 'percentage increase', 'percentage decrease', 'percent difference from original'],
  eyebrow: 'Old value to new value',
  accent: 'violet',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'percentage', type: 'sibling' },
    { toolId: 'inflation', type: 'next-decision' },
  ],
};
