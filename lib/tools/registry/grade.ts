import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { formulaOnly } from '../data-manifest';
import { GRADE_ENGINE_ID } from '../../calculations/education/formulas';

export const tool: ToolDefinition = {
  id: 'grade',
  path: '/education/grade',
  title: 'Grade Calculator',
  shortTitle: 'Weighted grade',
  description: 'Weighted category or item grades from earned, possible, and weight. Any letter shown uses an assumed 90/80/70/60 scale.',
  category: 'education',
  engine: GRADE_ENGINE_ID,
  searchTerms: ['grade calculator', 'weighted grade calculator', 'final grade calculator', 'category weight grade'],
  eyebrow: 'Weighted course grade',
  accent: 'coral',
  featured: true,
  resultNature: 'exact',
  data: formulaOnly('A weighted grade is the weighted mean of the scores entered.'),
  metaTitle: 'Grade Calculator: What Do I Need on the Final?',
  metaDescription: 'Required final-exam score to hit a course target from current grade and weights. Not your LMS.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'gpa', type: 'next-decision' },
    { toolId: 'percentage', type: 'sibling' },
  ],
};
