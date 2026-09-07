import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'mortgage-payment',
  path: '/money/mortgage-payment',
  title: 'Mortgage Payment Calculator',
  shortTitle: 'Mortgage payment',
  description: 'Monthly principal and interest from the home price, down payment, term, and the most recent Freddie Mac national average rate. You can type a quote instead.',
  category: 'money',
  engine: 'mortgage-amortization-v1',
  searchTerms: [
    'mortgage calculator',
    'mortgage payment calculator',
    'monthly mortgage payment',
    '30 year mortgage',
    '15 year mortgage',
    'home loan payment',
    'how much is my mortgage',
    'mortgage rate today',
    '30 year mortgage payment on 400000',
    'mortgage payment from a quoted rate',
  ],
  eyebrow: 'National average mortgage payment',
  accent: 'mint',
  featured: true,
  resultNature: 'exact',
  metaTitle: 'Mortgage Payment Calculator for U.S. 30-Year and 15-Year Fixed Loans',
  metaDescription: 'Monthly principal and interest from price, down payment, term, and the latest Freddie Mac national average, or a rate you type. Taxes and insurance are optional. Not a lender quote.',
  indexability: launchIndexability({ searchIntentEvidence: 20, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'home-affordability', type: 'next-decision' },
    { toolId: 'loan', type: 'sibling' },
    { toolId: 'mortgage-payoff', type: 'next-decision' },
    { toolId: 'amortization', type: 'sibling' },
  ],
};
