import type { ToolDefinition } from '../types';
import { launchIndexability } from '../indexability';
import { requiresOfficialData } from '../data-manifest';
import { PER_DIEM_ENGINE_ID } from '../../calculations/travel/version';

export const tool: ToolDefinition = {
  id: 'per-diem',
  path: '/everyday/per-diem',
  title: 'GSA Per Diem Rates by City',
  shortTitle: 'Per diem',
  description: 'Federal travel per diem for a trip in the continental U.S.: the GSA lodging ceiling for every night, meals and incidentals for every day, and a check of your actual room rate against the cap. Type a city or ZIP.',
  category: 'everyday',
  engine: PER_DIEM_ENGINE_ID,
  searchTerms: [
    'per diem calculator',
    'gsa per diem',
    'federal per diem rates',
    'travel per diem calculator',
    'per diem for a business trip',
    'gsa lodging rate',
    'meals and incidental expenses',
    'm&ie rate',
    'first and last day per diem',
    'government travel reimbursement',
    'per diem by zip code',
    'gsa per diem zip code',
    'standard conus rate',
    'is my hotel within per diem',
  ],
  eyebrow: 'GSA rates for federal travel',
  accent: 'rose',
  featured: false,
  resultNature: 'official-data-estimate',
  data: requiresOfficialData({
    required: ['gsa-perdiem'],
    note: 'The lodging ceiling and M&IE tier for a destination are the rates GSA sets. A trip on or after 1 October takes the next fiscal year’s file, which is why the effective release matters as much as the newest one.',
  }),
  metaTitle: 'GSA Per Diem Calculator: Lodging and M&IE by City',
  metaDescription: 'Federal CONUS per diem for lodging and meals by locality and travel dates from the GSA tables on this site. Not a travel voucher.',
  indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 24, answerDepth: 15, provenanceAndFreshness: 13, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
  relationships: [
    { toolId: 'business-days', type: 'sibling' },
    { toolId: 'road-trip-fuel', type: 'next-decision' },
    { toolId: 'date', type: 'uses-engine' },
  ],
};
