import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { CHILD_TAX_CREDIT_ENGINE_ID } from '../../calculations/tax/version';

export const tool: ToolDefinition = {
  id: 'child-tax-credit',
  path: '/money/child-tax-credit',
  title: 'Child Tax Credit Calculator',
  shortTitle: 'Child tax credit',
  description: 'Estimate the 2026 child tax credit, credit for other dependents, and additional child tax credit from Revenue Procedure 2025-32 and Schedule 8812.',
  category: 'money',
  engine: CHILD_TAX_CREDIT_ENGINE_ID,
  searchTerms: [
    'child tax credit calculator',
    'child tax credit',
    'ctc calculator 2026',
    'additional child tax credit',
    'how much is the child tax credit',
    'child tax credit phase out',
    'credit for other dependents',
    'schedule 8812 calculator',
    'actc calculator',
    'child tax credit $2200',
  ],
  eyebrow: 'CTC, ODC and additional child tax credit',
  accent: 'mint',
  featured: false,
  resultNature: 'official-data-estimate',
  metaTitle: 'Child Tax Credit Calculator 2026: $2,200 and ACTC',
  metaDescription: 'Estimate the 2026 child tax credit of up to $2,200 per qualifying child, the $500 other-dependent credit, and the additional child tax credit. Phase-out from Schedule 8812.',
  indexability: launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 23, answerDepth: 15, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'eitc', type: 'sibling' },
    { toolId: 'tax-refund', type: 'next-decision' },
    { toolId: 'federal-tax-bracket', type: 'sibling' },
  ],
};
