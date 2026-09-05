import Link from 'next/link';
import { InfoPage } from '@/components/site/InfoPage';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Methodology',
  'How the math works on CostAnswer, and where the government data comes from.',
  '/methodology',
);

export default function MethodologyPage() {
  return (
    <InfoPage
      eyebrow="How we work"
      title="How the numbers work"
      intro="The form, the formula, and the data are separate. You can see how a number was made."
    >
      <h2>Each calculator uses a tested formula</h2>
      <p>The page collects inputs and formats the output. A result names the formula version and, if we used data, the dated copy of that data. The person who maintains those engines is a builder and researcher, not a licensed advisor. That is stated on the <Link href="/about">about</Link> page instead of a fabricated credential.</p>
      <h2>Government data is stored here, not fetched as you type</h2>
      <p>We fetch an update, store it, check it, and compare it with what is already on the site. If a check fails, the last good copy stays up.</p>
      <h2>Some numbers are exact. Some are not.</h2>
      <p>A slab’s size can be exact. The number of bags you should buy is not. Cost and materials tools keep the measured number separate from waste and other planning extras.</p>
      <h2>A calculator has to do a real job</h2>
      <p>It goes live when it works and explains itself. Every tool page has a guide, FAQ, glossary, and caveats written for that calculator, not a pasted template. Long-tail examples (a state, a loan type, a year, an occupation) belong inside that guide when they are accurate. We do not generate hundreds of thin location pages from a name swap.</p>
      <h2>If something changes</h2>
      <p>If EIA, BLS, or Freddie Mac revises a figure, or we find a bug in the math, the version number changes. Older copies keep their version numbers.</p>
      <p>Common questions about what a result is, and what it is not, are on the <Link href="/faq">FAQ</Link>.</p>
      <p><Link href="/methodology/data">See the data on the site right now →</Link></p>
    </InfoPage>
  );
}
