import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { DATE_ENGINE_ID } from '../../calculations/datetime/version';

export const tool: ToolDefinition = {
  id: 'date',
  path: '/everyday/date',
  title: 'Date Calculator',
  shortTitle: 'Date offset',
  description: 'Find the calendar date a given number of days, weeks, months, or years before or after another date. Month ends are clamped.',
  category: 'everyday',
  engine: DATE_ENGINE_ID,
  searchTerms: [
    'date calculator',
    'add days to a date',
    'date plus months',
    'what date is 90 days from',
    'calendar date offset',
    'days between dates',
    'date difference',
  ],
  eyebrow: 'Calendar date offset',
  accent: 'rose',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'days-from-today', type: 'sibling' },
    { toolId: 'business-days', type: 'sibling' },
    { toolId: 'age', type: 'sibling' },
  ],
};
