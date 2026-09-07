import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { CAPITAL_GAINS_ENGINE_ID } from '../../calculations/tax/version';

export const tool: ToolDefinition = {
  id: 'capital-gains',
  path: '/money/capital-gains',
  title: 'Capital Gains Tax Calculator',
  shortTitle: 'Capital gains',
  description: 'See how 2026 long-term capital gains stack into the 0%, 15% and 20% bands, and whether the 3.8% Net Investment Income Tax applies.',
  category: 'money',
  engine: CAPITAL_GAINS_ENGINE_ID,
  searchTerms: [
    'capital gains tax calculator',
    'capital gains tax',
    'long term capital gains tax 2026',
    'capital gains tax rate',
    'niit calculator',
    'net investment income tax',
    '0 percent capital gains',
    'capital gains stacked on ordinary income',
    'how much tax on stock sale',
    'qualified dividends tax rate',
  ],
  eyebrow: 'Long-term gains and NIIT',
  accent: 'mint',
  featured: false,
  resultNature: 'official-data-estimate',
  metaTitle: 'Capital Gains Tax Calculator 2026: 0%, 15%, 20% and NIIT',
  metaDescription: 'Estimate 2026 long-term capital gains tax from IRS Rev. Proc. 2025-32 brackets and the 3.8% Net Investment Income Tax. Short-term gains are ordinary income.',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 15, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'federal-tax-bracket', type: 'sibling' },
    { toolId: 'tax-refund', type: 'next-decision' },
    { toolId: 'effective-tax-rate', type: 'sibling' },
  ],
};
