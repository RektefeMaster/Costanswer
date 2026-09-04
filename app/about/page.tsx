import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { InfoPage } from '@/components/site/InfoPage';
import { examplePartnerNames } from '@/lib/affiliates';
import { editorial } from '@/lib/editorial';
import { breadcrumbJsonLd, organizationJsonLd, pageMetadata } from '@/lib/seo';
import { categories, CATEGORY_IDS } from '@/lib/categories';
import { siteConfig } from '@/lib/site-config';
import { tools } from '@/lib/tool-registry';

export const metadata = pageMetadata(
  'About',
  'CostAnswer is independently built U.S. calculators that show the formula behind every answer and name the dated official source behind every published figure. Not a licensed advisory firm.',
  '/about',
);

const toolCount = tools.length;
const topicNames = CATEGORY_IDS.map((id) => categories[id].name);

const CONTENTS = [
  { id: 'what-is-here', label: 'What is here' },
  { id: 'who-maintains', label: 'Who maintains this' },
  { id: 'trust', label: 'What makes an answer trustworthy' },
  { id: 'standards', label: 'Editorial standards' },
  { id: 'testing', label: 'How the numbers are tested' },
  { id: 'sources', label: 'Where the data comes from' },
  { id: 'currency', label: 'How current the data is' },
  { id: 'not-advice', label: 'What this is not' },
  { id: 'paid-for', label: 'How the site is paid for' },
  { id: 'corrections', label: 'Corrections' },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={[
        organizationJsonLd(),
        breadcrumbJsonLd([
          { name: siteConfig.name, path: '/' },
          { name: 'About', path: '/about' },
        ]),
      ]} />
      <InfoPage
        eyebrow="About CostAnswer"
        title="Calculators that show their work."
        intro="Free, no account, and every answer comes with the formula that produced it and the source of any figure you did not type in."
        contents={CONTENTS}
        currentPolicy="/about"
      >
        <h2 id="what-is-here">What is here</h2>
        <p>{toolCount} calculators across {topicNames.slice(0, -1).join(', ')}, and {topicNames[topicNames.length - 1]}. Pay and tax, a mortgage or loan payment, whether a house or a car fits your take-home pay, savings and retirement projections, energy and fuel costs, home projects, health formulas, everyday date and time math, unit conversion, and school grades.</p>

        <h2 id="who-maintains">Who maintains this</h2>
        <p>{editorial.identity}</p>
        <p>There is no licensed advisory staff, no fabricated CFA or CPA roster, and no invented newsroom. Pages that look like they were written by a credentialed planner are a YMYL risk we refuse. The byline is {editorial.byline}: the same person who versions the engines, hashes the snapshots, and takes correction reports.</p>
        <p>If a number is wrong, the Method version and Data snapshot id under Technical details are how we pin it. <Link href="/contact">Contact</Link> is the inbox for that, not a place to get a second opinion on a loan or a diagnosis.</p>

        <h2 id="trust">What makes an answer trustworthy here</h2>
        <p>Three things sit under every result. The formula, written out step by step, so you can follow the arithmetic. The version of the engine that produced it, so the same inputs give the same answer tomorrow. And, for anything that uses public data, the dataset, its observation period, and the date it was published.</p>
        <p>Each calculator page also has a topic guide, a FAQ, a glossary, and the limits of the model — written for that tool, not copied across the catalogue.</p>

        <h2 id="standards">{editorial.standardsHeading}</h2>
        <ul>
          {editorial.standards.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>The <Link href="/methodology">methodology</Link> page is the operational version of the same rules.</p>

        <h2 id="testing">How the numbers are tested</h2>
        <p>Every engine has tests that check it against worked examples. Official datasets are fetched, stored, and hashed; the site refuses to build if a stored file no longer matches the hash it was reviewed under. Nothing is fetched live while you type, so a result cannot change underneath you because a provider had an outage.</p>

        <h2 id="sources">Where the data comes from</h2>
        <p>Freddie Mac for mortgage rates, EIA for electricity and gasoline, BLS for consumer prices and inflation, IRS and SSA for tax and retirement limits, HUD for Fair Market Rents, Census and BEA for local income and price levels, USDA for food plans, GSA for CONUS per diem. Each one is listed with its period and publication date on the data page. Those agencies do not operate this site.</p>

        <h2 id="currency">How current the data is</h2>
        <p>Each dataset has a known release schedule. When a provider is due to publish again and this site has not caught up, the page says so rather than presenting an older figure as the current one.</p>

        <h2 id="not-advice">What this is not</h2>
        <p>These are calculators, not advice. Nothing here is legal, tax, medical, or financial advice, and no result is a lender decision, a diagnosis, or a prepared return. Where a model leaves something out (depreciation, healthcare, withholding tables) the page says so next to the answer instead of in the small print. The <Link href="/terms">user agreement</Link> applies to every page.</p>

        <h2 id="paid-for">How the site is paid for</h2>
        <p>The calculators are free and do not need an account. Some layouts reserve standard advertising space (a leaderboard, a sidebar, and an in-content slot). Empty reservations stay visually quiet — no fake ad creative. No ad network loads until a public contact address, a dated privacy policy, and an advertising flag are all set in the software.</p>
        <p>Some money and credit tools can show a partner-comparison slot next to the result. Example names in configuration ({examplePartnerNames().join(', ')}) are placeholders, not live deals. A partner card only becomes a link when affiliates are enabled and a real program URL is set. Partner offers are advertising. They are never the calculator’s answer, and they are not financial advice. An FTC-style disclosure appears only when a live partner link is on the page.</p>

        <h2 id="corrections">Corrections</h2>
        <p>If a figure looks wrong, report it. Under Technical details, each result prints a Method version and a Data snapshot id so the problem can be pinned to one engine and one copy of the data. The same page takes a calculator you want added, a complaint, or a suggestion. <Link href="/contact">Contact and requests</Link>. Common questions are on the <Link href="/faq">FAQ</Link>.</p>
      </InfoPage>
    </>
  );
}
