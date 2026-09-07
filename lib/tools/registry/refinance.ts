import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { REFINANCE_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'refinance',
  path: '/money/refinance',
  title: 'Mortgage Refinance Calculator',
  shortTitle: 'Refinance',
  description: 'Compare the mortgage you have with one you could replace it with: the new payment, how many months of savings it takes to cover closing costs, and whether a lower payment costs more interest overall.',
  category: 'money',
  engine: REFINANCE_ENGINE_ID,
  searchTerms: [
    'refinance calculator',
    'mortgage refinance calculator',
    'should i refinance',
    'refinance break even',
    'refinance savings calculator',
    'is refinancing worth it',
    'refinance closing costs',
    'new mortgage payment after refinancing',
    'break even on refinancing',
  ],
  eyebrow: 'Break-even on a refinance',
  metaTitle: 'Mortgage Refinance Calculator: Break-Even and New Payment',
  metaDescription: 'Compare your current U.S. mortgage with a replacement loan: new payment, months to recoup closing costs, and whether a lower payment still costs more interest.',
  accent: 'mint',
  featured: false,
  resultNature: 'planning-model',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 15, provenanceAndFreshness: 12, internalLinkValue: 10, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'mortgage-payment', type: 'sibling' },
    { toolId: 'mortgage-payoff', type: 'next-decision' },
    { toolId: 'amortization', type: 'uses-engine' },
    { toolId: 'home-affordability', type: 'sibling' },
  ],
};
