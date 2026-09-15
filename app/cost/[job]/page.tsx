import { notFound } from 'next/navigation';
import Link from '@/components/i18n/LocalizedLink';
import { JobEstimator } from '@/components/job/JobEstimator';
import { JobPicker } from '@/components/job/JobPicker';
import { CostPage } from '@/components/job/CostPage';
import { JOB_CATALOG, JOB_IDS, isJobId } from '@/lib/job/catalog';
import { jobCostPageTitle, jobCostQuestions, jobRelatedTools } from '@/lib/job/content';
import { costPageRobots } from '@/lib/job/publication';
import { jobInStatePath, openStatesForJob } from '@/lib/job/state-pages';
import { getStateName } from '@/lib/location/states';
import { pageMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return JOB_IDS.map((job) => ({ job }));
}

export async function generateMetadata({ params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  if (!isJobId(job)) notFound();
  const meta = JOB_CATALOG[job];
  return pageMetadata(jobCostPageTitle(meta), meta.description, `/cost/${job}`, costPageRobots('jobPage'));
}

export default async function JobCostPage({ params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  if (!isJobId(job)) notFound();
  const meta = JOB_CATALOG[job];
  const faqs = jobCostQuestions(job);
  const openStates = openStatesForJob(job);
  return (
    <CostPage
      title={jobCostPageTitle(meta)}
      description={meta.description}
      path={`/cost/${job}`}
      pageId={`job-${job}`}
      faqs={faqs}
      methodology={[
        { title: 'Unit', body: meta.scope.hint },
        { title: 'Geography', body: 'ZIP is an approximate ZIP/ZCTA match to county, not a HUD USPS crosswalk.' },
        { title: 'Range', body: 'Shown as a CostAnswer estimated range. Incomplete when a critical material has no sourced price.' },
      ]}
    >
      <p className="related-lede">
        <Link href="/cost/check-quote">Compare a contractor quote</Link> on the same engine.
        {jobRelatedTools(job).map((tool) => (
          <span key={tool.href}>
            {' · '}
            <Link href={tool.href}>{tool.label}</Link>
          </span>
        ))}
      </p>
      <JobPicker activeJobId={job} />
      <JobEstimator key={job} jobId={job} mode="estimate" />
      {openStates.length > 0 && (
        <section className="related-section" aria-labelledby="job-state-leaves-title">
          <p className="eyebrow muted"><span /> By state</p>
          <h2 id="job-state-leaves-title">{`Where ${meta.shortTitle.toLowerCase()} wages move the range`}</h2>
          <p className="related-lede">
            State pages open only when BLS trade wages differ from the national crew bill by more than this recipe’s confidence band. Materials stay national.
          </p>
          <ul className="topic-prompts">
            {openStates.slice(0, 24).map((state) => (
              <li key={state}>
                <Link href={jobInStatePath(job, state)}>
                  <span>{getStateName(state)}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </CostPage>
  );
}
