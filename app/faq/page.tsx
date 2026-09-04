import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { InfoPage } from '@/components/site/InfoPage';
import { SITE_FAQ } from '@/lib/site-faq';
import { breadcrumbJsonLd, faqPageJsonLd, pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export const metadata = pageMetadata(
  'Frequently asked questions',
  'Answers to common CostAnswer questions: whether the calculators are free, where mortgage and electricity figures come from, whether data is stored, and how to report a wrong number.',
  '/faq',
);

const CONTENTS = SITE_FAQ.map((entry) => ({ id: entry.id, label: entry.rail }));

export default function FaqPage() {
  return (
    <>
      <JsonLd data={[
        faqPageJsonLd(SITE_FAQ),
        breadcrumbJsonLd([
          { name: siteConfig.name, path: '/' },
          { name: 'FAQ', path: '/faq' },
        ]),
      ]} />
      <InfoPage
        eyebrow="FAQ"
        title="Frequently asked questions"
        intro="How the calculators work, where the government numbers come from, and what a result is not. Short answers, then the page that goes deeper."
        contents={CONTENTS}
        currentPolicy="/faq"
      >
        {SITE_FAQ.map((entry) => (
          <section key={entry.id} aria-labelledby={entry.id}>
            <h2 id={entry.id}>{entry.question}</h2>
            {entry.answer.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {entry.related && entry.related.length > 0
              ? (
                <p className="faq-related">
                  {entry.related.map((item) => (
                    <Link href={item.href} key={item.href}>{item.label}</Link>
                  ))}
                </p>
              )
              : null}
          </section>
        ))}
      </InfoPage>
    </>
  );
}
