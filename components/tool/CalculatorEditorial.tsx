import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { AuthorByline } from '@/components/site/AuthorByline';
import { faqPageJsonLd } from '@/lib/seo';
import type { ToolEditorial } from '@/lib/tool-content';

export function CalculatorEditorial({
  toolPath,
  content,
}: {
  toolPath: `/${string}`;
  content: ToolEditorial;
}) {
  return (
    <section className="editorial-section" aria-labelledby="editorial-title">
      {content.faq.length >= 2 && <JsonLd data={faqPageJsonLd(content.faq, toolPath)} />}
      <div className="editorial-heading">
        <p className="eyebrow muted"><span /> Guide</p>
        <h2 id="editorial-title">{content.guide.heading}</h2>
        <AuthorByline compact />
      </div>
      <p className="editorial-lede">{content.guide.lede}</p>
      {content.guide.sections.map((section) => (
        <article key={section.heading} className="editorial-block">
          <h3>{section.heading}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
      ))}

      {content.longTail?.map((section) => (
        <article key={section.heading} className="editorial-block editorial-longtail">
          <h3>{section.heading}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
      ))}

      <div className="editorial-split">
        <section className="editorial-faq" aria-labelledby="editorial-faq-title">
          <h3 id="editorial-faq-title">Questions about this calculator</h3>
          {content.faq.map((entry) => (
            <details key={entry.question}>
              <summary>{entry.question}</summary>
              {entry.answer.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </details>
          ))}
        </section>
        <section className="editorial-glossary" aria-labelledby="editorial-glossary-title">
          <h3 id="editorial-glossary-title">Terms used here</h3>
          <dl>
            {content.glossary.map((item) => (
              <div key={item.term}>
                <dt>{item.term}</dt>
                <dd>{item.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="editorial-tips" aria-labelledby="editorial-tips-title">
        <h3 id="editorial-tips-title">Practical tips</h3>
        <ul>
          {content.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="editorial-caveats" aria-labelledby="editorial-caveats-title">
        <h3 id="editorial-caveats-title">Limits and caveats</h3>
        <ul>
          {content.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
        <p className="editorial-advice">
          Results are for information. They are not legal, tax, medical, or financial advice.
          {' '}
          <Link href="/methodology">How the math is maintained</Link>
          {' · '}
          <Link href="/contact">Report a wrong figure</Link>
          .
        </p>
      </section>
    </section>
  );
}
