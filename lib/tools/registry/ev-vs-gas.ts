import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'ev-vs-gas',
  path: '/car/ev-vs-gas',
  title: 'EV vs. Gas Energy Cost Calculator',
  shortTitle: 'EV vs. gas',
  description: 'Yearly charging versus gasoline, using your miles, MPG, a local gas price, and a state electricity average.',
  category: 'car',
  engine: 'vehicle-energy-v1',
  searchTerms: ['ev vs gas cost', 'electric car vs gas cost', 'electric car savings', 'charging cost per mile', 'gas mileage comparison', 'ev charging cost calculator'],
  eyebrow: 'EV charging vs. gasoline',
  accent: 'blue',
  featured: true,
  resultNature: 'official-data-estimate',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'electricity-cost', type: 'uses-dataset' },
    { toolId: 'appliance-electricity', type: 'sibling' },
    { toolId: 'road-trip-fuel', type: 'next-decision' },
    { toolId: 'car-affordability', type: 'next-decision' },
  ],
};
