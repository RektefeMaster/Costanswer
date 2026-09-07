import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { TIP_ENGINE_ID } from '../../calculations/math/version';

export const tool: ToolDefinition = {
  id: 'tip',
  path: '/everyday/tip',
  title: 'Tip Calculator',
  shortTitle: 'Tip',
  description: 'Tip amount, bill total, and an even per-person split from the subtotal and tip percent you enter.',
  category: 'everyday',
  engine: TIP_ENGINE_ID,
  searchTerms: ['tip calculator', 'gratuity calculator', 'split the bill', '20 percent tip', 'tip per person'],
  eyebrow: 'Tip and split',
  accent: 'rose',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'percentage', type: 'uses-engine' },
    { toolId: 'unit-price', type: 'sibling' },
  ],
};
