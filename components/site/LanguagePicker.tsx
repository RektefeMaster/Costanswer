'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function LanguagePicker({
  spanish, englishHref, spanishHref, inline = false,
}: {
  spanish: boolean;
  englishHref: string;
  spanishHref: string;
  inline?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const label = spanish ? 'Idioma' : 'Language';

  useEffect(() => { if (ref.current) ref.current.open = false; }, [pathname]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  const options = (
    <nav className="language-options" aria-label={label} onClick={(event) => {
      const link = (event.target as Element).closest('a');
      if (link) {
        const url = new URL(link.href);
        url.search = window.location.search;
        url.hash = window.location.hash;
        link.href = url.toString();
      }
      if (ref.current) ref.current.open = false;
    }}>
      <a href={englishHref} hrefLang="en-US" lang="en" aria-current={!spanish ? 'true' : undefined}>
        <span className="language-code" aria-hidden="true">EN</span><span>English</span>
        {!spanish && <span className="language-check" aria-hidden="true">✓</span>}
      </a>
      <a href={spanishHref} hrefLang="es-US" lang="es" aria-current={spanish ? 'true' : undefined}>
        <span className="language-code" aria-hidden="true">ES</span><span>Español</span>
        {spanish && <span className="language-check" aria-hidden="true">✓</span>}
      </a>
    </nav>
  );

  if (inline) return <div className="language-inline"><p className="mobile-nav-label">{label}</p>{options}</div>;

  return (
    <details className="language-picker" ref={ref}>
      <summary aria-label={`${label}: ${spanish ? 'Español' : 'English'}`}>
        <svg className="language-globe" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></svg>
        <span>{spanish ? 'ES' : 'EN'}</span>
        <svg className="language-chevron" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </summary>
      <div className="language-popover">
        <p>{label}</p>
        {options}
      </div>
    </details>
  );
}
