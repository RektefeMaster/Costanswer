import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'health-insurance',
  path: '/money/health-insurance',
  title: 'Health Insurance Subsidy Calculator',
  shortTitle: 'Health subsidy',
  description: 'Estimate your 2026 ACA premium tax credit and what a Marketplace plan costs after it, using the published IRS contribution table and HHS poverty guidelines.',
  category: 'money',
  engine: 'aca-subsidy-v1',
  searchTerms: ['health insurance subsidy calculator', 'aca subsidy calculator', 'premium tax credit calculator', 'obamacare subsidy calculator', 'marketplace plan cost', 'health insurance cost calculator', 'do i qualify for a subsidy', '400 percent poverty level health insurance', 'silver plan benchmark premium', 'health insurance after subsidy'],
  eyebrow: 'ACA premium tax credit, 2026',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  metaTitle: 'Health Insurance Subsidy Calculator: 2026 ACA Premium Tax Credit',
  metaDescription: 'Work out your 2026 ACA premium tax credit and net Marketplace premium from the published IRS contribution table and HHS poverty guidelines, with every rule shown.',
  indexability: { ...launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 23, answerDepth: 15, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'), reviewedAt: '2026-09-05', reviewValidUntil: '2027-03-05' },
  relationships: [
    { toolId: 'marketplace-plans', type: 'uses-dataset' },
    { toolId: 'medicare-cost', type: 'next-decision' },
    { toolId: 'insurance-cost', type: 'sibling' },
    { toolId: 'cost-of-living', type: 'sibling' },
  ],
};
