import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { CONVERSION_ENGINE_ID } from '../../calculations/conversion/units';

export const tool: ToolDefinition = {
  id: 'unit-conversion',
  path: '/math/unit-conversion',
  title: 'Unit Conversion Calculator',
  shortTitle: 'Unit conversion',
  description: 'Convert length, mass, volume, area, temperature, and speed through canonical base units, so every conversion runs through one tested path.',
  category: 'math',
  engine: CONVERSION_ENGINE_ID,
  searchTerms: [
    'unit converter',
    'conversion calculator',
    'measurement converter',
    'inch to cm',
    'celsius to fahrenheit',
    'kg to lbs',
    'convert kg to lbs',
    'pounds to kilograms',
    'kilograms to pounds',
    'miles to km',
    'km to miles',
    'cm to inches',
    'liters to gallons',
    'metric conversion',
  ],
  eyebrow: 'Base-unit conversions',
  accent: 'violet',
  featured: true,
  resultNature: 'exact',
  indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
  relationships: [
    { toolId: 'square-footage', type: 'next-decision' },
    { toolId: 'bmi', type: 'sibling' },
  ],
};
