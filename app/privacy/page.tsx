import { InfoPage } from '@/components/site/InfoPage';
import { integrationConfig } from '@/lib/integration-config';
import { formatPublishingDateLong, PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Privacy',
  'CostAnswer calculators run in your browser. What stays on your computer, and what we might count.',
  '/privacy',
);

export default function PrivacyPage() {
  const effectiveDate = formatPublishingDateLong(integrationConfig.privacyEffectiveDate ?? PUBLISHING_SNAPSHOT_DATE);

  return (
    <InfoPage
      eyebrow="Privacy"
      title="The numbers you type stay on your computer."
      intro="No account. We are not storing your pay, dates, or prices on our servers."
    >
      <h2>What you type</h2>
      <p>The calculator runs in the page. Pay, dates, prices, quantities, and the state you pick stay in the browser.</p>
      <h2>Analytics</h2>
      <p>We might count that someone opened a calculator or finished a search. Your dollar amounts stay put. Analytics stay off until we have a contact email and a dated policy.</p>
      <h2>Ads</h2>
      <p>There are no ads running. Tool pages leave a blank space for later. Nothing loads from an ad network until we add consent and a notice you can actually read.</p>
      <h2>Contact</h2>
      <p>This note is dated {effectiveDate}. {integrationConfig.publicContactEmail
        ? <>Questions: <a href={`mailto:${integrationConfig.publicContactEmail}`}>{integrationConfig.publicContactEmail}</a>.</>
        : <>We have not published a contact email yet, so analytics and ads stay off.</>}</p>
    </InfoPage>
  );
}
