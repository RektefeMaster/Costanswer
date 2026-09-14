'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/lib/site-config';
import { categories, CATEGORY_IDS, HEADER_CATEGORY_IDS, type CategoryId } from '@/lib/categories';
import { CategoryChip, NavChip } from '@/components/site/CategoryArt';
import { chrome } from '@/lib/i18n/chrome';
import { localeFromPathname } from '@/lib/i18n/path-locale';

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
  const locale = localeFromPathname(pathname);
  const homeHref = locale === 'es-US' ? '/es' : '/';
  const salaryHref = locale === 'es-US' ? '/es/salario' : '/salary';
  const salaryCurrent = pathname === salaryHref || pathname.startsWith(`${salaryHref}/`) ? 'page' as const : undefined;
  const menuRef = useRef<HTMLDetailsElement>(null);
  const pathnameRef = useRef(pathname);
  const searchCurrent = pathname === '/search' ? 'page' as const : undefined;

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const close = () => { menu.open = false; };
    const syncBody = () => {
      document.body.classList.toggle('nav-open', menu.open);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (menu.open && !menu.contains(event.target as Node)) close();
    };

    syncBody();
    menu.addEventListener('toggle', syncBody);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      menu.removeEventListener('toggle', syncBody);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      document.body.classList.remove('nav-open');
    };
  }, []);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);

  return (
    <header className="site-header-bar">
      <div className="site-header">
        <Link className="brand" href={homeHref} aria-label={`${siteConfig.name} home`}>
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>Cost<span>Answer</span></span>
        </Link>
        <nav className="top-nav" aria-label="Primary navigation">
          {HEADER_CATEGORY_IDS.map((categoryId) => (
            <Link
              href={`/topics/${categoryId}`}
              key={categoryId}
              aria-current={isCategoryActive(pathname, categoryId) ? 'page' : undefined}
            >
              <CategoryChip category={categoryId} />
              {categories[categoryId].name}
            </Link>
          ))}
          <Link href={salaryHref} aria-current={salaryCurrent}>
            <NavChip />
            {chrome('salaries', locale)}
          </Link>
          <Link
            href="/cost"
            aria-current={pathname === '/cost' || pathname.startsWith('/cost/') ? 'page' as const : undefined}
          >
            <NavChip />
            {chrome('jobCosts', locale)}
          </Link>
        </nav>
        <div className="header-end">
          {languageSwitcher}
          <Link className="header-search" href="/search" aria-current={searchCurrent}>{chrome('search', locale)}</Link>
        </div>
        <details className="mobile-menu" ref={menuRef} suppressHydrationWarning>
          <summary aria-label={chrome('menu', locale)}>Menu</summary>
          <nav aria-label="Mobile navigation">
            <Link className="mobile-search-link" href={salaryHref} aria-current={salaryCurrent}>
              <NavChip />
              {chrome('salaries', locale)}
            </Link>
            <Link
              className="mobile-search-link"
              href="/cost"
              aria-current={pathname === '/cost' || pathname.startsWith('/cost/') ? 'page' as const : undefined}
            >
              <NavChip />
              {chrome('jobCosts', locale)}
            </Link>
            <Link className="mobile-search-link" href="/search" aria-current={searchCurrent}>{chrome('search', locale)}</Link>
            {mobileLanguageSwitcher}
            {CATEGORY_IDS.map((categoryId) => (
              <Link
                href={`/topics/${categoryId}`}
                key={categoryId}
                aria-current={isCategoryActive(pathname, categoryId) ? 'page' : undefined}
              >
                <CategoryChip category={categoryId} />
                {categories[categoryId].name}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
