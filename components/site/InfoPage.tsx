import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { PolicyNav } from './PolicyNav';

export function InfoPage({
  eyebrow,
  title,
  intro,
  effective,
  contents,
  currentPolicy,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  effective?: string;
  contents?: Array<{ id: string; label: string }>;
  currentPolicy?: '/terms' | '/privacy' | '/disclosure' | '/contact' | '/faq' | '/about';
  children: ReactNode;
}) {
  const documentLayout = contents !== undefined;

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={documentLayout ? 'info-page info-page-doc' : 'info-page'}>
        <header>
          <div>
            <p className="eyebrow"><span /> {eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <div className="info-lede-block">
            <p className="info-lede">{intro}</p>
            {effective && <p className="info-effective">Effective {effective}</p>}
          </div>
        </header>
        {documentLayout
          ? (
            <div className="info-doc-grid">
              <article className="info-article info-document">{children}</article>
              <aside className="info-doc-rail" aria-label="On this page">
                <div className="rail-card">
                  <p className="rail-kicker">On this page</p>
                  <nav className="info-doc-contents">
                    {contents.map((item, index) => (
                      <a href={`#${item.id}`} key={item.id}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        {item.label}
                      </a>
                    ))}
                  </nav>
                </div>
                <div className="rail-card">
                  <p className="rail-kicker">The site</p>
                  <PolicyNav current={currentPolicy} stacked />
                </div>
              </aside>
            </div>
          )
          : <article className="info-article">{children}</article>}
      </main>
      <SiteFooter />
    </>
  );
}
