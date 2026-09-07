import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { QUARTERLY_ESTIMATED_TAX_ENGINE_ID } from '../../calculations/tax/version';

export const tool: ToolDefinition = {
  id: 'quarterly-estimated-tax',
  path: '/money/quarterly-estimated-tax',
  title: 'Quarterly Estimated Tax Calculator',
  shortTitle: 'Quarterly estimated tax',
  description: 'Work out the Form 1040-ES required annual payment and four equal installments using the 90%, 100% and 110% safe harbors.',
  category: 'money',
  engine: QUARTERLY_ESTIMATED_TAX_ENGINE_ID,
  searchTerms: [
    'quarterly estimated tax calculator',
    '1040-es calculator',
    'estimated tax payments 2026',
    'safe harbor estimated tax',
    'do i need to pay estimated taxes',
    'quarterly tax due dates',
    '110 percent estimated tax',
    'self employed estimated tax',
    'form 1040-es payment',
  ],
  eyebrow: '1040-ES safe harbor and due dates',
  accent: 'mint',
  featured: false,
  resultNature: 'official-data-estimate',
  metaTitle: 'Quarterly Estimated Tax Calculator 2026 (Form 1040-ES)',
  metaDescription: 'Estimate 2026 quarterly federal estimated tax from Form 1040-ES safe harbors and due dates. Not a Form 2210 penalty calculation.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 21, answerDepth: 15, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'self-employment-tax', type: 'sibling' },
    { toolId: 'tax-refund', type: 'next-decision' },
    { toolId: 'paycheck', type: 'sibling' },
  ],
};
