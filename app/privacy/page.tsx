import Link from 'next/link';
import { InfoPage } from '@/components/site/InfoPage';
import { integrationConfig } from '@/lib/integration-config';
import { resolveFlag } from '@/lib/monetization/flags';
import { DEFAULT_CONTACT_RETENTION_DAYS, DEFAULT_LEAD_RETENTION_DAYS } from '@/lib/monetization/leads/service';
import { CONSENT_EVIDENCE_RETENTION_DAYS } from '@/lib/monetization/store/repositories/consents';
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
  { id: 'referrals', label: 'Requesting estimates' },
  { id: 'retention', label: 'How long we keep things' },
  { id: 'your-choices', label: 'Your choices' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'corrections', label: 'Corrections and requests' },
];

export default function PrivacyPage() {
  const effectiveDate = formatPublishingDateLong(integrationConfig.privacyEffectiveDate ?? PUBLISHING_SNAPSHOT_DATE);
  const leadsOn = resolveFlag('leads.enabled');

  return (
    <InfoPage
      eyebrow="Privacy"
      title="Privacy"
      intro="No account. Pay, dates, prices, and the state you pick stay in your browser. The one time anything leaves it is when you deliberately ask us to send a request to someone."
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
        There are exactly two exceptions, and you choose both of them.
      </p>
      <p>
        The contact form is the first. If you send a correction, a calculator request, a
        complaint, or a suggestion, that text leaves your browser through your mail app to the address on the
        contact page. An optional reply address is only there so we can answer you. Do not put paystubs,
        account numbers, or medical records in it.
      </p>
      <p>
        Asking us to connect you with a local professional is the second, and it is described under
        &ldquo;Requesting estimates&rdquo; below. Nothing about that happens unless you fill in that form and
        tick the box.
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

      <h2 id="referrals">Requesting estimates from a professional</h2>
      <p>{leadsOn
        ? 'Some home-project pages can pass your request to a partner who works with local contractors. It only happens if you fill in that form and tick the box, and the box is never pre-ticked.'
        : 'This is currently switched off, so no page asks for your contact details for this purpose. What follows describes what happens when it is on.'}</p>
      <p>
        Before we ask for a phone number at all, we check whether a professional actually covers your
        area. If none does, we say so and we do not collect your details for later. There is no waiting
        list.
      </p>
      <p>
        If you do submit, we send your name, the contact details you gave, your ZIP code, and what you
        told us about the project to the partner we named on the form. We name them before you agree,
        not after. They or a professional they work with may then contact you about that project. We are
        paid a referral fee, which does not change your price and did not change the estimate on the page.
      </p>
      <p>
        We send one request to one partner. We do not sell the same request to several networks. We do
        not send your details anywhere if the check above found nobody, and we do not use them to market
        anything of our own — CostAnswer does not cold call, text or email you.
      </p>
      <p>
        Your contact details are stored apart from everything else and are never included in analytics.
        What analytics sees is that a request happened, in which category and which state — never who
        you are, never your phone number, never your ZIP code.
      </p>

      <h2 id="retention">How long we keep things</h2>
      <p>
        Different records have different clocks, and none of them is &ldquo;forever&rdquo;.
      </p>
      <ul>
        <li><strong>Your contact details.</strong> {DEFAULT_CONTACT_RETENTION_DAYS} days, then erased automatically.</li>
        <li><strong>The record that a request happened,</strong> without your contact details: about {Math.round(DEFAULT_LEAD_RETENTION_DAYS / 365)} years, so a payment dispute can be settled.</li>
        <li><strong>Proof of what you agreed to,</strong> and when: about {Math.round(CONSENT_EVIDENCE_RETENTION_DAYS / 365)} years. This is the record that protects you as much as us.</li>
        <li><strong>Counts and totals.</strong> Kept as aggregate numbers with nothing identifying in them.</li>
      </ul>

      <h2 id="your-choices">Your choices</h2>
      <p>
        You can ask us to stop using your details, to tell you what we hold, or to delete it. Write to
        the address at the bottom of this page. We will erase your contact details and keep only the
        record that a request happened and the proof of what you agreed to, which is what the clocks
        above describe.
      </p>
      <p>
        One thing we want to be straight about: once a partner has received your request, they hold
        their own copy under their own policy. We can stop <em>our</em> use of your details and we do.
        We cannot reach into their systems and delete a record they now control independently, and we
        are not going to pretend otherwise. Their policy, and the contact for it, is named on the form
        before you agree.
      </p>
      <p>
        CostAnswer does not sell personal information and does not share it for cross-context
        behavioural advertising. A referral you asked for is not a sale of your data, but if you would
        rather it had not happened, tell us and we will suppress your details from any future use.
      </p>

      <h2 id="cookies">Cookies</h2>
      <p>
        No cookies are set for tracking by CostAnswer itself. There is no account and no profile of you.
        Your browser may still keep its own copy of a page, the way it does for any site.
      </p>
      <p>{integrationConfig.advertisingEnabled
        ? 'An advertising network is active and may set its own cookies subject to the choices you are offered at the time.'
        : 'No advertising network is active, so none is setting one either.'}</p>

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
