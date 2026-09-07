import { JOB_IDS, jobPath } from './catalog';
import { isCostLevelIndexable } from './publication';

export function costFamilySitemapPaths(): Array<`/${string}`> {
  const paths: Array<`/${string}`> = [];
  if (isCostLevelIndexable('familyHub')) paths.push('/cost');
  if (isCostLevelIndexable('estimate')) paths.push('/cost/estimate');
  if (isCostLevelIndexable('checkQuote')) paths.push('/cost/check-quote');
  if (isCostLevelIndexable('jobPage')) {
    for (const jobId of JOB_IDS) paths.push(jobPath(jobId));
  }
  return paths;
}
