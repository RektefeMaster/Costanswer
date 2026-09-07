import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { RANDOM_NUMBER_ENGINE_ID } from '../../calculations/math/version';

export const tool: ToolDefinition = {
  id: 'random-number',
  path: '/everyday/random-number',
  title: 'Random Number Generator',
  shortTitle: 'Random number',
  description: 'Generate one or more numbers in a range, including unique integers. Ordinary utility randomness, not a cryptographic tool.',
  category: 'everyday',
  engine: RANDOM_NUMBER_ENGINE_ID,
  searchTerms: ['random number generator', 'random number', 'rng calculator', 'random integer', 'pick a random number'],
  eyebrow: 'Numbers in a range',
  accent: 'rose',
  featured: true,
  resultNature: 'random',
  indexability: launchIndexability({ searchIntentEvidence: 16, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'percentage', type: 'sibling' },
    { toolId: 'scientific', type: 'sibling' },
  ],
};
