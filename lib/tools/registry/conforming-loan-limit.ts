import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { requiresOfficialData } from '../data-manifest';
import { LOAN_LIMIT_ENGINE_ID } from '../../calculations/loan-limit';

export const tool: ToolDefinition = {
  id: 'conforming-loan-limit',
  path: '/money/conforming-loan-limit',
  title: 'Conforming Loan Limit Calculator',
  shortTitle: 'Conforming loan limit',
  description: 'The FHFA loan limit for your county and unit count, and whether a given loan amount is conforming, high-balance, or jumbo.',
  category: 'money',
  engine: LOAN_LIMIT_ENGINE_ID,
  searchTerms: [
    'conforming loan limit',
    'conforming loan limit 2026',
    'jumbo loan limit',
    'what is a jumbo loan',
    'fhfa loan limits by county',
    'high balance conforming loan',
    'loan limit my county',
    'is my loan a jumbo loan',
    'maximum conventional loan amount',
    'conforming loan limit california',
  ],
  eyebrow: 'FHFA limit for your county',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  data: requiresOfficialData({
    required: ['fhfa-loan-limits'],
    note: 'The limit is a figure FHFA sets county by county. There is no formula behind it that survives losing the file, and last year’s limit is a wrong answer rather than an old one.',
  }),
  metaTitle: 'Conforming Loan Limit by County (2026 FHFA Values)',
  metaDescription: 'Look up the 2026 FHFA conforming loan limit for any U.S. county and unit count, and see whether a loan amount is conforming, high-balance, or jumbo. Not a lender decision.',
  indexability: launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'mortgage-payment', type: 'next-decision' },
    { toolId: 'va-funding-fee', type: 'sibling' },
    { toolId: 'home-affordability', type: 'sibling' },
    { toolId: 'refinance', type: 'sibling' },
  ],
};
