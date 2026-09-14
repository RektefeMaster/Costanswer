import type { Metadata } from 'next';
import { DEFAULT_LOCALE, type Locale } from './locales';
import { localeFromPathname } from './path-locale';
import { bilingualSalaryPair } from '@/lib/salary-es-pages';

export type HrefLangMap = Record<string, string>;

export function localeFromPath(path: string): Locale {
  return localeFromPathname(path);
}

export function hreflangLanguagesFor(path: string): HrefLangMap {
  const pair = bilingualSalaryPair(path);
  if (path === '/es') {
    return { 'en-US': '/', 'es-US': '/es', 'x-default': '/' };
  }
  if (!pair) return { [DEFAULT_LOCALE]: path, 'x-default': path };
  return {
    'en-US': pair.en,
    'es-US': pair.es,
    'x-default': pair.en,
  };
}

export function languageSwitcherHref(pathname: string, target: Locale): string {
  const pair = bilingualSalaryPair(pathname);
  if (target === 'es-US') return pair?.es ?? '/es';
  return pair?.en ?? '/';
}

export function metadataLanguages(path: `/${string}`): NonNullable<Metadata['alternates']>['languages'] {
  return hreflangLanguagesFor(path);
}
