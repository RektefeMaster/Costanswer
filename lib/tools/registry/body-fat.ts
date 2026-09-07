import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { BODY_FAT_ENGINE_ID } from '../../calculations/health/formulas';

export const tool: ToolDefinition = {
  id: 'body-fat',
  path: '/health/body-fat',
  title: 'Body Fat Calculator',
  shortTitle: 'Body fat',
  description: 'Estimate body-fat percentage from neck, waist, and hip circumferences using the documented U.S. Navy method. Not a DEXA scan.',
  category: 'health',
  engine: BODY_FAT_ENGINE_ID,
  searchTerms: ['body fat calculator', 'body fat percentage calculator', 'navy body fat', 'circumference body fat'],
  eyebrow: 'Circumference estimate',
  accent: 'rose',
  featured: true,
  resultNature: 'formula-estimate',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'bmi', type: 'sibling' },
    { toolId: 'bmr', type: 'sibling' },
  ],
};
