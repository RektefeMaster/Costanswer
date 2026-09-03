import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function InfoPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="info-page">
        <header>
          <p className="eyebrow"><span /> {eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </header>
        <article className="info-article">{children}</article>
      </main>
      <SiteFooter />
    </>
  );
}
