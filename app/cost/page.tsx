import { JobPicker } from '@/components/job/JobPicker';
import { CostPage } from '@/components/job/CostPage';
import { costPageRobots } from '@/lib/job/publication';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'What should this job cost?',
  'CostAnswer estimated ranges for fourteen residential jobs, from BLS wages, ECEC labor loading, FEMA equipment cost proxies, and named recipes.',
  '/cost',
  costPageRobots('familyHub'),
);

export default function CostHubPage() {
  return (
    <CostPage
      title="What should this job cost?"
      description="Pick a job. You get a CostAnswer estimated range from published wages and named recipes — or an incomplete result when a critical material still has no sourced price."
      path="/cost"
      pageId="job-cost-hub"
      methodology={[
        { title: 'One engine', body: 'Fourteen recipes share the same labor, material, equipment, and markup math. There is no per-job calculator.' },
        { title: 'Incomplete is a feature', body: 'If a critical material has no sourced baseline, we do not invent a complete low/expected/high range.' },
      ]}
    >
      <JobPicker />
    </CostPage>
  );
}
