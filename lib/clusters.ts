/**
 * Topic clusters: the intent a visitor is actually working through.
 *
 * Related links used to be a hand-written list on each tool, authored one way.
 * That left thirty-four pairs connected in only one direction and several tools
 * with two neighbours, so a reader who arrived at the far end of a real journey
 * had nowhere obvious to go. Clusters describe the journey once — pay, buying a
 * home, paying off debt — and every tool in one is reachable from the others.
 *
 * A tool belongs to as many clusters as it genuinely serves: an amortization
 * schedule is part of paying off debt and part of buying a home, and a unit
 * converter is part of everyday arithmetic and part of cooking.
 */
export const TOOL_CLUSTERS = {
  pay: {
    label: 'Pay and take-home',
    // A 401(k) deferral comes out of the same paycheck, and take-home pay is
    // what an affordability screen is built on, so both sit in this journey.
    toolIds: ['hourly-to-salary', 'salary-after-tax', 'paycheck', 'bonus-tax', 'time-card', '401k', 'home-affordability'],
  },
  retirement: {
    label: 'Saving and retirement',
    toolIds: ['401k', 'roth-ira', 'retirement', 'investment', 'compound-interest', 'cd', 'interest'],
  },
  'home-buying': {
    label: 'Buying a home',
    toolIds: ['mortgage-payment', 'home-affordability', 'refinance', 'mortgage-payoff', 'amortization', 'cost-of-living'],
  },
  debt: {
    label: 'Borrowing and paying off debt',
    toolIds: ['loan', 'debt-payoff', 'credit-card-payoff', 'auto-loan', 'amortization', 'refinance'],
  },
  vehicle: {
    label: 'Running a car',
    toolIds: ['car-affordability', 'auto-loan', 'ev-vs-gas', 'road-trip-fuel'],
  },
  energy: {
    label: 'Energy at home',
    toolIds: ['electricity-cost', 'appliance-electricity', 'ev-vs-gas', 'where-cheaper'],
  },
  prices: {
    label: 'What things cost',
    toolIds: ['where-cheaper', 'unit-price', 'inflation', 'cost-of-living'],
  },
  'home-project': {
    label: 'Measuring a home project',
    toolIds: ['concrete', 'square-footage', 'unit-conversion'],
  },
  body: {
    label: 'Body and energy estimates',
    toolIds: ['bmi', 'bmr', 'tdee', 'calorie', 'body-fat'],
  },
  'date-time': {
    label: 'Dates and hours',
    toolIds: ['date', 'days-from-today', 'business-days', 'per-diem', 'age', 'time', 'time-card'],
  },
  arithmetic: {
    label: 'Everyday arithmetic',
    toolIds: ['percentage', 'percent-change', 'fraction', 'scientific', 'unit-conversion', 'random-number'],
  },
  school: {
    label: 'Grades and GPA',
    toolIds: ['gpa', 'grade', 'percentage', 'percent-change', 'fraction'],
  },
  kitchen: {
    label: 'Cooking and shopping',
    toolIds: ['recipe-scaler', 'unit-price', 'unit-conversion', 'tip'],
  },
} as const satisfies Record<string, { label: string; toolIds: readonly string[] }>;

export type ClusterId = keyof typeof TOOL_CLUSTERS;
export const CLUSTER_IDS = Object.keys(TOOL_CLUSTERS) as ClusterId[];

/** Clusters a tool belongs to, in declaration order. */
export function clustersForTool(toolId: string): ClusterId[] {
  return CLUSTER_IDS.filter((id) => (TOOL_CLUSTERS[id].toolIds as readonly string[]).includes(toolId));
}

/**
 * Every other tool that shares a cluster with this one.
 *
 * Taken a step at a time from each cluster in turn rather than one cluster at a
 * time, so a tool that sits in two journeys — a 401(k) is both retirement and
 * payroll — offers a way into both instead of filling its slots from whichever
 * cluster happens to be declared first.
 */
export function clusterNeighbours(toolId: string): string[] {
  const lists = clustersForTool(toolId)
    .map((id) => (TOOL_CLUSTERS[id].toolIds as readonly string[]).filter((candidate) => candidate !== toolId));
  const seen = new Set<string>([toolId]);
  const neighbours: string[] = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let index = 0; index < longest; index += 1) {
    for (const list of lists) {
      const candidate = list[index];
      if (candidate === undefined || seen.has(candidate)) continue;
      seen.add(candidate);
      neighbours.push(candidate);
    }
  }
  return neighbours;
}
