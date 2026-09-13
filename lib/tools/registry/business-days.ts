import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaWithBenchmark } from '../data-manifest';

export const tool: ToolDefinition = {
  id: 'business-days',
  path: '/everyday/business-days',
  title: 'Business Days Calculator',
  shortTitle: 'Business days',
  description: 'Count workdays between two dates, or add workdays to a date. Federal holidays are optional.',
  category: 'everyday',
  engine: 'calendar-v1',
  searchTerms: [
    'business days between dates',
    'working days calculator',
    'how many business days',
    'days from date',
    'federal holidays',
    'add workdays',
    'skip weekends',
    'working days between dates',
    'business days until',
  ],
  eyebrow: 'Workdays and federal holidays',
  accent: 'rose',
  featured: true,
  resultNature: 'exact',
  data: formulaWithBenchmark({
    optional: ['opm-federal-holidays'],
    note: 'Counting weekdays between two dates is a calendar operation. Without the federal holiday list the count still excludes weekends and says the holiday exclusion is unavailable.',
  }),
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 13, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'date', type: 'sibling' },
    { toolId: 'days-from-today', type: 'sibling' },
    { toolId: 'age', type: 'sibling' },
  ],
};
