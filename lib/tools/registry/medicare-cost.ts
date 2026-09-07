import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'medicare-cost',
  path: '/money/medicare-cost',
  title: 'Medicare Cost Calculator',
  shortTitle: 'Medicare cost',
  description: 'Work out your 2026 Medicare premiums including the income-related adjustment, with the deductibles owed before any of it pays and the income cliffs shown.',
  category: 'money',
  engine: 'medicare-cost-v1',
  searchTerms: ['medicare cost calculator', 'medicare part b premium 2026', 'irmaa calculator', 'medicare premium by income', 'how much does medicare cost', 'part b deductible 2026', 'medicare surcharge high income', 'part d irmaa', 'medicare premiums for couples', 'medicare part a premium'],
  eyebrow: 'Medicare premiums and IRMAA, 2026',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  metaTitle: 'Medicare Cost Calculator 2026: Part B Premium, IRMAA & Deductibles',
  metaDescription: 'Calculate 2026 Medicare premiums from the published CMS tables, including the Part B and Part D income-related adjustment, deductibles, and where the income cliffs fall.',
  indexability: { ...launchIndexability({ searchIntentEvidence: 20, uniqueDataOrFunction: 22, answerDepth: 15, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'), reviewedAt: '2026-09-05', reviewValidUntil: '2027-03-05' },
  relationships: [
    { toolId: 'health-insurance', type: 'sibling' },
    { toolId: 'retirement', type: 'next-decision' },
    { toolId: 'salary-after-tax', type: 'sibling' },
    { toolId: 'cost-of-living', type: 'sibling' },
  ],
};
