import { JOB_IDS, jobPath } from './catalog';
import { isCostLevelIndexable } from './publication';
import { openCostStateLeaves, jobInStatePath, COST_STATE_PUBLICATION } from './state-pages';

export function costFamilySitemapPaths(): Array<`/${string}`> {
  const paths: Array<`/${string}`> = [];
  if (isCostLevelIndexable('familyHub')) paths.push('/cost');
  if (isCostLevelIndexable('estimate')) paths.push('/cost/estimate');
  if (isCostLevelIndexable('checkQuote')) paths.push('/cost/check-quote');
  if (isCostLevelIndexable('jobPage')) {
    for (const jobId of JOB_IDS) paths.push(jobPath(jobId));
  }
  if (COST_STATE_PUBLICATION === 'indexable') {
    for (const { jobId, state } of openCostStateLeaves()) {
      paths.push(jobInStatePath(jobId, state));
    }
  }
  return paths;
}
