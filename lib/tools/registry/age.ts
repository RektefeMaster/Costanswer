import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaOnly } from '../data-manifest';
import { AGE_ENGINE_ID } from '../../calculations/datetime/version';

export const tool: ToolDefinition = {
  id: 'age',
  path: '/everyday/age',
  title: 'Age Calculator',
  shortTitle: 'Age',
  description: 'Completed years, months, and days from a birth date to a selected as-of date, including leap-day rules.',
  category: 'everyday',
  engine: AGE_ENGINE_ID,
  searchTerms: ['age calculator', 'how old am I', 'exact age calculator', 'age in years months days'],
  eyebrow: 'Exact completed age',
  accent: 'rose',
  featured: true,
  resultNature: 'exact',
  data: formulaOnly('An age is calendar arithmetic between two dates.'),
  metaTitle: 'Age Calculator: Years, Months, and Days Old',
  metaDescription: 'Exact age from a birth date to today or another date. Calendar math — not a legal age determination.',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 21, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'date', type: 'sibling' },
    { toolId: 'business-days', type: 'sibling' },
  ],
};
