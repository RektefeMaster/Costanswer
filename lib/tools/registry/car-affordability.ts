import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { CAR_AFFORDABILITY_ENGINE_ID } from '../../calculations/vehicle/version';

export const tool: ToolDefinition = {
  id: 'car-affordability',
  path: '/car/car-affordability',
  title: 'Car Affordability Calculator',
  shortTitle: 'Car affordability',
  description: 'Monthly cash cost of a car (loan payment, fuel or charging, insurance, upkeep, registration) and how much of your take-home pay it would take. Depreciation is not included, so this is out-of-pocket cost, not total cost of ownership.',
  category: 'car',
  engine: CAR_AFFORDABILITY_ENGINE_ID,
  searchTerms: [
    'car affordability calculator',
    'how much car can i afford',
    'can i afford this car',
    'how much should i spend on a car',
    'true cost of owning a car',
    'monthly car cost',
    'car payment vs income',
    'cost of car ownership',
    'how much car can I afford on take home pay',
  ],
  eyebrow: 'Monthly cash cost vs. take-home pay',
  accent: 'blue',
  featured: true,
  resultNature: 'planning-model',
  metaTitle: 'Car Affordability Calculator: Monthly Cash Cost vs. Take-Home Pay',
  metaDescription: 'Loan, fuel or charging, insurance, upkeep, and registration versus take-home pay. Depreciation is omitted, so this is cash out of pocket, not total cost of ownership.',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 24, answerDepth: 15, provenanceAndFreshness: 12, internalLinkValue: 10, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'loan', type: 'uses-engine' },
    { toolId: 'car-loan', type: 'sibling' },
    { toolId: 'salary-after-tax', type: 'uses-engine' },
    { toolId: 'ev-vs-gas', type: 'sibling' },
    { toolId: 'home-affordability', type: 'next-decision' },
    { toolId: 'cost-of-living', type: 'sibling' },
  ],
};
