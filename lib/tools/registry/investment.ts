import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaOnly } from '../data-manifest';
import { INVESTMENT_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'investment',
  path: '/money/investment',
  title: 'Investment Calculator',
  shortTitle: 'Investment',
  description: 'Project an initial amount plus recurring contributions under an assumed return. The return is an assumption, not a guarantee.',
  category: 'money',
  engine: INVESTMENT_ENGINE_ID,
  searchTerms: ['investment calculator', 'investment growth calculator', 'recurring investment calculator', 'assumed return calculator'],
  eyebrow: 'Contributions and assumed return',
  accent: 'mint',
  featured: true,
  resultNature: 'projection',
  data: formulaOnly('Growth is your contributions at a rate of return you choose. No published figure decides what markets will do.'),
  metaTitle: 'Investment Calculator: Future Value With Contributions',
  metaDescription: 'Project a portfolio with a return rate and regular contributions you choose. Hypothetical — not a forecast or advice.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'compound-interest', type: 'sibling' },
    { toolId: 'retirement', type: 'next-decision' },
    { toolId: 'inflation', type: 'sibling' },
  ],
};
