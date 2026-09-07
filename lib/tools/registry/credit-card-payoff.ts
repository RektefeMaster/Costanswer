import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { CREDIT_CARD_PAYOFF_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'credit-card-payoff',
  path: '/money/credit-card-payoff',
  title: 'Credit Card Payoff Calculator',
  shortTitle: 'Credit card payoff',
  description: 'Months and interest to pay off one credit-card balance at a stated monthly payment, or the payment needed for a target payoff time.',
  category: 'money',
  engine: CREDIT_CARD_PAYOFF_ENGINE_ID,
  searchTerms: ['credit card payoff calculator', 'credit card interest calculator', 'pay off credit card', 'credit card payment calculator'],
  eyebrow: 'One revolving balance',
  metaTitle: 'Credit Card Payoff Calculator: Months and Interest',
  metaDescription: 'See how long one U.S. credit-card balance takes to clear at a fixed monthly payment, or the payment needed for a target date. Not an issuer minimum-payment formula.',
  accent: 'mint',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'debt-payoff', type: 'next-decision' },
    { toolId: 'loan', type: 'sibling' },
  ],
};
