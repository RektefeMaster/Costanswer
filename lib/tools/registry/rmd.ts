import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { RMD_ENGINE_ID } from '../../calculations/rmd';

export const tool: ToolDefinition = {
  id: 'rmd',
  path: '/money/rmd',
  title: 'RMD Calculator',
  shortTitle: 'RMD',
  description: 'The required minimum distribution from an IRA using IRS Publication 590-B Table III (Uniform Lifetime) and SECURE 2.0 starting ages.',
  category: 'money',
  engine: RMD_ENGINE_ID,
  searchTerms: [
    'rmd calculator',
    'required minimum distribution calculator',
    'ira rmd 2026',
    'uniform lifetime table',
    'rmd age 73',
    'how much is my rmd',
  ],
  eyebrow: 'IRS Uniform Lifetime Table',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  metaTitle: 'RMD Calculator Using the IRS Uniform Lifetime Table',
  metaDescription: 'Divide last year’s IRA balance by the IRS Table III factor for your age in 2026. Starting ages follow SECURE 2.0. Not Table II, and not an inherited-IRA 10-year rule.',
  indexability: launchIndexability({ searchIntentEvidence: 20, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, implementationConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: '401k', type: 'sibling' },
    { toolId: 'roth-ira', type: 'sibling' },
    { toolId: 'retirement', type: 'next-decision' },
  ],
};
