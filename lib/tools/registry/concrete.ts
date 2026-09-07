import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'concrete',
  path: '/home/concrete-calculator',
  title: 'Concrete Calculator',
  shortTitle: 'Concrete calculator',
  description: 'Cubic yards and bag counts for a rectangular slab. Waste is listed separately.',
  category: 'home',
  engine: 'material-volume-v1',
  searchTerms: ['how much concrete do I need', 'how much concrete', 'concrete calculator', 'concrete bags', 'cubic yards of concrete', 'slab calculator', '80 lb bags', 'concrete slab'],
  eyebrow: 'Slab volume and bag count',
  accent: 'amber',
  featured: true,
  resultNature: 'formula-estimate',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 12, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'electricity-cost', type: 'sibling' },
    { toolId: 'square-footage', type: 'next-decision' },
    { toolId: 'unit-price', type: 'next-decision' },
  ],
};
