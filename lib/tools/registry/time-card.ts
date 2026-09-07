import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { TIME_CARD_ENGINE_ID } from '../../calculations/datetime/version';

export const tool: ToolDefinition = {
  id: 'time-card',
  path: '/everyday/time-card',
  title: 'Time Card Calculator',
  shortTitle: 'Time card',
  description: 'Add shift start, end, and unpaid break across one or more days, including overnight shifts. Overtime law is not applied.',
  category: 'everyday',
  engine: TIME_CARD_ENGINE_ID,
  searchTerms: [
    'time card calculator',
    'hours worked calculator',
    'work hours calculator',
    'calculate work hours',
    'timesheet hours',
    'hours worked',
  ],
  eyebrow: 'Hours after breaks',
  accent: 'rose',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'time', type: 'sibling' },
    { toolId: 'hourly-to-salary', type: 'next-decision' },
  ],
};
