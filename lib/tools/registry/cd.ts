import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { CD_ENGINE_ID } from '../../calculations/finance/version';

export const tool: ToolDefinition = {
  id: 'cd',
  path: '/money/cd',
  title: 'CD Calculator',
  shortTitle: 'CD',
  description: 'Ending balance and interest on a certificate of deposit from the APY you enter. Not a live bank offer.',
  category: 'money',
  engine: CD_ENGINE_ID,
  searchTerms: [
    'cd calculator',
    'certificate of deposit calculator',
    'cd apy calculator',
    'cd interest',
    'cd rate',
    'cd rate calculator',
    'certificate of deposit interest',
    'cd maturity',
  ],
  eyebrow: 'APY you type, not a quote',
  accent: 'mint',
  featured: true,
  resultNature: 'projection',
  indexability: launchIndexability({ searchIntentEvidence: 16, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'interest', type: 'sibling' },
    { toolId: 'compound-interest', type: 'sibling' },
  ],
};
