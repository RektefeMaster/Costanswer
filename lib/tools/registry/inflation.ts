import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'inflation',
  path: '/money/inflation',
  title: 'Inflation Calculator',
  shortTitle: 'Inflation',
  description: 'See what an amount in one U.S. month would buy in another, using the BLS CPI-U all-items index since 1913.',
  category: 'money',
  engine: 'cpi-u-inflation-v1',
  searchTerms: [
    'inflation calculator',
    'buying power calculator',
    'what is 100 dollars in 1990 worth today',
    'cpi calculator',
    'value of money over time',
    'inflation since 2000',
    'historical purchasing power',
    'purchasing power',
  ],
  eyebrow: 'CPI-U buying power',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  indexability: launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'hourly-to-salary', type: 'sibling' },
    { toolId: 'home-affordability', type: 'next-decision' },
  ],
};
