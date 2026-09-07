import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { ROTH_IRA_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'roth-ira',
  path: '/money/roth-ira',
  title: 'Roth IRA Calculator',
  shortTitle: 'Roth IRA',
  description: 'Project Roth IRA contribution growth under an assumed return. This does not determine MAGI eligibility.',
  category: 'money',
  engine: ROTH_IRA_ENGINE_ID,
  searchTerms: ['roth ira calculator', 'roth ira growth', 'roth contribution calculator', 'ira projection'],
  eyebrow: 'Roth contribution growth',
  accent: 'mint',
  featured: true,
  resultNature: 'projection',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: '401k', type: 'sibling' },
    { toolId: 'retirement', type: 'next-decision' },
  ],
};
