import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { EITC_ENGINE_ID } from '../../calculations/tax/version';

export const tool: ToolDefinition = {
  id: 'eitc',
  path: '/money/eitc',
  title: 'Earned Income Credit Calculator',
  shortTitle: 'Earned income credit',
  description: 'Estimate the 2026 federal earned income tax credit from earned income, AGI, qualifying children and the investment-income limit in Revenue Procedure 2025-32.',
  category: 'money',
  engine: EITC_ENGINE_ID,
  searchTerms: [
    'earned income credit calculator',
    'eitc calculator',
    'earned income tax credit 2026',
    'do i qualify for eitc',
    'eitc with one child',
    'earned income credit phase out',
    'eitc investment income limit',
    'federal eitc calculator',
    'how much is the earned income credit',
  ],
  eyebrow: 'Federal EITC from the 2026 tables',
  accent: 'mint',
  featured: false,
  resultNature: 'official-data-estimate',
  metaTitle: 'Earned Income Credit Calculator 2026 (EITC)',
  metaDescription: 'Estimate the 2026 federal EITC from Revenue Procedure 2025-32 amounts, including the $12,200 investment-income limit. Not a filed Schedule EIC.',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 23, answerDepth: 15, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'child-tax-credit', type: 'sibling' },
    { toolId: 'tax-refund', type: 'next-decision' },
    { toolId: 'federal-tax-bracket', type: 'sibling' },
  ],
};
