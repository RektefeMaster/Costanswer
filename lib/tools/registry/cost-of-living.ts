import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { COST_OF_LIVING_ENGINE_ID } from '../../calculations/col/version';

export const tool: ToolDefinition = {
  id: 'cost-of-living',
  path: '/money/cost-of-living',
  title: 'Cost of Living Calculator',
  shortTitle: 'Cost of living',
  description: 'Estimated modeled monthly living costs for a U.S. city, metro, or state using HUD Fair Market Rent, USDA Food Plans, and official regional context. This is not a proprietary index.',
  category: 'money',
  engine: COST_OF_LIVING_ENGINE_ID,
  searchTerms: [
    'cost of living',
    'living cost',
    'cost to live',
    'living expenses',
    'city cost of living',
    'state cost of living',
    'how much to live',
    'monthly living costs',
    'cost of living calculator',
  ],
  eyebrow: 'Modeled monthly living costs',
  metaTitle: 'U.S. Cost of Living Calculator by City, Metro, or State',
  metaDescription: 'Modeled monthly living costs from HUD Fair Market Rent, USDA food plans, and official regional context. Not a magazine index and not your lease.',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  indexability: launchIndexability({ searchIntentEvidence: 20, uniqueDataOrFunction: 25, answerDepth: 15, provenanceAndFreshness: 15, internalLinkValue: 10, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'salary-after-tax', type: 'uses-engine' },
    { toolId: 'home-affordability', type: 'next-decision' },
    { toolId: 'car-affordability', type: 'sibling' },
    { toolId: 'electricity-cost', type: 'uses-dataset' },
  ],
};
