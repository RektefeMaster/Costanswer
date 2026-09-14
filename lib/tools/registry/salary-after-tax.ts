import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { requiresOfficialData } from '../data-manifest';
import { SALARY_AFTER_TAX_ENGINE_ID } from '../../calculations/tax/version';

export const tool: ToolDefinition = {
  id: 'salary-after-tax',
  path: '/money/salary-after-tax',
  title: 'Salary After Tax Calculator',
  shortTitle: 'Salary after tax',
  description: 'Estimate federal income tax, FICA, and state income tax on a U.S. salary, then see take-home by year, month, and paycheck.',
  category: 'money',
  engine: SALARY_AFTER_TAX_ENGINE_ID,
  searchTerms: [
    'salary after tax',
    'take home salary calculator',
    'net salary calculator',
    'how much is 100k after taxes',
    'after tax income',
    'federal and state income tax calculator',
    'w2 pay',
    'w2 income after tax',
    'gross to net salary',
    'texas teacher salary after taxes',
    'california salary after taxes 2026',
  ],
  eyebrow: 'Estimated take-home on a salary',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  data: requiresOfficialData({
    required: ['us-tax'],
    note: 'Take-home pay is gross minus published federal, state and FICA amounts. Without the tables the result is not an approximation, it is wrong.',
  }),
  metaTitle: 'Salary After Tax Calculator: Take-Home by State (2026)',
  metaDescription: 'See how much of a U.S. salary you keep after federal income tax, FICA, and state wage tax. Yearly, monthly, and per paycheck. Not a filed return — try Texas vs. California on the same gross.',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'paycheck', type: 'next-decision' },
    { toolId: 'effective-tax-rate', type: 'sibling' },
    { toolId: 'federal-tax-bracket', type: 'sibling' },
    { toolId: 'home-affordability', type: 'next-decision' },
    { toolId: 'cost-of-living', type: 'next-decision' },
    { toolId: 'tax-refund', type: 'next-decision' },
  ],
};
