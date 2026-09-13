import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { requiresOfficialData } from '../data-manifest';
import { HSA_ENGINE_ID } from '../../calculations/hsa';

export const tool: ToolDefinition = {
  id: 'hsa-contribution',
  path: '/money/hsa-contribution',
  title: 'HSA Contribution Limit Calculator',
  shortTitle: 'HSA contribution',
  description: 'The 2026 HSA contribution limit from IRS Rev. Proc. 2025-19, including the age-55 catch-up and a check of whether a plan’s deductible and out-of-pocket maximum qualify as an HDHP.',
  category: 'money',
  engine: HSA_ENGINE_ID,
  searchTerms: [
    'hsa contribution limit 2026',
    'hsa calculator',
    'hsa max contribution',
    'hdhp deductible 2026',
    'hsa catch up 55',
    'family hsa limit 2026',
  ],
  eyebrow: 'IRS 2026 HSA limits',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  data: requiresOfficialData({
    required: ['irs-hsa-limits'],
    note: 'The annual cap and the HDHP tests are figures the IRS publishes each year. Last year’s cap is a wrong answer, not an old one.',
  }),
  metaTitle: 'HSA Contribution Limit Calculator (2026 IRS Figures)',
  metaDescription: 'See the 2026 HSA contribution limit for self-only or family coverage, the $1,000 catch-up at 55, and whether a plan meets the IRS HDHP deductible and out-of-pocket tests.',
  indexability: launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'health-insurance', type: 'sibling' },
    { toolId: '401k', type: 'sibling' },
    { toolId: 'federal-tax-bracket', type: 'next-decision' },
  ],
};
