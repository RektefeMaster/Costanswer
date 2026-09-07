import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { EFFECTIVE_TAX_RATE_ENGINE_ID } from '../../calculations/tax/version';

export const tool: ToolDefinition = {
  id: 'effective-tax-rate',
  path: '/money/effective-tax-rate',
  title: 'Effective Tax Rate Calculator',
  shortTitle: 'Effective tax rate',
  description: 'Work out the share of your pay that actually goes to tax, and see how far it sits below the bracket you are in.',
  category: 'money',
  engine: EFFECTIVE_TAX_RATE_ENGINE_ID,
  searchTerms: [
    'effective tax rate',
    'effective tax rate calculator',
    'what is my effective tax rate',
    'average tax rate vs marginal',
    'marginal vs effective tax rate',
    'what tax bracket am i in',
    'how much of my income goes to taxes',
    'what percentage of my paycheck goes to taxes',
    'how much tax will i pay on a raise',
    'total tax rate federal state and fica',
  ],
  eyebrow: 'Share of pay that goes to tax',
  accent: 'mint',
  featured: false,
  resultNature: 'official-data-estimate',
  metaTitle: 'Effective Tax Rate Calculator: Your Real Rate vs. Your Bracket (2026)',
  metaDescription: 'See what share of a U.S. salary actually goes to federal income tax, FICA and state tax — and why that is well below your bracket. Includes the rate on your next $1,000.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 21, answerDepth: 15, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    // The pair: this page gives the rate you pay, that one gives the band you
    // are in. Stated explicitly because the cluster alone leaves the bracket
    // tool with no inbound link once the six-link limit is applied.
    { toolId: 'federal-tax-bracket', type: 'sibling' },
    { toolId: 'salary-after-tax', type: 'sibling' },
    { toolId: 'paycheck', type: 'next-decision' },
    { toolId: 'bonus-tax', type: 'next-decision' },
  ],
};
