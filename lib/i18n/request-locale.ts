import { headers } from 'next/headers';
import { isLocale, type Locale } from './locales';
import { localeFromPathname } from './path-locale';

export const LOCALE_HEADER = 'x-locale';
export const PATHNAME_HEADER = 'x-pathname';

export { localeFromPathname };

function header(h: Headers, name: string): string | null {
  return h.get(name) ?? h.get(`x-middleware-request-${name}`);
}

function pathnameFromHeaders(h: Headers): string {
  const explicit = header(h, PATHNAME_HEADER);
  if (explicit) return explicit;
  const nextUrl = header(h, 'next-url') ?? header(h, 'x-url') ?? header(h, 'x-invoke-path');
  if (!nextUrl) return '/';
  if (nextUrl.startsWith('/')) return nextUrl;
  try {
    return new URL(nextUrl).pathname;
  } catch {
    return '/';
  }
}

export async function requestPathname(): Promise<string> {
  return pathnameFromHeaders(await headers());
}

export async function requestLocale(): Promise<Locale> {
  const h = await headers();
  const value = header(h, LOCALE_HEADER);
  if (isLocale(value)) return value;
  return localeFromPathname(pathnameFromHeaders(h));
}
