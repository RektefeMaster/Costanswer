import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'auto-coverage',
  path: '/car/auto-coverage',
  title: 'Collision and Comprehensive Worth-It Calculator',
  shortTitle: 'Auto coverage',
  description: 'Weigh collision and comprehensive against what your car is worth, using published NAIC state premiums or the figures on your own policy.',
  category: 'car',
  engine: 'auto-coverage-v1',
  searchTerms: ['is collision insurance worth it', 'should i drop comprehensive coverage', 'collision vs comprehensive', 'car insurance on an old car', 'full coverage worth it', 'auto insurance coverage calculator', 'when to drop full coverage', 'car value vs insurance cost', 'comprehensive insurance calculator', 'collision deductible worth it'],
  eyebrow: 'Collision and comprehensive',
  accent: 'blue',
  featured: true,
  resultNature: 'official-data-estimate',
  metaTitle: 'Is Collision and Comprehensive Worth It? Coverage vs Car Value',
  metaDescription: 'Compare what collision and comprehensive can pay on your car against what they cost each year, using published NAIC state premiums or your own policy figures.',
  indexability: { ...launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 22, answerDepth: 15, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'), reviewedAt: '2026-09-05', reviewValidUntil: '2027-03-05' },
  relationships: [
    { toolId: 'insurance-cost', type: 'uses-dataset' },
    { toolId: 'car-affordability', type: 'sibling' },
    { toolId: 'car-loan', type: 'next-decision' },
    { toolId: 'ev-vs-gas', type: 'sibling' },
  ],
};
