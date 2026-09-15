import Link from '@/components/i18n/LocalizedLink';
import { JsonLd } from '@/components/seo/JsonLd';
import { AuthorByline } from '@/components/site/AuthorByline';
import { faqPageJsonLd } from '@/lib/seo';
import type { ToolEditorial } from '@/lib/tool-content';
import type { Locale } from '@/lib/i18n/locales';
import { siteText } from '@/lib/i18n/site-copy';

export function CalculatorEditorial({
  toolPath,
  content,
  locale = 'en-US',
}: {
  toolPath: `/${string}`;
  content: ToolEditorial;
  locale?: Locale;
}) {
  const t = (text: string) => siteText(text, locale);
  return (
    <section className="editorial-section" aria-labelledby="editorial-title">
      {content.faq.length >= 2 && <JsonLd data={faqPageJsonLd(content.faq, toolPath)} />}
      <div className="editorial-heading">
        <p className="eyebrow muted"><span /> {t('Guide')}</p>
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
          <h3 id="editorial-faq-title">{t('Questions about this calculator')}</h3>
          <div className="editorial-faq-list">
            {content.faq.map((entry) => (
              <details key={entry.question} className="editorial-faq-details">
                <summary className="editorial-faq-summary">
                  <span>{entry.question}</span>
                  <span className="editorial-faq-chevron" aria-hidden="true">↓</span>
                </summary>
                <div className="editorial-faq-body">
                  {entry.answer.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
        <section className="editorial-glossary" aria-labelledby="editorial-glossary-title">
          <h3 id="editorial-glossary-title">{t('Terms used here')}</h3>
          <dl className="editorial-glossary-grid">
            {content.glossary.map((item) => (
              <div key={item.term} className="editorial-glossary-card">
                <dt className="editorial-glossary-term">{item.term}</dt>
                <dd className="editorial-glossary-def">{item.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="editorial-tips" aria-labelledby="editorial-tips-title">
        <h3 id="editorial-tips-title">
          <span className="editorial-card-badge is-tip" aria-hidden="true">💡</span>
          {t('Practical tips')}
        </h3>
        <div className="editorial-tips-grid">
          {content.tips.map((tip) => (
            <div key={tip} className="editorial-tip-card">
              <span className="editorial-tip-icon" aria-hidden="true">✓</span>
              <p>{tip}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="editorial-caveats" aria-labelledby="editorial-caveats-title">
        <h3 id="editorial-caveats-title">
          <span className="editorial-card-badge is-caveat" aria-hidden="true">⚠️</span>
          {t('Limits and caveats')}
        </h3>
        <div className="editorial-caveats-grid">
          {content.caveats.map((caveat) => (
            <div key={caveat} className="editorial-caveat-card">
              <span className="editorial-caveat-icon" aria-hidden="true">•</span>
              <p>{caveat}</p>
            </div>
          ))}
        </div>
        <p className="editorial-advice">
          {t('Results are for information. They are not legal, tax, medical, or financial advice.')}
          {' '}
          <Link href="/methodology">{t('How the math is maintained')}</Link>
          {' · '}
          <Link href="/contact">{t('Report a wrong figure')}</Link>
          .
        </p>
      </section>
    </section>
  );
}

