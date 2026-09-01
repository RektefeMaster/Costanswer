export const CATEGORY_IDS = ['money', 'home', 'auto', 'everyday', 'food', 'shopping'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

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
  accent: 'mint' | 'amber' | 'blue' | 'rose' | 'violet' | 'coral';
  featured: boolean;
  indexability: IndexabilityEvidence;
  relationships: ToolRelationship[];
};

function launchIndexability(
  scores: IndexabilityEvidence['scores'],
  provenanceStatus: IndexabilityEvidence['provenanceStatus'],
): IndexabilityEvidence {
  return {
    scores,
    hardGates: {
      realFunction: true,
      distinctIntent: true,
      methodologyVisible: true,
      sourceRequirementsMet: true,
      ymylOrSafetyReviewed: true,
      canonicalReady: true,
      crawlableInboundLinks: true,
    },
    provenanceStatus,
    reviewedAt: '2026-09-01',
  };
}

export const categories: Record<CategoryId, { name: string; description: string; accent: ToolDefinition['accent'] }> = {
  money: { name: 'Money', description: 'Pay, income and everyday financial math.', accent: 'mint' },
  home: { name: 'Home', description: 'Projects, materials, energy and upkeep.', accent: 'amber' },
  auto: { name: 'Auto', description: 'Driving, energy and ownership decisions.', accent: 'blue' },
  everyday: { name: 'Everyday', description: 'Dates, quantities and quick practical answers.', accent: 'rose' },
  food: { name: 'Food', description: 'Scale recipes and make kitchen quantities usable.', accent: 'coral' },
  shopping: { name: 'Shopping', description: 'Normalize prices and compare the real value.', accent: 'violet' },
};

export const tools: ToolDefinition[] = [
  {
    id: 'hourly-to-salary',
    path: '/money/hourly-to-salary',
    title: 'Hourly to Salary Calculator',
    shortTitle: 'Hourly to salary',
    description: 'Convert hourly pay into weekly, monthly and annual gross income—with overtime shown separately.',
    category: 'money',
    engine: 'compensation-v1',
    searchTerms: ['hourly wage to salary', 'annual salary', 'paycheck', 'overtime pay', 'how much per year'],
    eyebrow: 'Gross pay converter',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'unit-price', type: 'next-decision' },
      { toolId: 'business-days', type: 'sibling' },
    ],
  },
  {
    id: 'electricity-cost',
    path: '/home/electricity-cost',
    title: 'Electricity Cost Calculator by State',
    shortTitle: 'Electricity cost',
    description: 'Estimate energy charges from your usage and a current EIA residential state average—or enter your own rate.',
    category: 'home',
    engine: 'energy-cost-v1',
    searchTerms: ['electric bill calculator', 'cost per kwh', 'electricity rate by state', 'appliance energy cost'],
    eyebrow: 'EIA-backed state benchmark',
    accent: 'amber',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'ev-vs-gas', type: 'uses-dataset' },
      { toolId: 'concrete', type: 'sibling' },
    ],
  },
  {
    id: 'concrete',
    path: '/home/concrete-calculator',
    title: 'Concrete Calculator',
    shortTitle: 'Concrete estimator',
    description: 'Estimate cubic yards and 60 lb or 80 lb bags for a slab, including a visible waste allowance.',
    category: 'home',
    engine: 'material-volume-v1',
    searchTerms: ['how much concrete', 'concrete bags', 'cubic yards', 'slab calculator', '80 lb bags'],
    eyebrow: 'Material range estimator',
    accent: 'amber',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 12, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'electricity-cost', type: 'sibling' },
      { toolId: 'unit-price', type: 'next-decision' },
    ],
  },
  {
    id: 'ev-vs-gas',
    path: '/auto/ev-vs-gas',
    title: 'EV vs. Gas Energy Cost Calculator',
    shortTitle: 'EV vs. gas',
    description: 'Compare annual driving-energy costs using your MPG, gas price and an editable state electricity benchmark.',
    category: 'auto',
    engine: 'vehicle-energy-v1',
    searchTerms: ['ev vs gas cost', 'electric car savings', 'charging cost', 'gas mileage comparison'],
    eyebrow: 'Driving-energy comparison',
    accent: 'blue',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'electricity-cost', type: 'uses-dataset' },
      { toolId: 'unit-price', type: 'uses-engine' },
    ],
  },
  {
    id: 'business-days',
    path: '/everyday/business-days',
    title: 'Business Days Calculator',
    shortTitle: 'Business days',
    description: 'Count workdays between dates or add business days, with optional observed U.S. federal holidays.',
    category: 'everyday',
    engine: 'calendar-v1',
    searchTerms: ['business days between dates', 'working days', 'days from date', 'federal holidays', 'add workdays'],
    eyebrow: 'Workday and holiday calendar',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 13, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'hourly-to-salary', type: 'sibling' },
      { toolId: 'recipe-scaler', type: 'sibling' },
    ],
  },
  {
    id: 'unit-price',
    path: '/shopping/unit-price',
    title: 'Unit Price Calculator',
    shortTitle: 'Unit price',
    description: 'Compare package sizes on equal terms, even when one uses ounces and another uses pounds.',
    category: 'shopping',
    engine: 'unit-normalization-v1',
    searchTerms: ['unit price calculator', 'which is cheaper', 'bulk vs small', 'price per ounce', 'compare package sizes'],
    eyebrow: 'Package value comparison',
    accent: 'violet',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 12, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'recipe-scaler', type: 'uses-engine' },
      { toolId: 'concrete', type: 'next-decision' },
    ],
  },
  {
    id: 'recipe-scaler',
    path: '/food/recipe-scaler',
    title: 'Recipe Scaler',
    shortTitle: 'Recipe scaler',
    description: 'Resize ingredient quantities for a new serving count while keeping useful kitchen fractions.',
    category: 'food',
    engine: 'quantity-scaling-v1',
    searchTerms: ['scale a recipe', 'servings calculator', 'double recipe', 'recipe fractions', 'ingredient quantity'],
    eyebrow: 'Serving and quantity tool',
    accent: 'coral',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 16, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'unit-price', type: 'uses-engine' },
      { toolId: 'business-days', type: 'sibling' },
    ],
  },
];

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

export function getRelatedTools(tool: ToolDefinition): ToolDefinition[] {
  return tool.relationships
    .map((relationship) => toolById.get(relationship.toolId))
    .filter((candidate): candidate is ToolDefinition => Boolean(candidate));
}

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORY_IDS.includes(value as CategoryId);
}

export function getToolQualityScore(tool: ToolDefinition): number {
  return Object.values(tool.indexability.scores).reduce((total, score) => total + score, 0);
}

export function evaluateToolIndexability(tool: ToolDefinition): { indexable: boolean; score: number; reasons: string[] } {
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
  const reviewedAt = Date.parse(`${tool.indexability.reviewedAt}T00:00:00.000Z`);
  const reviewAgeDays = (Date.now() - reviewedAt) / 86_400_000;
  if (!Number.isFinite(reviewedAt) || reviewAgeDays < 0 || reviewAgeDays > 400) {
    reasons.push('Indexability review is missing, future-dated, or more than 400 days old.');
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
