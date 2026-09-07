import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { LOAN_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'loan',
  path: '/money/loan',
  title: 'Loan Calculator',
  shortTitle: 'Loan payment',
  description: 'Monthly payment, total interest, and payoff time for a fixed-rate loan. Add extra principal if you want to see how much sooner it ends.',
  category: 'money',
  engine: LOAN_ENGINE_ID,
  searchTerms: [
    'loan calculator',
    'loan payment calculator',
    'monthly loan payment',
    'personal loan payment',
    'amortizing loan',
    'how much is my loan payment',
    'loan interest',
    'extra principal payment',
    'student loan',
    'student loan payment',
    'car loan payment',
    'installment loan',
  ],
  eyebrow: 'Fixed-rate loan payment',
  accent: 'mint',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'mortgage-payment', type: 'sibling' },
    { toolId: 'amortization', type: 'next-decision' },
    { toolId: 'car-loan', type: 'sibling' },
    { toolId: 'debt-payoff', type: 'next-decision' },
  ],
};
