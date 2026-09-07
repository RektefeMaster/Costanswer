import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'home-affordability',
  path: '/money/home-affordability',
  title: 'Can I Afford This House?',
  shortTitle: 'Afford this house',
  description: 'A planning screen for a specific house, or a comfortable / reasonable / aggressive price from take-home pay, debts, and the most recent national average rate.',
  category: 'money',
  engine: 'home-affordability-v1',
  searchTerms: [
    'can I afford this house',
    'how much house can I afford',
    'home affordability calculator',
    'should I buy this house',
    'how much home can I buy',
    'house I can afford',
    'mortgage affordability',
    'how much house can I afford on take home pay',
  ],
  eyebrow: 'Take-home pay vs. a house',
  accent: 'mint',
  featured: true,
  resultNature: 'planning-model',
  metaTitle: 'Home Affordability Calculator Using Take-Home Pay',
  metaDescription: 'See whether a U.S. house fits take-home pay, or a comfortable / stretch / aggressive price from net pay, debts, and the national average mortgage rate. Not a lender DTI.',
  indexability: launchIndexability({ searchIntentEvidence: 20, uniqueDataOrFunction: 24, answerDepth: 15, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'mortgage-payment', type: 'uses-engine' },
    { toolId: 'hourly-to-salary', type: 'sibling' },
    { toolId: 'cost-of-living', type: 'next-decision' },
  ],
};
