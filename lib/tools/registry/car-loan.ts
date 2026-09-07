import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { CAR_LOAN_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'car-loan',
  path: '/money/car-loan',
  title: 'Car Loan Calculator',
  shortTitle: 'Car loan',
  description: 'Monthly vehicle loan payment, total interest, and amount financed. Not insurance, fuel, or the true cost of owning the car.',
  category: 'money',
  engine: CAR_LOAN_ENGINE_ID,
  searchTerms: [
    'car loan calculator',
    'auto loan calculator',
    'car loan',
    'vehicle loan calculator',
    'car payment calculator',
    'monthly car payment',
    'car loan payment',
    'auto loan payment',
    'car payment calculator 72 month',
  ],
  eyebrow: 'Vehicle loan payment',
  accent: 'mint',
  featured: true,
  resultNature: 'exact',
  metaTitle: 'Car Loan Payment Calculator (Amount Financed, U.S.)',
  metaDescription: 'Monthly auto-loan payment, total interest, and amount financed from price, tax, down payment, rate, and term. Not insurance, fuel, or the true cost of owning the car.',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 10, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'car-affordability', type: 'next-decision' },
    { toolId: 'loan', type: 'uses-engine' },
    { toolId: 'amortization', type: 'sibling' },
  ],
};
