import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaWithDefault } from '../data-manifest';
import { APPLIANCE_ENERGY_ENGINE_ID } from '../../calculations/energy/version';

export const tool: ToolDefinition = {
  id: 'appliance-electricity',
  path: '/home/appliance-electricity-cost',
  title: 'How Much Does This Appliance Cost to Run?',
  shortTitle: 'Appliance electricity',
  description: 'Estimate what a device costs to run from its wattage, hours of use, and the EIA average for your state. You can type the rate from your bill instead.',
  category: 'home',
  engine: APPLIANCE_ENERGY_ENGINE_ID,
  searchTerms: [
    'appliance electricity',
    'device electricity cost',
    'electricity usage',
    'appliance energy cost',
    'how much to run an appliance',
    'wattage electricity cost',
    'cost to run a dryer',
  ],
  eyebrow: 'What a device costs to run',
  accent: 'amber',
  featured: true,
  resultNature: 'official-data-estimate',
  data: formulaWithDefault({
    optional: ['eia-electricity'],
    note: 'Watts × hours × rate. The state average rate is a default; your own per-kWh rate from a bill is better and the page prefers it.',
  }),
  metaTitle: 'Appliance Electricity Cost Calculator: Watts × Hours',
  metaDescription: 'What a dryer, fridge, or other device costs to run from watts, hours, and EIA or your rate. Formula estimate, not a utility audit.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'electricity-cost', type: 'uses-dataset' },
    { toolId: 'ev-vs-gas', type: 'next-decision' },
    { toolId: 'where-cheaper', type: 'uses-dataset' },
  ],
};
