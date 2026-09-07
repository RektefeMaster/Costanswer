import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { K401_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: '401k',
  path: '/money/401k',
  title: '401(k) Calculator',
  shortTitle: '401(k)',
  description: 'Project employee deferrals and a simple employer match over time at an assumed return. Catch-up and eligibility rules are not modeled.',
  category: 'money',
  engine: K401_ENGINE_ID,
  searchTerms: ['401k calculator', '401(k) calculator', 'employer match calculator', '401k contribution growth'],
  eyebrow: 'Deferral plus employer match',
  accent: 'mint',
  featured: true,
  resultNature: 'projection',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'roth-ira', type: 'sibling' },
    { toolId: 'retirement', type: 'next-decision' },
    { toolId: 'salary-after-tax', type: 'sibling' },
  ],
};
