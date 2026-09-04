import Link from 'next/link';
import { InfoPage } from '@/components/site/InfoPage';
import { integrationConfig } from '@/lib/integration-config';
import { formatPublishingDateLong, PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Privacy',
  'CostAnswer calculators run in your browser. Nothing you type is sent to us. Analytics and advertising are disabled unless this page says otherwise.',
  '/privacy',
);

const CONTENTS = [
  { id: 'what-you-type', label: 'What you type' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'advertising', label: 'Advertising' },
  { id: 'affiliates', label: 'Affiliate offers' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'corrections', label: 'Corrections and requests' },
];

export default function PrivacyPage() {
  const effectiveDate = formatPublishingDateLong(integrationConfig.privacyEffectiveDate ?? PUBLISHING_SNAPSHOT_DATE);

  return (
    <InfoPage
      eyebrow="Privacy"
      title="Privacy"
      intro="No account. Pay, dates, prices, and the state you pick stay in your browser. They are not stored on our servers."
      effective={effectiveDate}
      contents={CONTENTS}
      currentPolicy="/privacy"
    >
      <h2 id="what-you-type">What you type</h2>
      <p>
        Every calculator runs in the page. Inputs produce the result in front of you. They are not posted to
        CostAnswer to keep, profile, or sell.
      </p>
      <p>
        The contact form is the exception you choose. If you send a correction, a calculator request, a
        complaint, or a suggestion, that text leaves your browser through your mail app to the address on the
        contact page. An optional reply address is only there so we can answer you. Do not put paystubs,
        account numbers, or medical records in it.
      </p>

      <h2 id="analytics">Analytics</h2>
      {/* Stated from the deployed configuration, so the policy cannot drift from what the site actually does. */}
      <p>{integrationConfig.analyticsEnabled
        ? 'Analytics are on. We count that a calculator was opened, that a calculation finished, or that a search ran. The amounts you type are never part of that.'
        : 'Analytics are off. Nothing about a visit is measured or sent anywhere. If that changes, this page is updated first and will say exactly what is counted. The amounts you type would stay out of it either way.'}</p>

      <h2 id="advertising">Advertising</h2>
      <p>{integrationConfig.advertisingEnabled
        ? 'Some pages reserve space for ads. Anything served there is subject to this policy and to the notice shown at the time.'
        : 'Advertising is off. No ad network, tag, or tracker loads. Leaderboard, sidebar, and in-content regions stay labeled as reserved space until a public contact address, a dated policy, and an advertising flag are all set.'}</p>

      <h2 id="affiliates">Affiliate and partner offers</h2>
      <p>{integrationConfig.affiliatesEnabled
        ? 'Some calculator result pages may show labeled partner offers. Those links are advertisements. CostAnswer may be compensated if you click or apply. They are not the calculator’s answer and not financial advice.'
        : 'Affiliate offers are off. Some money tools still reserve a partner-comparison slot next to the result so the layout is stable. No partner URL loads until this flag, a public contact address, and a dated policy are set, and a real program URL is configured. Example names in the software are placeholders, not live deals.'}</p>

      <h2 id="cookies">Cookies</h2>
      <p>
        No cookies are set for tracking. There is no account and no profile of you. Your browser may still keep
        its own copy of a page, the way it does for any site.
      </p>

      <h2 id="corrections">Corrections and requests</h2>
      <p>
        {integrationConfig.publicContactEmail
          ? <>This policy, a wrong figure, a calculator request, a complaint, or a suggestion: <a href={`mailto:${integrationConfig.publicContactEmail}`}>{integrationConfig.publicContactEmail}</a>.</>
          : <>No public contact address is listed yet. Analytics and advertising stay off until one is. The contact form still prepares a note you can copy.</>}
        {' '}The form and what to copy from Technical details are on the <Link href="/contact">contact</Link> page.
      </p>
    </InfoPage>
  );
}
