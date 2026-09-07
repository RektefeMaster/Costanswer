import { JobFlow } from '@/components/job/JobFlow';
import { CostPage } from '@/components/job/CostPage';
import { costPageRobots } from '@/lib/job/publication';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Check a contractor quote',
  'Compare a contractor quote to a CostAnswer estimated range. Verdicts are never accusatory.',
  '/cost/check-quote',
  costPageRobots('checkQuote'),
);

export default function CheckQuotePage() {
  return (
    <CostPage
      title="Is this quote in our estimated range?"
      description="Same engine as the estimate. If a critical material is unpriced, the only verdict is that the quote is outside what we can assess."
      path="/cost/check-quote"
      pageId="job-quote-check"
      methodology={[
        { title: 'Verdicts', body: 'Below, at the low end, within, at the high end, above, or outside what we can assess. The wording is never accusatory.' },
        { title: 'Incomplete data', body: 'A missing critical material blocks a complete range, so we will not grade the quote.' },
      ]}
    >
      <JobFlow mode="quote" initialJobId="hvac-replacement" />
    </CostPage>
  );
}
