import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaWithDefault } from '../data-manifest';
import { REFINANCE_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'refinance',
  path: '/money/refinance',
  title: 'Should I Refinance My Mortgage?',
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
  metaTitle: 'Should I Refinance? Mortgage Refinance Break-Even Calculator',
  metaDescription: 'Compare your current mortgage with a new loan: payment change, months to recoup closing costs, and whether a lower payment still costs more interest. U.S. planning figures only.',
  accent: 'mint',
  featured: false,
  resultNature: 'planning-model',
  data: formulaWithDefault({
    optional: ['freddie-mac-pmms'],
    note: 'The break-even month is the old payment, the new payment and the costs you enter. The survey average is only a default new rate.',
  }),
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 15, provenanceAndFreshness: 12, internalLinkValue: 10, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'mortgage-payment', type: 'sibling' },
    { toolId: 'mortgage-payoff', type: 'next-decision' },
    { toolId: 'amortization', type: 'uses-engine' },
    { toolId: 'home-affordability', type: 'sibling' },
  ],
};
