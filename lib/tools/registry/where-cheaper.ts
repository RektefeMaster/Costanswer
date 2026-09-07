import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'where-cheaper',
  path: '/shopping/where-cheaper',
  title: 'Cheapest States for Electricity, Gas, and Groceries',
  shortTitle: 'Where it’s cheaper',
  description: 'Compare electricity, gasoline, and the grocery staples BLS splits by region. These are government averages, not store ads.',
  category: 'shopping',
  engine: 'where-cheaper-v1',
  searchTerms: [
    'where is it cheaper',
    'cheapest state for gas',
    'cheapest electricity state',
    'cheapest states',
    'grocery staple prices',
    'compare energy cost by state',
    'gas prices by state',
    'where are groceries cheaper',
    'cost of living by state',
    'cheapest states to live',
  ],
  eyebrow: 'Compare two states',
  accent: 'violet',
  featured: true,
  resultNature: 'official-data-estimate',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'electricity-cost', type: 'uses-dataset' },
    { toolId: 'appliance-electricity', type: 'sibling' },
    { toolId: 'ev-vs-gas', type: 'sibling' },
    { toolId: 'road-trip-fuel', type: 'next-decision' },
  ],
};
