import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaOnly } from '../data-manifest';
import { AMORTIZATION_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'amortization',
  path: '/money/amortization',
  title: 'Amortization Schedule Calculator',
  shortTitle: 'Amortization',
  description: 'See principal, interest, and remaining balance by payment for a fixed-rate loan. The payment uses the same engine as the Loan Calculator.',
  category: 'money',
  engine: AMORTIZATION_ENGINE_ID,
  searchTerms: ['amortization calculator', 'amortization schedule', 'loan amortization table', 'principal vs interest schedule'],
  eyebrow: 'Schedule of principal and interest',
  accent: 'mint',
  featured: true,
  resultNature: 'exact',
  data: formulaOnly('A schedule is the closed-form payment applied period by period.'),
  metaTitle: 'Amortization Schedule Calculator: Payment Breakdown',
  metaDescription: 'Month-by-month principal and interest for a fixed-rate loan. See how the balance falls. Not a loan offer.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'loan', type: 'uses-engine' },
    { toolId: 'mortgage-payment', type: 'sibling' },
    { toolId: 'mortgage-payoff', type: 'next-decision' },
  ],
};
