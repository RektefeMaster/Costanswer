import type { Metadata } from 'next';
import { localizedHref, unlocalizedPath, spanishRewritePath } from './routing';
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
  if (!pair) {
    const en = unlocalizedPath(path);
    const es = localizedHref(en, 'es-US');
    if (en === '/' || spanishRewritePath(es)) return { 'en-US': en, 'es-US': es, 'x-default': en };
    return { [DEFAULT_LOCALE]: path, 'x-default': path };
  }
  return {
    'en-US': pair.en,
    'es-US': pair.es,
    'x-default': pair.en,
  };
}

export function languageSwitcherHref(pathname: string, target: Locale): string {
  const pair = bilingualSalaryPair(pathname);
  if (pair) return target === 'es-US' ? pair.es : pair.en;
  return localizedHref(unlocalizedPath(pathname), target);
}

export function metadataLanguages(path: `/${string}`): NonNullable<Metadata['alternates']>['languages'] {
  return hreflangLanguagesFor(path);
}
