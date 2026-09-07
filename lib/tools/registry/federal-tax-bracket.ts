import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { FEDERAL_BRACKET_ENGINE_ID } from '../../calculations/tax/version';

export const tool: ToolDefinition = {
  id: 'federal-tax-bracket',
  path: '/money/federal-tax-bracket',
  title: 'Federal Tax Bracket Calculator',
  shortTitle: 'Federal tax bracket',
  description: 'Find which federal bracket your last dollar falls in, see how your income splits across every band, and how much room is left before the next one.',
  category: 'money',
  engine: FEDERAL_BRACKET_ENGINE_ID,
  searchTerms: [
    'tax bracket calculator',
    'what tax bracket am i in',
    'federal tax brackets 2026',
    'income tax brackets',
    'what is my tax bracket',
    'tax bracket for 100k',
    'how do tax brackets work',
    'am i in a higher tax bracket',
    'how much before i hit the next tax bracket',
    'marginal tax bracket',
  ],
  eyebrow: 'Which federal band your income lands in',
  accent: 'mint',
  featured: false,
  resultNature: 'official-data-estimate',
  metaTitle: 'Federal Tax Bracket Calculator 2026: Which Band Your Income Falls In',
  metaDescription: 'See your 2026 federal tax bracket, how much of your income is taxed at each rate, and how far you are from the next band. Brackets from IRS Rev. Proc. 2025-32.',
  indexability: launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 20, answerDepth: 15, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'effective-tax-rate', type: 'sibling' },
    { toolId: 'salary-after-tax', type: 'next-decision' },
    { toolId: 'bonus-tax', type: 'next-decision' },
  ],
};
