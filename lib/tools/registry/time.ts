import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { TIME_ENGINE_ID } from '../../calculations/datetime/version';

export const tool: ToolDefinition = {
  id: 'time',
  path: '/everyday/time',
  title: 'Time Calculator',
  shortTitle: 'Time durations',
  description: 'Add or subtract hours, minutes, and seconds as durations. Negative results stay signed and normalized.',
  category: 'everyday',
  engine: TIME_ENGINE_ID,
  searchTerms: ['time calculator', 'add time', 'subtract time', 'hours minutes seconds calculator', 'duration calculator'],
  eyebrow: 'Duration arithmetic',
  accent: 'rose',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 16, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'time-card', type: 'sibling' },
    { toolId: 'date', type: 'sibling' },
  ],
};
