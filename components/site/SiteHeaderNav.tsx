'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from '@/components/i18n/LocalizedLink';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/lib/site-config';
import { categories, CATEGORY_IDS, HEADER_CATEGORY_IDS, type CategoryId } from '@/lib/categories';
import { CategoryChip, NavChip } from '@/components/site/CategoryArt';
import { BrandLockup } from '@/components/site/BrandLockup';
import { chrome } from '@/lib/i18n/chrome';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { CATEGORY_ES } from '@/lib/i18n/site-copy';
import { localizedHref, unlocalizedPath } from '@/lib/i18n/routing';

function isCategoryActive(pathname: string, categoryId: CategoryId) {
  return pathname === `/topics/${categoryId}` || pathname.startsWith(`/${categoryId}/`);
}

export function SiteHeaderNav({
  languageSwitcher,
  mobileLanguageSwitcher,
}: {
  languageSwitcher: ReactNode;
  mobileLanguageSwitcher: ReactNode;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const basePathname = unlocalizedPath(pathname);
  const homeHref = locale === 'es-US' ? '/es' : '/';
  const salaryHref = locale === 'es-US' ? '/es/salario' : '/salary';
  const salaryCurrent = pathname === salaryHref || pathname.startsWith(`${salaryHref}/`) ? 'page' as const : undefined;
  const menuRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchCurrent = basePathname === '/search' ? 'page' as const : undefined;
  const spanish = locale === 'es-US';
  const closeMenu = () => menuRef.current?.close();

  useEffect(() => {
    menuRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = window.matchMedia('(min-width: 1181px)');
    const onResize = () => { if (media.matches) menuRef.current?.close(); };
    media.addEventListener('change', onResize);
    return () => {
      document.body.style.overflow = oldOverflow;
      media.removeEventListener('change', onResize);
    };
  }, [menuOpen]);

  return (
    <header className="site-header-bar">
      <div className="site-header">
        <Link className="brand" href={homeHref} aria-label={`${siteConfig.name} ${spanish ? 'Inicio' : 'home'}`}>
          <BrandLockup priority />
        </Link>
        <nav className="top-nav" aria-label={spanish ? 'Navegación principal' : 'Primary navigation'}>
          {HEADER_CATEGORY_IDS.map((categoryId) => (
            <Link
              href={`/topics/${categoryId}`}
              key={categoryId}
              aria-current={isCategoryActive(basePathname, categoryId) ? 'page' : undefined}
            >
              <CategoryChip category={categoryId} />
              {spanish ? CATEGORY_ES[categoryId].name : categories[categoryId].name}
            </Link>
          ))}
          <Link href={salaryHref} aria-current={salaryCurrent}>
            <NavChip />
            {chrome('salaries', locale)}
          </Link>
          <Link
            href="/cost"
            aria-current={basePathname === '/cost' || basePathname.startsWith('/cost/') ? 'page' as const : undefined}
          >
            <NavChip />
            {chrome('jobCosts', locale)}
          </Link>
        </nav>
        <div className="header-end">
          {languageSwitcher}
          <Link className="header-search" href="/search" aria-current={searchCurrent}>
            <span className="search-icon" aria-hidden="true" />
            <span>{spanish ? 'Buscar' : 'Search'}</span>
          </Link>
          <button
            className="mobile-menu-trigger"
            type="button"
            ref={triggerRef}
            aria-label={chrome('menu', locale)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls="site-mobile-menu"
            onClick={() => { menuRef.current?.showModal(); setMenuOpen(true); }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
          </button>
        </div>
        <dialog
          id="site-mobile-menu"
          className="mobile-nav-dialog"
          ref={menuRef}
          aria-labelledby="mobile-menu-title"
          onClose={() => { setMenuOpen(false); triggerRef.current?.focus(); }}
          onClick={(event) => { if (event.target === event.currentTarget) closeMenu(); }}
        >
          <div className="mobile-nav-sheet">
            <div className="mobile-nav-heading">
              <div>
                <BrandLockup className="mobile-nav-brand" alt={siteConfig.name} />
                <h2 id="mobile-menu-title">{spanish ? 'Explorar' : 'Explore'}</h2>
              </div>
              <button type="button" className="mobile-nav-close" onClick={closeMenu} aria-label={spanish ? 'Cerrar el menú' : 'Close navigation'} autoFocus>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div className="mobile-nav-content">
              <form className="mobile-nav-search" action={localizedHref('/search', locale)} role="search" onSubmit={closeMenu}>
                <label htmlFor="mobile-nav-query" className="sr-only">{chrome('search', locale)}</label>
                <span className="search-icon" aria-hidden="true" />
                <input id="mobile-nav-query" name="q" type="search" placeholder={chrome('search', locale)} autoCapitalize="none" autoCorrect="off" enterKeyHint="search" />
                <button type="submit" aria-label={spanish ? 'Buscar' : 'Search'}>→</button>
              </form>
              <nav aria-label={spanish ? 'Navegación móvil' : 'Mobile navigation'} onClick={(event) => { if ((event.target as Element).closest('a')) closeMenu(); }}>
                <div className="mobile-nav-featured">
                  <Link href={salaryHref} aria-current={salaryCurrent}>
                    <span className="mobile-nav-feature-icon" aria-hidden="true">$</span>
                    <strong>{chrome('salaries', locale)}</strong>
                    <small>{spanish ? 'Sueldos por profesión' : 'Pay by occupation'}</small>
                    <span className="mobile-nav-arrow" aria-hidden="true">↗</span>
                  </Link>
                  <Link href="/cost" aria-current={basePathname === '/cost' || basePathname.startsWith('/cost/') ? 'page' : undefined}>
                    <svg className="mobile-nav-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" /></svg>
                    <strong>{chrome('jobCosts', locale)}</strong>
                    <small>{spanish ? 'Planea tu proyecto' : 'Plan your next project'}</small>
                    <span className="mobile-nav-arrow" aria-hidden="true">↗</span>
                  </Link>
                </div>
                <p className="mobile-nav-label">{chrome('topics', locale)}</p>
                <div className="mobile-nav-topics">
                  {CATEGORY_IDS.map((categoryId) => (
                    <Link href={`/topics/${categoryId}`} key={categoryId} aria-current={isCategoryActive(basePathname, categoryId) ? 'page' : undefined}>
                      <CategoryChip category={categoryId} />
                      <span>{spanish ? CATEGORY_ES[categoryId].name : categories[categoryId].name}</span>
                      <span className="mobile-topic-arrow" aria-hidden="true">↗</span>
                    </Link>
                  ))}
                </div>
              </nav>
              <div className="mobile-nav-language" onClick={(event) => { if ((event.target as Element).closest('a')) closeMenu(); }}>
                {mobileLanguageSwitcher}
              </div>
              <div className="mobile-nav-meta">
                <Link href="/methodology" onClick={closeMenu}>{chrome('methodology', locale)}</Link>
                <Link href="/about" onClick={closeMenu}>{chrome('about', locale)}</Link>
              </div>
            </div>
          </div>
        </dialog>
      </div>
    </header>
  );
}
