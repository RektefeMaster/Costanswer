import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaOnly } from '../data-manifest';
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
  data: formulaOnly('A retirement projection is your balance, contributions and the return you assume.'),
  metaTitle: 'Retirement Savings Calculator: Nest Egg and Withdrawals',
  metaDescription: 'Rough path from savings rate, return assumption, and years to a nest egg. Not Social Security or a financial plan.',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: '401k', type: 'sibling' },
    { toolId: 'roth-ira', type: 'sibling' },
    { toolId: 'investment', type: 'uses-engine' },
    { toolId: 'rmd', type: 'next-decision' },
  ],
};
