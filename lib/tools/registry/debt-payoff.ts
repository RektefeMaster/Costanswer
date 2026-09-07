import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { DEBT_PAYOFF_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'debt-payoff',
  path: '/money/debt-payoff',
  title: 'Debt Payoff Calculator',
  shortTitle: 'Debt payoff',
  description: 'Compare snowball and avalanche payoff plans on the same debts. See which order saves more interest and how extra payments change the date.',
  category: 'money',
  engine: DEBT_PAYOFF_ENGINE_ID,
  searchTerms: [
    'debt payoff calculator',
    'debt snowball',
    'debt avalanche',
    'pay off credit cards',
    'extra payment debt',
    'debt free date',
    'which debt to pay first',
  ],
  eyebrow: 'Snowball vs avalanche',
  accent: 'mint',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'loan', type: 'sibling' },
    { toolId: 'credit-card-payoff', type: 'sibling' },
    { toolId: 'home-affordability', type: 'next-decision' },
  ],
};
