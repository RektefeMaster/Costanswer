import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { requiresOfficialData } from '../data-manifest';
import { VA_FUNDING_FEE_ENGINE_ID } from '../../calculations/va-funding-fee';

export const tool: ToolDefinition = {
  id: 'va-funding-fee',
  path: '/money/va-funding-fee',
  title: 'VA Funding Fee Calculator',
  shortTitle: 'VA funding fee',
  description: 'The VA funding fee from the published rate charts: loan type, first or subsequent use, and down payment, including the option to finance the fee.',
  category: 'money',
  engine: VA_FUNDING_FEE_ENGINE_ID,
  searchTerms: [
    'va funding fee calculator',
    'va loan funding fee',
    'va funding fee 2026',
    'va funding fee first time use',
    'va cash out funding fee',
    'va irrrl funding fee',
    'how much is the va funding fee',
  ],
  eyebrow: 'VA published rate charts',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  data: requiresOfficialData({
    required: ['va-funding-fee'],
    note: 'The fee is the percentage VA printed, times the loan amount. There is no formula behind those percentages that survives losing the chart.',
  }),
  metaTitle: 'VA Funding Fee Calculator (Official Rate Charts)',
  metaDescription: 'See the VA funding fee on a purchase, cash-out, or IRRRL from the official rate charts effective April 7, 2023. Not an eligibility decision.',
  indexability: launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'conforming-loan-limit', type: 'sibling' },
    { toolId: 'mortgage-payment', type: 'next-decision' },
    { toolId: 'refinance', type: 'sibling' },
  ],
};
