import { InfoPage } from '@/components/site/InfoPage';
import { integrationConfig } from '@/lib/integration-config';
import { formatPublishingDateLong, PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Privacy',
  'CostAnswer calculators run in your browser. Nothing you type is sent to us, and analytics and advertising are disabled.',
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
      <p>Every calculator runs in the page itself. Pay, dates, prices, quantities, and the state you pick are used in your browser and are not sent to us or stored on our servers.</p>
      <h2>Analytics</h2>
      {/* Stated from the deployed configuration, so the policy cannot drift from what the site actually does. */}
      <p>{integrationConfig.analyticsEnabled
        ? 'Analytics are enabled. We count that a calculator was opened, that a calculation finished, or that a search ran. The amounts you type are never part of that.'
        : 'Analytics are disabled on this site. Nothing about your visit is measured or sent anywhere. If that changes, this policy is updated first and will say exactly what is counted; the amounts you type would stay out of it either way.'}</p>
      <h2>Advertising</h2>
      <p>{integrationConfig.advertisingEnabled
        ? 'Advertising space is reserved on some pages. Anything served there is subject to this policy and to the notice shown at the time.'
        : 'Advertising is disabled on this site. No ad network, tag, or tracker loads on any page.'}</p>
      <h2>Cookies and storage</h2>
      <p>No cookies are set for tracking. The site does not need an account and does not keep a profile of you.</p>
      <h2>Contact</h2>
      <p>This policy is dated {effectiveDate}.{' '}{integrationConfig.publicContactEmail
        ? <>Questions or corrections: <a href={`mailto:${integrationConfig.publicContactEmail}`}>{integrationConfig.publicContactEmail}</a>.</>
        : <>A published contact address is not available yet. Analytics and advertising remain disabled.</>}</p>
    </InfoPage>
  );
}
