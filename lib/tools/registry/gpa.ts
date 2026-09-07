import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { GPA_ENGINE_ID } from '../../calculations/education/formulas';

export const tool: ToolDefinition = {
  id: 'gpa',
  path: '/education/gpa',
  title: 'GPA Calculator',
  shortTitle: 'GPA',
  description: 'GPA from courses, letter grades, and credit hours on a visible unweighted 4.0 convenience scale. Not every school’s policy.',
  category: 'education',
  engine: GPA_ENGINE_ID,
  searchTerms: ['gpa calculator', 'grade point average calculator', 'college gpa', '4.0 gpa calculator'],
  eyebrow: 'Credits × grade points',
  accent: 'coral',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'grade', type: 'sibling' },
    { toolId: 'percentage', type: 'sibling' },
  ],
};
