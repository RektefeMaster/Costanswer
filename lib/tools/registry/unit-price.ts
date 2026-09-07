import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'unit-price',
  path: '/shopping/unit-price',
  title: 'Unit Price Calculator',
  shortTitle: 'Unit price',
  description: 'See which package is cheaper per ounce, pound, or item, even if the labels use different units.',
  category: 'shopping',
  engine: 'unit-normalization-v1',
  searchTerms: [
    'unit price calculator',
    'price per ounce',
    'which is cheaper',
    'bulk vs small',
    'compare package sizes',
    'price per pound',
    'unit cost',
    'price per gram',
    'cost per unit',
    'is bulk cheaper',
  ],
  eyebrow: 'Price per ounce, pound, or item',
  accent: 'violet',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 12, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'recipe-scaler', type: 'uses-engine' },
    { toolId: 'where-cheaper', type: 'sibling' },
  ],
};
