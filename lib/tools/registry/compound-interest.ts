import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { COMPOUND_INTEREST_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'compound-interest',
  path: '/money/compound-interest',
  title: 'Compound Interest Calculator',
  shortTitle: 'Compound interest',
  description: 'See how a starting balance and recurring deposits grow with compound interest. Contributions are added at the end of each period.',
  category: 'money',
  engine: COMPOUND_INTEREST_ENGINE_ID,
  searchTerms: [
    'compound interest calculator',
    'compound interest',
    'savings growth calculator',
    'interest on savings',
    'recurring deposit calculator',
    'how much will my savings grow',
  ],
  eyebrow: 'Savings growth over time',
  accent: 'mint',
  featured: true,
  resultNature: 'projection',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'investment', type: 'next-decision' },
    { toolId: 'interest', type: 'sibling' },
    { toolId: 'hourly-to-salary', type: 'sibling' },
  ],
};
