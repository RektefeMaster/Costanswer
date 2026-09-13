/**
 * What a tool is, as data.
 *
 * Split out of `tool-registry.ts` so that a registry fragment can import the
 * shape without pulling in the whole catalogue, and so two people adding tools
 * at once are not editing the same file to do it.
 */
import type { DataSourceId } from '../data/data-sources';
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

/**
 * What a tool does when a source it names is missing, or older than it may be.
 *
 * - `blocked` — there is no answer without the data. The page says so instead of
 *   printing a number. Only legal for `requiresData: true`.
 * - `user-entered` — the reader supplies the figure the dataset would have
 *   defaulted, and the arithmetic is unchanged.
 * - `formula-only` — the benchmark or context line is dropped and the answer,
 *   which never depended on it, stands.
 */
export type DataFallback =
  | { kind: 'blocked'; note: string }
  | { kind: 'user-entered'; note: string }
  | { kind: 'formula-only'; note: string };

/**
 * A tool's contract with the data platform.
 *
 * The rule this exists to enforce: a calculator that can be solved from its
 * inputs must never break because a government website changed a URL. Most of
 * this catalogue is arithmetic — amortisation, payoff order, unit price,
 * compound interest — and for those a dataset is a courtesy default, not a
 * dependency. Declaring that explicitly is what lets an outage degrade a
 * benchmark line instead of an answer.
 *
 * The converse is the reason the field is not simply advisory. `salary-after-tax`
 * without the 2026 tables is not a slightly worse answer; it is a wrong one. A
 * tool that says `requiresData: true` may not print a complete result when a
 * required source is missing or past `maxStalenessDays`.
 */
export type ToolDataManifest = {
  /** True only when the answer does not exist without the required sources. */
  requiresData: boolean;
  /** Sources without which the result is wrong, not merely less informed. */
  requiredDatasets: DataSourceId[];
  /** Sources that supply a default, a benchmark, or context around the answer. */
  optionalDatasets: DataSourceId[];
  /**
   * Dollar figures this tool supplies from CostAnswer's own judgement.
   *
   * Not every number on a page comes from a dataset or from the reader. A
   * mortgage page prints a PMI line at a rate nobody published, because no
   * national PMI rate table exists — it is risk-based private pricing. An
   * affordability page prints bands we chose. Those are as much a provenance
   * claim as an IRS bracket is, and leaving them out of the receipt is how a
   * modelled figure ends up looking as settled as a statute.
   *
   * `label` names the figure the way it appears on the page; `why` says where
   * the number came from and why nobody publishes a better one.
   */
  modeledInputs: Array<{ label: string; why: string }>;
  fallbackBehavior: DataFallback;
  /**
   * How old the oldest required source may be before the tool stops presenting
   * a complete result. `null` when nothing is required.
   *
   * Measured against the source's own release cadence, not invented: a yearly
   * table gets a year plus the grace window its policy already allows, so a
   * provider publishing late does not blank the page.
   */
  maxStalenessDays: number | null;
};

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
  /** Which official sources this tool depends on, and what happens without them. */
  data: ToolDataManifest;
  /** Optional long-tail document title. The on-page H1 stays `title`. */
  metaTitle?: string;
  /** Optional long-tail meta description. Falls back to `description`. */
  metaDescription?: string;
  indexability: IndexabilityEvidence;
  relationships: ToolRelationship[];
};
