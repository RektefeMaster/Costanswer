/* Vinext beta currently duplicates React during next/link HMR; plain crawlable anchors avoid that runtime fault. */
/* eslint-disable @next/next/no-html-link-for-pages */
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/lib/site-config';
import { categories, HEADER_CATEGORY_IDS, type CategoryId } from '@/lib/tool-registry';
import { CategoryChip } from '@/components/site/CategoryArt';

function isCategoryActive(pathname: string, categoryId: CategoryId) {
  return pathname === `/topics/${categoryId}` || pathname.startsWith(`/${categoryId}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
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
        <a className="brand" href="/" aria-label={`${siteConfig.name} home`}>
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>Cost<span>Answer</span></span>
        </a>
        <nav className="top-nav" aria-label="Primary navigation">
          {HEADER_CATEGORY_IDS.map((categoryId) => (
            <a
              href={`/topics/${categoryId}`}
              key={categoryId}
              aria-current={isCategoryActive(pathname, categoryId) ? 'page' : undefined}
            >
              <CategoryChip category={categoryId} />
              {categories[categoryId].name}
            </a>
          ))}
        </nav>
        <a className="header-search" href="/search" aria-current={searchCurrent}>Search calculators</a>
        <details className="mobile-menu" ref={menuRef} suppressHydrationWarning>
          <summary aria-label="Open site navigation">Menu</summary>
          <nav aria-label="Mobile navigation">
            <a className="mobile-search-link" href="/search" aria-current={searchCurrent}>Search calculators</a>
            {HEADER_CATEGORY_IDS.map((categoryId) => (
              <a
                href={`/topics/${categoryId}`}
                key={categoryId}
                aria-current={isCategoryActive(pathname, categoryId) ? 'page' : undefined}
              >
                <CategoryChip category={categoryId} />
                {categories[categoryId].name}
              </a>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
