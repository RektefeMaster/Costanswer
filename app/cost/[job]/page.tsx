import { notFound } from 'next/navigation';
import Link from 'next/link';
import { JobEstimator } from '@/components/job/JobEstimator';
import { JobPicker } from '@/components/job/JobPicker';
import { CostPage } from '@/components/job/CostPage';
import { JOB_CATALOG, JOB_IDS, isJobId } from '@/lib/job/catalog';
import { costPageRobots } from '@/lib/job/publication';
import { pageMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return JOB_IDS.map((job) => ({ job }));
}

export async function generateMetadata({ params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  if (!isJobId(job)) notFound();
  const meta = JOB_CATALOG[job];
  return pageMetadata(meta.title, meta.description, `/cost/${job}`, costPageRobots('jobPage'));
}

export default async function JobCostPage({ params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  if (!isJobId(job)) notFound();
  const meta = JOB_CATALOG[job];
  return (
    <CostPage
      title={meta.title}
      description={meta.description}
      path={`/cost/${job}`}
      pageId={`job-${job}`}
      methodology={[
        { title: 'Unit', body: meta.scope.hint },
        { title: 'Geography', body: 'ZIP is an approximate ZIP/ZCTA match to county, not a HUD USPS crosswalk.' },
        { title: 'Range', body: 'Shown as a CostAnswer estimated range. Incomplete when a critical material has no sourced price.' },
      ]}
    >
      <p className="related-lede"><Link href="/cost/check-quote">Compare a contractor quote</Link> on the same engine.</p>
      <JobPicker activeJobId={job} />
      <JobEstimator key={job} jobId={job} mode="estimate" />
    </CostPage>
  );
}
