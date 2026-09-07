/**
 * The tool catalogue and the questions asked of it.
 *
 * The definitions themselves live one per file under `lib/tools/registry/`, so
 * that adding a tool is a new file rather than an insertion into the middle of
 * a shared array — which is what made two people adding tools at once conflict.
 * This module stays the single import path for everything that reads the
 * catalogue, so the split is invisible to its seventy-odd consumers.
 */
import { CATEGORY_IDS, type CategoryId } from './categories';
import { CLUSTER_IDS, TOOL_CLUSTERS, clusterNeighbours, clustersForTool } from './clusters';
import { parsePublishingDate, PUBLISHING_SNAPSHOT_DATE } from './publishing';
import { registryTools } from './tools/registry';
import type { IndexabilityEvidence, ToolDefinition } from './tools/types';

export { CATEGORY_IDS, HEADER_CATEGORY_IDS, categories } from './categories';
export type { CategoryAccent, CategoryId } from './categories';
export { launchIndexability } from './tools/indexability';
export type { IndexabilityEvidence, ResultNature, ToolDefinition, ToolRelationship } from './tools/types';
export { RESULT_NATURES } from './tools/types';

export const tools: ToolDefinition[] = registryTools;


const toolById = new Map(tools.map((tool) => [tool.id, tool]));

export function assertToolRegistryIntegrity(): void {
  if (toolById.size !== tools.length) throw new Error('Tool registry contains duplicate IDs.');
  if (new Set(tools.map((tool) => tool.path)).size !== tools.length) throw new Error('Tool registry contains duplicate paths.');
  for (const tool of tools) {
    const targets = new Set<string>();
    for (const relationship of tool.relationships) {
      if (relationship.toolId === tool.id) throw new Error(`${tool.id} cannot relate to itself.`);
      if (!toolById.has(relationship.toolId)) throw new Error(`${tool.id} points to unknown tool ${relationship.toolId}.`);
      if (targets.has(relationship.toolId)) throw new Error(`${tool.id} repeats relationship target ${relationship.toolId}.`);
      targets.add(relationship.toolId);
    }
  }
  for (const clusterId of CLUSTER_IDS) {
    for (const toolId of TOOL_CLUSTERS[clusterId].toolIds as readonly string[]) {
      if (!toolById.has(toolId)) throw new Error(`Cluster ${clusterId} points to unknown tool ${toolId}.`);
    }
  }
  for (const tool of tools) {
    if (clustersForTool(tool.id).length === 0) throw new Error(`${tool.id} is not in any topic cluster.`);
  }
}

assertToolRegistryIntegrity();

export function getTool(id: string): ToolDefinition {
  const tool = toolById.get(id);
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}

export function getToolsByCategory(category: CategoryId): ToolDefinition[] {
  return tools.filter((tool) => tool.category === category);
}

export const RELATED_TOOL_LIMIT = 6;
export const RELATED_TOOL_MINIMUM = 3;

/**
 * Neighbours for a tool, composed rather than hand-listed.
 *
 * Four sources in order of how deliberate they are: the relationships authored
 * on this tool, the rest of its topic clusters, the tools that authored a
 * relationship pointing back at it, and finally its own category. That gives every
 * page a real route onward — a reader can walk salary to after-tax to paycheck
 * to 401(k) to home affordability to mortgage without meeting a dead end — and
 * it cannot drift out of date the way a hand-written list on fifty pages does.
 */
export function getRelatedTools(tool: ToolDefinition, limit = RELATED_TOOL_LIMIT): ToolDefinition[] {
  const seen = new Set<string>([tool.id]);
  const related: ToolDefinition[] = [];
  const add = (candidate: ToolDefinition | undefined) => {
    if (!candidate || seen.has(candidate.id) || related.length >= limit) return;
    seen.add(candidate.id);
    related.push(candidate);
  };
  for (const relationship of tool.relationships) add(toolById.get(relationship.toolId));
  for (const neighbour of clusterNeighbours(tool.id)) add(toolById.get(neighbour));
  for (const candidate of tools) {
    if (candidate.relationships.some((relationship) => relationship.toolId === tool.id)) add(candidate);
  }
  for (const candidate of tools) {
    if (candidate.category === tool.category) add(candidate);
  }
  return related;
}

