import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { SELF_EMPLOYMENT_TAX_ENGINE_ID } from '../../calculations/tax/version';

export const tool: ToolDefinition = {
  id: 'self-employment-tax',
  path: '/money/self-employment-tax',
  title: 'Self-Employment Tax Calculator',
  shortTitle: 'Self-employment tax',
  description: 'Figure Schedule SE tax on net profit after the 92.35% factor, sharing the Social Security wage base with W-2 wages, plus Form 8959 Additional Medicare Tax.',
  category: 'money',
  engine: SELF_EMPLOYMENT_TAX_ENGINE_ID,
  searchTerms: [
    'self employment tax calculator',
    'schedule se calculator',
    'self employment tax 2026',
    'se tax calculator',
    '92.35 self employment',
    'gig work social security tax',
    'freelancer self employment tax',
    'deductible half of se tax',
    'self employed medicare tax',
    'schedule c self employment tax',
  ],
  eyebrow: 'Schedule SE tax on net profit',
  accent: 'mint',
  featured: false,
  resultNature: 'official-data-estimate',
  metaTitle: 'Self-Employment Tax Calculator 2026: Schedule SE',
  metaDescription: 'Estimate 2026 Schedule SE tax from net profit, the 92.35% factor, and the Social Security wage base. Additional Medicare Tax is shown separately. Not a filed return.',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 15, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'quarterly-estimated-tax', type: 'next-decision' },
    { toolId: 'tax-refund', type: 'next-decision' },
    { toolId: 'effective-tax-rate', type: 'sibling' },
    { toolId: 'paycheck', type: 'sibling' },
  ],
};
