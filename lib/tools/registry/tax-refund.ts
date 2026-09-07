import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { TAX_REFUND_ENGINE_ID } from '../../calculations/tax/version';

export const tool: ToolDefinition = {
  id: 'tax-refund',
  path: '/money/tax-refund',
  title: 'Tax Refund Calculator',
  shortTitle: 'Tax refund',
  description: 'Estimate a 2026 federal refund or amount owed from published income tax, child credits and EITC, minus the withholding you already had taken out. Not a W-4 projection.',
  category: 'money',
  engine: TAX_REFUND_ENGINE_ID,
  searchTerms: [
    'tax refund calculator',
    'how much will my tax refund be',
    'federal refund estimator',
    'amount owed on taxes',
    'withholding vs tax due',
    'estimated tax refund 2026',
    'will i get a refund',
    'form 1040 refund estimate',
    'tax refund with child tax credit',
  ],
  eyebrow: 'Refund from tax minus amounts already paid',
  accent: 'mint',
  featured: false,
  resultNature: 'official-data-estimate',
  metaTitle: 'Tax Refund Calculator 2026: Withholding vs. Published Tax',
  metaDescription: 'Estimate a 2026 federal refund from IRS income tax, EITC and the child tax credit, minus W-2 withholding you enter. Publication 15-T W-4 tables are not used.',
  indexability: launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 21, answerDepth: 15, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'self-employment-tax', type: 'uses-engine' },
    { toolId: 'eitc', type: 'uses-engine' },
    { toolId: 'child-tax-credit', type: 'uses-engine' },
    { toolId: 'quarterly-estimated-tax', type: 'next-decision' },
  ],
};
