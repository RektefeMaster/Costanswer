import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaOnly } from '../data-manifest';
import { MORTGAGE_PAYOFF_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'mortgage-payoff',
  path: '/money/mortgage-payoff',
  title: 'When Will My Mortgage Be Paid Off?',
  shortTitle: 'Mortgage payoff',
  description: 'See how extra principal changes the remaining payoff date and interest on the current mortgage balance.',
  category: 'money',
  engine: MORTGAGE_PAYOFF_ENGINE_ID,
  searchTerms: [
    'mortgage payoff calculator',
    'pay off mortgage early',
    'extra principal mortgage',
    'mortgage interest saved',
    'refinance vs extra payments',
  ],
  eyebrow: 'Extra principal vs remaining interest',
  accent: 'mint',
  featured: true,
  resultNature: 'exact',
  data: formulaOnly('Extra-payment savings fall out of the amortisation schedule.'),
  metaTitle: 'Mortgage Payoff Calculator: Extra Payments and End Date',
  metaDescription: 'See when a fixed-rate mortgage ends with extra principal, and how much interest you skip. Not a lender payoff quote.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'mortgage-payment', type: 'uses-engine' },
    { toolId: 'amortization', type: 'sibling' },
  ],
};
