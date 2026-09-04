import { InfoPage } from '@/components/site/InfoPage';
import { pageMetadata } from '@/lib/seo';
import { categories, CATEGORY_IDS } from '@/lib/categories';
import { tools } from '@/lib/tool-registry';

export const metadata = pageMetadata(
  'About',
  'CostAnswer is a set of free U.S. calculators that show the formula behind every answer and name the dated official source behind every published figure.',
  '/about',
);

/* Counted from the registry so this page cannot fall behind the catalogue again. */
const toolCount = tools.length;
const topicNames = CATEGORY_IDS.map((id) => categories[id].name);

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About CostAnswer"
      title="Calculators that show their work."
      intro="Free, no account, and every answer comes with the formula that produced it and the source of any figure you did not type in."
    >
      <h2>What is here</h2>
      <p>{toolCount} calculators across {topicNames.slice(0, -1).join(', ')}, and {topicNames[topicNames.length - 1]}. Pay and tax, a mortgage or loan payment, whether a house or a car fits your take-home pay, savings and retirement projections, energy and fuel costs, home projects, health formulas, everyday date and time math, unit conversion, and school grades.</p>

      <h2>What makes an answer trustworthy here</h2>
      <p>Three things sit under every result. The formula, written out step by step, so you can follow the arithmetic. The version of the engine that produced it, so the same inputs give the same answer tomorrow. And, for anything that uses public data, the dataset, its observation period, and the date it was published.</p>

      <h2>How the numbers are tested</h2>
      <p>Every engine has tests that check it against worked examples. Official datasets are fetched, stored, and hashed; the site refuses to build if a stored file no longer matches the hash it was reviewed under. Nothing is fetched live while you type, so a result cannot change underneath you because a provider had an outage.</p>

      <h2>Where the data comes from</h2>
      <p>Freddie Mac for mortgage rates, EIA for electricity and gasoline, BLS for consumer prices and inflation, IRS and SSA for tax and retirement limits, HUD for Fair Market Rents, Census and BEA for local income and price levels, USDA for food plans. Each one is listed with its period and publication date on the data page.</p>

      <h2>How current the data is</h2>
      <p>Each dataset has a known release schedule. When a provider is due to publish again and this site has not caught up, the page says so rather than presenting an older figure as the current one.</p>

      <h2>What this is not</h2>
      <p>These are calculators, not advice. Nothing here is legal, tax, medical, or financial advice, and no result is a lender decision, a diagnosis, or a prepared return. Where a model leaves something out — depreciation, healthcare, withholding tables — the page says so next to the answer instead of in the small print.</p>

      <h2>Corrections</h2>
      <p>If a figure looks wrong, it is worth reporting. Formula versions and dataset snapshot ids are printed under each result specifically so a problem can be pinned to an exact calculation and an exact copy of the data.</p>
    </InfoPage>
  );
}
