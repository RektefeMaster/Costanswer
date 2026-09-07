import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { SCIENTIFIC_ENGINE_ID } from '../../calculations/math/version';

export const tool: ToolDefinition = {
  id: 'scientific',
  path: '/math/scientific',
  title: 'Scientific Calculator',
  shortTitle: 'Scientific',
  description: 'Powers, roots, logs, factorials, and trig in degrees or radians, with π and e, on a keypad that follows the normal order of operations.',
  category: 'math',
  engine: SCIENTIFIC_ENGINE_ID,
  searchTerms: ['scientific calculator', 'online scientific calculator', 'sin cos tan calculator', 'log calculator'],
  eyebrow: 'Trig, logs, powers and roots',
  accent: 'violet',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'percentage', type: 'sibling' },
    { toolId: 'fraction', type: 'sibling' },
  ],
};
