import { JobFlow } from '@/components/job/JobFlow';
import { CostPage } from '@/components/job/CostPage';
import { costPageRobots } from '@/lib/job/publication';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Job cost estimate',
  'What should this job cost? A CostAnswer estimated range from BLS wages, ECEC loading, and named production assumptions.',
  '/cost/estimate',
  costPageRobots('estimate'),
);

export default function CostEstimatePage() {
  return (
    <CostPage
      title="What should this job cost?"
      description="ZIP, quantity, and a few modifiers. The band is a CostAnswer estimated range, never a market normal."
      path="/cost/estimate"
      pageId="job-cost-estimate"
      methodology={[
        { title: 'Labor', body: 'OEWS hourly × ECEC construction loading. Benefits are not also in overhead.' },
        { title: 'Materials', body: 'National baseline × PPI. BEA RPP is not multiplied into materials.' },
        { title: 'Equipment', body: 'FEMA Schedule of Equipment Rates is a cost proxy, not a rental quote.' },
      ]}
    >
      <JobFlow mode="estimate" initialJobId="hvac-replacement" />
    </CostPage>
  );
}
