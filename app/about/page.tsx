import { InfoPage } from '@/components/site/InfoPage';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'About',
  'CostAnswer is a small set of free U.S. calculators for how much pay, bills, home projects, and everyday prices cost.',
  '/about',
);

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About CostAnswer"
      title="A few calculators for how much things cost in the U.S."
      intro="Pay, bills, a concrete slab, a grocery package. Free, and the steps sit under the answer."
    >
      <h2>What is on the site</h2>
      <p>You can turn an hourly wage into yearly pay, estimate a mortgage payment from this week’s national average rate, see whether a house fits take-home pay, check buying power since 1913, check an electric bill against a state average, size a concrete slab, compare EV charging with gasoline, price a road trip’s fuel, count workdays, scale a recipe, or see which package looks cheaper. There is also a state comparison that uses government averages.</p>
      <h2>A note on prices</h2>
      <p>A state average is not your bill. A grocery average is not the shelf at your store. If the number is an estimate, the page says so.</p>
      <h2>What we are adding</h2>
      <p>More pay, housing, and energy tools are coming, once the numbers are in good shape.</p>
    </InfoPage>
  );
}
