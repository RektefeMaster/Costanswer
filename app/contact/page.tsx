import Link from 'next/link';
import { ContactForm } from '@/components/site/ContactForm';
import { InfoPage } from '@/components/site/InfoPage';
import { integrationConfig } from '@/lib/integration-config';
import { formatPublishingDateLong, PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Contact',
  'Report a wrong figure on CostAnswer, request a calculator, or send a complaint or suggestion. Copy the Method and Data lines for a correction.',
  '/contact',
);

const CONTENTS = [
  { id: 'write', label: 'Write' },
  { id: 'requests', label: 'Requests' },
  { id: 'wrong-figures', label: 'Wrong figures' },
  { id: 'what-this-is-for', label: 'What this is for' },
  { id: 'after-you-send-it', label: 'After you send it' },
];

export default function ContactPage() {
  const email = integrationConfig.publicContactEmail;
  const effective = formatPublishingDateLong(integrationConfig.privacyEffectiveDate ?? PUBLISHING_SNAPSHOT_DATE);

  return (
    <InfoPage
      eyebrow="Contact"
      title="Contact"
      intro="Wrong figures, calculator requests, complaints, and suggestions go here. It is not a place to get a second opinion on a loan, a tax return, or a diagnosis."
      effective={effective}
      contents={CONTENTS}
      currentPolicy="/contact"
    >
      <h2 id="write">Write</h2>
      {email
        ? (
          <p>
            <a href={`mailto:${email}`}>{email}</a>
            . Same address as on the privacy page. The form below opens a message to that address. Nothing is
            posted to CostAnswer to store.
          </p>
        )
        : (
          <p>
            There is no public inbox on the site yet. Ads and analytics stay off until there is one, because
            both need a dated privacy policy and an address people can actually write to. The form still
            prepares the note so you can copy it; when an address exists, it will be listed here and the same
            form will open your mail app.
          </p>
        )}

      <ContactForm inboxEmail={email} />

      <h2 id="requests">Calculator requests</h2>
      <p>
        If a calculator is missing, say what it should compute, who it is for, and which official table it
        should use if you know one. The closest page already on the site helps. A request is read. Building it
        is a separate decision. There is no queue you can check, and no promise of a date.
      </p>
      <p>
        Complaints about the product (a page that will not load, a ZIP lookup that hangs, copy that contradicts
        the numbers) go in the same form. Pick Something broken. Product complaints and wrong figures are
        different notes. Mix them and the Method line gets lost.
      </p>

      <h2 id="wrong-figures">Wrong figures</h2>
      <p>Open Technical details under the answer and copy the two lines there into the form.</p>
      <ul>
        <li>The page URL</li>
        <li>The Method version</li>
        <li>The Data snapshot id, or “Manual inputs / fixed rules” if that is what it says</li>
        <li>What you typed, what the page showed, and what you expected</li>
        <li>A title, period, and link for the official table you are comparing, if you have one</li>
      </ul>
      <p>
        Do not send paystubs, tax returns, account numbers, Social Security numbers, or medical records. The
        calculators do not need them, and neither does this form.
      </p>

      <h2 id="what-this-is-for">What this is for</h2>
      <p>
        A formula that does not match its worked example. A stored dataset that does not match its hash. A
        source, period, or geography labelled as the wrong one. A page still showing an older figure as current
        after the provider has published again. A calculator this catalogue does not have. Copy or layout that
        gets in the way of reading a result.
      </p>
      <p>
        Personal tax, lending, medical, payroll, or travel questions belong with the official source named on
        the page, or with someone licensed to take that on. Common questions about what a result is, where
        the data comes from, and what the site stores are on the <Link href="/faq">FAQ</Link>.
      </p>

      <h2 id="after-you-send-it">After you send it</h2>
      <p>
        A report with the Method and Data lines can be checked against the tests and the stored snapshot. If
        the engine is wrong, the Method string changes. If the data is wrong or stale, the Data id changes.
        Older results keep the strings they printed, so a past screenshot still points at that copy.
      </p>
      <p>
        A calculator request is not a ticket. If it is built, it shows up in the catalogue with a Method
        version of its own. There is no promised response time. A complete note gets read. A screenshot with
        no version usually cannot be checked.
      </p>
    </InfoPage>
  );
}
