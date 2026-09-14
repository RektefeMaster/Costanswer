import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaWithDefault } from '../data-manifest';

export const tool: ToolDefinition = {
  id: 'electricity-cost',
  path: '/home/electricity-cost',
  title: 'Electricity Cost Calculator by State',
  shortTitle: 'Electricity cost',
  description: 'A monthly electric bill from your kWh and the EIA average for your state. You can type the rate from your bill instead.',
  category: 'home',
  engine: 'energy-cost-v1',
  searchTerms: ['electric bill calculator', 'electricity cost by state', 'cost per kwh', 'electricity rate by state', 'kwh cost calculator', 'average electric bill'],
  eyebrow: 'State average electric bill',
  accent: 'amber',
  featured: true,
  resultNature: 'official-data-estimate',
  data: formulaWithDefault({
    optional: ['eia-electricity'],
    note: 'kWh × rate. The published state average seeds the rate field and a rate you type replaces it.',
  }),
  metaTitle: 'Electric Bill Calculator by State (EIA Average)',
  metaDescription: 'Estimate a monthly electric bill from kWh and EIA residential averages by state — or type your utility’s effective rate. Not your tariff.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'appliance-electricity', type: 'next-decision' },
    { toolId: 'ev-vs-gas', type: 'uses-dataset' },
    { toolId: 'where-cheaper', type: 'next-decision' },
    { toolId: 'cost-of-living', type: 'sibling' },
  ],
};