/** The topic journeys this tool sits inside, for breadcrumb and hub copy. */
export function getToolClusters(toolId: string) {
  return clustersForTool(toolId).map((id) => ({ id, ...TOOL_CLUSTERS[id] }));
}

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORY_IDS.includes(value as CategoryId);
}

export function getToolQualityScore(tool: ToolDefinition): number {
  return Object.values(tool.indexability.scores).reduce((total, score) => total + score, 0);
}

export function evaluateToolIndexability(
  tool: ToolDefinition,
  asOfDate = PUBLISHING_SNAPSHOT_DATE,
): { indexable: boolean; score: number; reasons: string[] } {
  const score = getToolQualityScore(tool);
  const reasons: string[] = [];
  const maximumScores: Record<keyof IndexabilityEvidence['scores'], number> = {
    searchIntentEvidence: 20,
    uniqueDataOrFunction: 25,
    answerDepth: 15,
    provenanceAndFreshness: 15,
    internalLinkValue: 10,
    mobileAndPerformance: 10,
    maintenanceConfidence: 5,
  };
  for (const [dimension, value] of Object.entries(tool.indexability.scores) as Array<[keyof IndexabilityEvidence['scores'], number]>) {
    if (!Number.isInteger(value) || value < 0 || value > maximumScores[dimension]) {
      reasons.push(`${dimension} must be an integer from 0 to ${maximumScores[dimension]}.`);
    }
  }
  const failedGates = Object.entries(tool.indexability.hardGates)
    .filter(([, passed]) => !passed)
    .map(([gate]) => gate);
  if (failedGates.length > 0) reasons.push(`Failed hard gates: ${failedGates.join(', ')}`);
  if (score < 75) reasons.push(`Quality score ${score} is below 75.`);
  if (tool.indexability.scores.uniqueDataOrFunction < 15) reasons.push('Unique data/function score is below 15.');
  if (tool.indexability.scores.provenanceAndFreshness < 10) reasons.push('Provenance/freshness score is below 10.');
  if (tool.indexability.provenanceStatus === 'not-required' && tool.indexability.scores.provenanceAndFreshness > 10) {
    reasons.push('A provenance/freshness score above 10 requires verified provenance.');
  }
  const reviewedAt = parsePublishingDate(tool.indexability.reviewedAt);
  const reviewValidUntil = parsePublishingDate(tool.indexability.reviewValidUntil);
  const asOf = parsePublishingDate(asOfDate);
  if (
    reviewedAt === null
    || reviewValidUntil === null
    || reviewValidUntil < reviewedAt
    || (reviewValidUntil - reviewedAt) / 86_400_000 > 400
  ) {
    reasons.push('Indexability review dates are invalid or cover more than 400 days.');
  }
  if (asOf === null || reviewedAt === null || reviewValidUntil === null || asOf < reviewedAt || asOf > reviewValidUntil) {
    reasons.push('Indexability review is not valid on the versioned publishing date.');
  }
  const validRelationshipTargets = new Set(tool.relationships
    .filter((relationship) => relationship.toolId !== tool.id && toolById.has(relationship.toolId))
    .map((relationship) => relationship.toolId));
  if (validRelationshipTargets.size < 2) reasons.push('At least two valid, distinct internal relationships are required.');
  return { indexable: reasons.length === 0, score, reasons };
}

export function isCategoryHubIndexable(category: CategoryId): boolean {
  return getToolsByCategory(category).filter((tool) => evaluateToolIndexability(tool).indexable).length >= 2;
}
