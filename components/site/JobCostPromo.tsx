import Link from 'next/link';
import { JOB_CATALOG, JOB_IDS, jobPath, type JobId } from '@/lib/job/catalog';

const FEATURED = [
  'hvac-replacement',
  'tree-removal',
  'deck-build',
  'bathroom-remodel',
  'interior-painting',
  'water-heater-replacement',
] as const satisfies readonly JobId[];
const TONES = ['amber', 'blue', 'mint', 'rose', 'coral', 'violet'] as const;

export function JobCostPromo() {
  return (
    <section className="category-strip job-cost-promo" aria-labelledby="job-cost-promo-title">
      <div className="section-intro">
        <p className="eyebrow"><span /> Job costs</p>
        <h2 id="job-cost-promo-title">What should this job cost?</h2>
        <p className="section-lede">
          Fourteen residential recipes on one engine. BLS wages, ECEC labor loading, and FEMA equipment cost proxies. If a critical material has no sourced price, the range stays incomplete.
        </p>
        <ul className="topic-prompts">
          <li>
            <Link href="/cost">
              <span>Browse the fourteen jobs</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link href="/cost/check-quote">
              <span>Check a contractor quote</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        </ul>
      </div>
      <div className="category-grid">
        {FEATURED.map((jobId, index) => {
          const job = JOB_CATALOG[jobId];
          return (
            <Link className={`category-card ${TONES[index] ?? 'amber'}`} href={jobPath(jobId)} key={jobId}>
              <span className="category-topline">
                <span className="category-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="category-arrow" aria-hidden="true">↗</span>
              </span>
              <span className="category-copy">
                <strong>{job.shortTitle}</strong>
                <small>{job.tradeLabel}</small>
              </span>
            </Link>
          );
        })}
        {JOB_IDS.length - FEATURED.length > 0 && (
          <Link className="category-card amber" href="/cost">
            <span className="category-topline">
              <span className="category-number">{String(FEATURED.length + 1).padStart(2, '0')}</span>
              <span className="category-arrow" aria-hidden="true">↗</span>
            </span>
            <span className="category-copy">
              <strong>All fourteen jobs</strong>
              <small>Estimate or check a quote</small>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
