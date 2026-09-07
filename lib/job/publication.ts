/**
 * How far the Job Cost family is opened to search engines.
 *
 * Rollback is one edit: set a level to `staged`. Routes still resolve; they
 * drop out of the sitemap and carry noindex.
 */
export type CostLevel = 'familyHub' | 'estimate' | 'checkQuote' | 'jobPage';

export const COST_PUBLICATION: Record<CostLevel, 'indexable' | 'staged'> = {
  familyHub: 'indexable',
  estimate: 'indexable',
  checkQuote: 'indexable',
  jobPage: 'indexable',
};

export function isCostLevelIndexable(level: CostLevel): boolean {
  return COST_PUBLICATION[level] === 'indexable';
}

export function costPageRobots(level: CostLevel): { index: boolean; follow: true } {
  return { index: isCostLevelIndexable(level), follow: true };
}
