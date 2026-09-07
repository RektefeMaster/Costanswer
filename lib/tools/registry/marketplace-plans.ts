import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'marketplace-plans',
  path: '/money/marketplace-plans',
  title: 'Marketplace Health Plan Cost Calculator',
  shortTitle: 'Plan cost',
  description: 'See what Bronze, Silver, and Gold plans cost in your county from the filed 2026 premiums, with the deductible and the most a year can cost you.',
  category: 'money',
  engine: 'marketplace-plan-cost-v1',
  searchTerms: ['health insurance cost by zip code', 'marketplace plan cost', 'how much is health insurance', 'bronze vs silver plan', 'health plan deductible comparison', 'obamacare plan prices', 'aca plan cost calculator', 'out of pocket maximum comparison', 'health insurance premium by county', 'cheapest health plan'],
  eyebrow: 'Marketplace premiums by county',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  metaTitle: 'Marketplace Health Plan Cost by ZIP: Bronze vs Silver vs Gold 2026',
  metaDescription: 'Compare 2026 Marketplace plan costs in your county from filed CMS premiums: monthly cost, deductible, and the most a year can cost at each metal level.',
  indexability: { ...launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 24, answerDepth: 15, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'), reviewedAt: '2026-09-05', reviewValidUntil: '2027-03-05' },
  relationships: [
    { toolId: 'health-insurance', type: 'uses-dataset' },
    { toolId: 'insurance-cost', type: 'sibling' },
    { toolId: 'cost-of-living', type: 'sibling' },
    { toolId: 'salary-after-tax', type: 'next-decision' },
  ],
};
