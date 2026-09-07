import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';

export const tool: ToolDefinition = {
  id: 'hourly-to-salary',
  path: '/money/hourly-to-salary',
  title: 'Hourly to Salary Calculator',
  shortTitle: 'Hourly to salary',
  description: 'Turn an hourly wage into weekly, monthly, and yearly pay before taxes. Overtime has its own line.',
  category: 'money',
  engine: 'compensation-v1',
  searchTerms: [
    'hourly wage to salary',
    'hourly to annual salary',
    'how much is 28 an hour a year',
    'annual salary',
    'overtime pay',
    'how much per year',
    'gross pay calculator',
    'time and a half',
    'annual salary from hourly',
  ],
  eyebrow: 'Hourly wage to annual pay',
  accent: 'mint',
  featured: true,
  resultNature: 'exact',
  metaTitle: 'Hourly to Salary Calculator: Weekly, Monthly, and Yearly Gross Pay',
  metaDescription: 'Convert a U.S. hourly wage into weekly, monthly, and yearly gross pay. Overtime is a separate line. This is before tax. Use salary after tax for take-home.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'salary-after-tax', type: 'next-decision' },
    { toolId: 'paycheck', type: 'next-decision' },
    { toolId: 'home-affordability', type: 'next-decision' },
  ],
};
