import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'insurance-cost',
  path: '/money/insurance-cost',
  title: 'Insurance Cost Calculator',
  shortTitle: 'Insurance cost',
  description: 'Budget for homeowners, renters, and auto insurance with dated NAIC state averages or your own premiums. Compare annual costs and deductible choices.',
  category: 'money',
  engine: 'insurance-budget-v1',
  searchTerms: ['insurance calculator', 'homeowners insurance cost', 'home insurance calculator', 'renters insurance calculator', 'car insurance calculator', 'auto insurance cost', 'insurance by state', 'compare insurance deductibles', 'monthly insurance budget', 'home and auto insurance'],
  eyebrow: 'Home, renters, and auto insurance',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  metaTitle: 'Insurance Cost Calculator: Home, Renters & Auto by State',
  metaDescription: 'Calculate a home, renters, and auto insurance budget using dated NAIC state averages or your own quotes. Compare premiums and deductibles with transparent math.',
  indexability: { ...launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 23, answerDepth: 15, provenanceAndFreshness: 14, internalLinkValue: 10, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'), reviewedAt: '2026-09-05', reviewValidUntil: '2027-03-05' },
  relationships: [
    { toolId: 'mortgage-payment', type: 'next-decision' },
    { toolId: 'home-affordability', type: 'next-decision' },
    { toolId: 'car-affordability', type: 'next-decision' },
    { toolId: 'auto-coverage', type: 'sibling' },
    { toolId: 'cost-of-living', type: 'sibling' },
  ],
};
