import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { SQUARE_FOOTAGE_ENGINE_ID } from '../../calculations/education/formulas';

export const tool: ToolDefinition = {
  id: 'square-footage',
  path: '/home/square-footage',
  title: 'Square Footage Calculator',
  shortTitle: 'Square footage',
  description: 'Add rectangular rooms or spaces and get total area in square feet, with square meters from the shared conversion engine.',
  category: 'home',
  engine: SQUARE_FOOTAGE_ENGINE_ID,
  searchTerms: [
    'square footage calculator',
    'square feet calculator',
    'room area calculator',
    'how many square feet',
    'sq ft',
    'sq ft calculator',
    'square meters',
    'floor area',
    'how many sq ft',
  ],
  eyebrow: 'Length × width, then total',
  accent: 'amber',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'concrete', type: 'next-decision' },
    { toolId: 'unit-conversion', type: 'uses-engine' },
  ],
};
