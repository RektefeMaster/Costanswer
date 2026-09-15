import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaWithDefault } from '../data-manifest';

export const tool: ToolDefinition = {
  id: 'road-trip-fuel',
  path: '/car/road-trip-fuel',
  title: 'How Much Does a Road Trip Cost in Gas?',
  shortTitle: 'Road-trip fuel',
  description: 'Fuel cost for a drive from your miles, MPG, and the most recent EIA regular-gas average for your state or region. You can type a pump price instead.',
  category: 'car',
  engine: 'road-trip-fuel-v1',
  searchTerms: [
    'road trip fuel cost',
    'gas cost calculator',
    'trip gas calculator',
    'how much gas for a road trip',
    'fuel cost for a drive',
    'gas money for a trip',
    'road trip cost calculator',
    'gas mileage cost',
    'mpg cost',
    'fuel cost per mile',
  ],
  eyebrow: 'Fuel for the miles you drive',
  accent: 'blue',
  featured: true,
  resultNature: 'official-data-estimate',
  data: formulaWithDefault({
    optional: ['eia-gasoline'],
    note: 'Miles ÷ MPG × price. The regional average price is a starting value, not a dependency.',
  }),
  metaTitle: 'Road Trip Gas Cost Calculator: Miles, MPG, and Fuel Price',
  metaDescription: 'Estimate fuel cost for a drive from distance, MPG, and gas price. Highway vs city MPG is your call. Not a trip planner.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 23, answerDepth: 13, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'ev-vs-gas', type: 'sibling' },
    { toolId: 'where-cheaper', type: 'uses-dataset' },
    { toolId: 'car-affordability', type: 'next-decision' },
  ],
};
