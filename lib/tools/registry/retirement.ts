import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { RETIREMENT_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'retirement',
  path: '/money/retirement',
  title: 'Retirement Calculator',
  shortTitle: 'Retirement',
  description: 'Project a retirement balance from current savings, contributions, and an assumed return, then compare it with a goal you type.',
  category: 'money',
  engine: RETIREMENT_ENGINE_ID,
  searchTerms: ['retirement calculator', 'retirement savings calculator', 'retirement projection', 'how much will I have at retirement'],
  eyebrow: 'Modeled balance at retirement',
  accent: 'mint',
  featured: true,
  resultNature: 'projection',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: '401k', type: 'sibling' },
    { toolId: 'roth-ira', type: 'sibling' },
    { toolId: 'investment', type: 'uses-engine' },
  ],
};
