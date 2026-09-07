/**
 * What a tool is, as data.
 *
 * Split out of `tool-registry.ts` so that a registry fragment can import the
 * shape without pulling in the whole catalogue, and so two people adding tools
 * at once are not editing the same file to do it.
 */
import type { CategoryAccent, CategoryId } from '../categories';

export type ToolRelationship = {
  toolId: string;
  type: 'sibling' | 'next-decision' | 'uses-dataset' | 'uses-engine';
};

export type IndexabilityEvidence = {
  scores: {
    searchIntentEvidence: number;
    uniqueDataOrFunction: number;
    answerDepth: number;
    provenanceAndFreshness: number;
    internalLinkValue: number;
    mobileAndPerformance: number;
    maintenanceConfidence: number;
  };
  hardGates: {
    realFunction: boolean;
    distinctIntent: boolean;
    methodologyVisible: boolean;
    sourceRequirementsMet: boolean;
    ymylOrSafetyReviewed: boolean;
    canonicalReady: boolean;
    crawlableInboundLinks: boolean;
  };
  provenanceStatus: 'verified' | 'not-required';
  reviewedAt: string;
  reviewValidUntil: string;
};

export const RESULT_NATURES = [
  'exact',
  'official-data-estimate',
  'projection',
  'planning-model',
  'formula-estimate',
  'random',
] as const;
export type ResultNature = (typeof RESULT_NATURES)[number];

export type ToolDefinition = {
  id: string;
  path: `/${string}`;
  title: string;
  shortTitle: string;
  description: string;
  category: CategoryId;
  engine: string;
  searchTerms: string[];
  eyebrow: string;
  accent: CategoryAccent;
  featured: boolean;
  /**
   * What kind of thing this tool's result is.
   *
   * Every tool page used to carry the same "This is an estimate" note, which
   * sat under exact fraction arithmetic, a calendar date, and a random number
   * generator alike. Saying "estimate" where the answer is exact undercuts the
   * pages where the word is doing real work.
   */
  resultNature: ResultNature;
  /** Optional long-tail document title. The on-page H1 stays `title`. */
  metaTitle?: string;
  /** Optional long-tail meta description. Falls back to `description`. */
  metaDescription?: string;
  indexability: IndexabilityEvidence;
  relationships: ToolRelationship[];
};
