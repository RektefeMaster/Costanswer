import type { Locale } from './locales';

export function localeFromPathname(pathname: string): Locale {
  return pathname === '/es' || pathname.startsWith('/es/') ? 'es-US' : 'en-US';
}
