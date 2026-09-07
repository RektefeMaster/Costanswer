import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { PAYCHECK_ENGINE_ID } from '../../calculations/tax/version';

export const tool: ToolDefinition = {
  id: 'paycheck',
  path: '/money/paycheck',
  title: 'Estimated Paycheck Calculator',
  shortTitle: 'Paycheck',
  description: 'Estimate take-home pay per paycheck by spreading a full-year federal, FICA, and state tax estimate across your pay periods. Your employer withholds from a W-4 and IRS tables instead, so a real stub will differ.',
  category: 'money',
  engine: PAYCHECK_ENGINE_ID,
  searchTerms: [
    'paycheck calculator',
    'net paycheck',
    'take home pay calculator',
    'biweekly paycheck',
    'hourly paycheck after tax',
    'estimated paycheck',
    'w2 paycheck',
    'take home per paycheck',
    'biweekly take home pay 2026',
  ],
  eyebrow: 'Estimated net paycheck',
  accent: 'mint',
  featured: true,
  resultNature: 'official-data-estimate',
  metaTitle: 'Estimated Paycheck Calculator: Weekly, Biweekly, and Monthly Take-Home',
  metaDescription: 'Estimate a U.S. net paycheck by spreading an annual federal, FICA, and state tax estimate across pay periods. A real stub uses a W-4 and IRS tables instead.',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'salary-after-tax', type: 'uses-engine' },
    { toolId: 'home-affordability', type: 'next-decision' },
  ],
};
