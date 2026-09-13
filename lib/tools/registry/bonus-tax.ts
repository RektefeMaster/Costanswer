import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { requiresOfficialData } from '../data-manifest';
import { BONUS_TAX_ENGINE_ID } from '../../calculations/tax/version';

export const tool: ToolDefinition = {
  id: 'bonus-tax',
  path: '/money/bonus-tax',
  title: 'Bonus Tax Calculator',
  shortTitle: 'Bonus tax',
  description: 'What actually lands from a bonus. Employers withhold a flat IRS supplemental rate on a separately paid bonus, not the rate your salary implies, which is why it looks over-taxed.',
  category: 'money',
  engine: BONUS_TAX_ENGINE_ID,
  searchTerms: [
    'bonus tax calculator',
    'bonus tax',
    'how much is my bonus after taxes',
    'bonus after tax',
    'why is my bonus taxed so much',
    'supplemental wage withholding',
    'bonus withholding rate',
    'commission tax calculator',
    'severance tax calculator',
    'signing bonus after taxes',
  ],
  eyebrow: 'Flat supplemental withholding',
  metaTitle: 'Bonus Tax Calculator: IRS Supplemental Withholding',
  metaDescription: 'See why a separately paid U.S. bonus can look over-taxed: employers often withhold a flat IRS supplemental rate. That withholding is not your final tax.',
  accent: 'mint',
  featured: false,
  resultNature: 'official-data-estimate',
  data: requiresOfficialData({
    required: ['us-tax'],
    note: 'Supplemental withholding is a published IRS rate. Without the 2026 tables there is no withholding figure to give, and last year’s rate would be a wrong answer rather than an old one.',
  }),
  indexability: launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 22, answerDepth: 15, provenanceAndFreshness: 13, internalLinkValue: 10, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'salary-after-tax', type: 'uses-dataset' },
    { toolId: 'paycheck', type: 'sibling' },
    { toolId: 'effective-tax-rate', type: 'sibling' },
    { toolId: 'hourly-to-salary', type: 'sibling' },
    { toolId: '401k', type: 'next-decision' },
  ],
};
