import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { INTEREST_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'interest',
  path: '/money/interest',
  title: 'Interest Calculator',
  shortTitle: 'Simple interest',
  description: 'Simple interest: principal × annual rate × time. For compounding or recurring deposits, use the dedicated calculators.',
  category: 'money',
  engine: INTEREST_ENGINE_ID,
  searchTerms: ['interest calculator', 'simple interest calculator', 'simple interest', 'principal times rate times time'],
  eyebrow: 'Simple interest only',
  accent: 'mint',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 16, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'compound-interest', type: 'next-decision' },
    { toolId: 'cd', type: 'sibling' },
  ],
};
