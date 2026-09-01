import { InfoPage } from '@/components/site/InfoPage';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('Privacy', 'How HowMuchUSA handles calculator inputs and analytics.', '/privacy');

export default function PrivacyPage() {
  return (
    <InfoPage eyebrow="Privacy by default" title="Your calculator inputs stay in your browser." intro="The first release does not require an account and does not send raw calculator values to a server for storage.">
      <h2>Calculator data</h2>
      <p>Calculations run locally in the page. Raw pay amounts, dates, prices, quantities and location choices are not persisted by HowMuchUSA in this release.</p>
      <h2>Analytics boundary</h2>
      <p>The product defines events such as tool opened, calculation completed, search and related-tool click. If an analytics provider is enabled later, payloads are restricted to allowlisted product context—not raw financial inputs or free-text searches by default.</p>
      <h2>Advertising</h2>
      <p>Advertising is not active in this milestone. Reserved layout slots exist so a future provider can be added without moving the tool result or encouraging accidental clicks. Any provider-specific privacy disclosure must be added before activation.</p>
      <h2>Contact and changes</h2>
      <p>A public contact channel and effective date must be added before a custom production domain and third-party analytics or advertising launch. This page will be updated when those systems are selected.</p>
    </InfoPage>
  );
}
