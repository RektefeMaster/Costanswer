import Link from 'next/link';
import { InfoPage } from '@/components/site/InfoPage';
import { integrationConfig } from '@/lib/integration-config';
import { formatPublishingDateLong, PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import { pageMetadata } from '@/lib/seo';
import { disclosureText } from '@/lib/monetization/affiliate/disclosure';
import { resolveFlag } from '@/lib/monetization/flags';
import { activeAdProvider } from '@/lib/monetization/ads/provider';

export const metadata = pageMetadata(
  'Advertising and compensation',
  'How CostAnswer makes money, what that pays for, and the one thing it never changes: the answer on the page.',
  '/disclosure',
);

const CONTENTS = [
  { id: 'the-short-version', label: 'The short version' },
  { id: 'advertising', label: 'Advertising' },
  { id: 'affiliate', label: 'Affiliate links' },
  { id: 'referrals', label: 'Professional referrals' },
  { id: 'what-it-never-affects', label: 'What it never affects' },
  { id: 'how-to-tell', label: 'How to tell' },
];

/**
 * The compensation disclosure page.
 *
 * Written from the deployed configuration rather than from intent, the same way
 * the privacy page is, so it cannot drift from what the site is actually doing.
 * Nothing on this page is monetized — a disclosure that carries an advertisement
 * is not a disclosure.
 */
export default function DisclosurePage() {
  const effective = formatPublishingDateLong(integrationConfig.privacyEffectiveDate ?? PUBLISHING_SNAPSHOT_DATE);
  const adsOn = resolveFlag('ads.enabled');
  const affiliateOn = resolveFlag('affiliate.enabled');
  const leadsOn = resolveFlag('leads.enabled');
  const network = activeAdProvider();

  return (
    <InfoPage
      eyebrow="Disclosure"
      title="Advertising and compensation"
      intro="CostAnswer is free to use. This page says exactly how it is paid for and what that money is not allowed to touch."
      effective={effective}
      contents={CONTENTS}
      currentPolicy="/disclosure"
    >
      <h2 id="the-short-version">The short version</h2>
      <p>
        CostAnswer can be paid three ways: advertising space on the page, a commission when you buy
        something through a link, and a referral fee when you ask us to connect you with a local
        professional. All three sit after the answer, all three are labelled, and none of them changes
        a calculation.
      </p>

      <h2 id="advertising">Advertising</h2>
      <p>{adsOn && network
        ? `Advertising is on, served by ${network.displayName}. Ads are chosen by that network, not by us. We do not place an advertisement between a calculator input and its result, and we do not dress an ad up as an answer.`
        : 'Advertising is off. Some pages reserve empty space where an ad would go, so that turning advertising on later does not move the answer down the page. Nothing is loading and no ad network sees your visit.'}</p>

      <h2 id="affiliate">Affiliate links</h2>
      <p>{affiliateOn
        ? disclosureText('generic-affiliate', 'en-US')
        : 'Affiliate links are off. When they are on, a materials or tools section can appear under a project calculator, and CostAnswer may earn a commission if you buy through one. It never changes your price.'}</p>
      <p>
        Product suggestions come from what the calculator worked out you need — gallons of paint,
        squares of roofing, cubic yards of concrete. A merchant paying more can decide which of two
        equally relevant links we show. It cannot invent a product you had no reason to see, and where
        payment did affect the order, the module says so.
      </p>
      <p>
        We do not publish a stored price for anything we cannot keep current. Where a merchant&rsquo;s terms
        govern price display, the link says &ldquo;check current price&rdquo; instead of showing a number that may
        be weeks old.
      </p>

      <h2 id="referrals">Professional referrals</h2>
      <p>{leadsOn
        ? disclosureText('lead-referral', 'en-US')
        : 'Professional referrals are off. When they are on, some home-project pages can offer to pass your request to a partner who works with local contractors, and CostAnswer is paid a referral fee for that.'}</p>
      <p>
        If you use it, we tell you which partner receives your request before you agree, we ask for
        nothing we do not need, and we check that a professional actually covers your area before we
        ask for a phone number at all. Asking for estimates does not commit you to hiring anyone.
      </p>
      <p>
        We do not send one request to several networks at once. We have not inspected, vetted or
        approved any individual contractor, and we never say we have.
      </p>

      <h2 id="what-it-never-affects">What it never affects</h2>
      <p>
        No advertiser, merchant, partner or payout influences a formula, an assumption, a data source,
        a range, a confidence level or a cost estimate. That is enforced in the software, not just
        promised here: the calculation engines cannot read anything from the commercial layer, and a
        test fails the build if that ever changes.
      </p>
      <p>
        Every calculator on this site works identically with advertising, affiliate links and referrals
        all switched off. If they were all turned off tomorrow, you would lose some boxes at the bottom
        of the page and nothing else.
      </p>

      <h2 id="how-to-tell">How to tell</h2>
      <p>
        Anything commercial is labelled where it sits, not only here. Paid links carry a
        <code> sponsored </code> attribute, open in a new tab, and go straight to the merchant — there is
        no redirect hiding the destination. Read more in our{' '}
        <Link href="/privacy">privacy policy</Link> and{' '}
        <Link href="/terms">user agreement</Link>.
      </p>
    </InfoPage>
  );
}
