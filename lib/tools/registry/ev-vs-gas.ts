import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaWithDefault } from '../data-manifest';

export const tool: ToolDefinition = {
  id: 'ev-vs-gas',
  path: '/car/ev-vs-gas',
  title: 'EV vs Gas: Which Costs Less to Drive?',
  shortTitle: 'EV vs. gas',
  description: 'Yearly charging versus gasoline, using your miles, MPG, a local gas price, and a state electricity average.',
  category: 'car',
  engine: 'vehicle-energy-v1',
  searchTerms: ['ev vs gas cost', 'electric car vs gas cost', 'electric car savings', 'charging cost per mile', 'gas mileage comparison', 'ev charging cost calculator'],
  eyebrow: 'EV charging vs. gasoline',
  accent: 'blue',
  featured: true,
  resultNature: 'official-data-estimate',
  data: formulaWithDefault({
    optional: ['eia-electricity', 'eia-gasoline'],
    note: 'Cost per mile on each side is efficiency against a price. Both prices are defaults you can overwrite with what you actually pay.',
  }),
  metaTitle: 'EV vs Gas Cost Calculator: Energy Cost Per Mile',
  metaDescription: 'Compare electricity and gasoline cost per mile from your rates, efficiency, and miles. Not total cost of ownership.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'electricity-cost', type: 'uses-dataset' },
    { toolId: 'appliance-electricity', type: 'sibling' },
    { toolId: 'road-trip-fuel', type: 'next-decision' },
    { toolId: 'car-affordability', type: 'next-decision' },
  ],
};
