import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { DAYS_FROM_TODAY_ENGINE_ID } from '../../calculations/datetime/version';

export const tool: ToolDefinition = {
  id: 'days-from-today',
  path: '/everyday/days-from-today',
  title: 'Days From Today Calculator',
  shortTitle: 'Days from today',
  description: 'The calendar date that is N days from today, or N days ago. Weekends still count; this is not business days.',
  category: 'everyday',
  engine: DAYS_FROM_TODAY_ENGINE_ID,
  searchTerms: [
    'days from today',
    'date in x days',
    'x days from now',
    '30 days from today',
    'what day is 90 days from now',
    'days until',
    'days until a date',
    'countdown to a date',
    'how many days until',
  ],
  eyebrow: 'Today plus N days',
  accent: 'rose',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'date', type: 'sibling' },
    { toolId: 'business-days', type: 'sibling' },
  ],
};
