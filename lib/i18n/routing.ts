import type { Locale } from './locales';

const PUBLIC_ROOTS = new Set(['topics', 'search', 'money', 'home', 'car', 'everyday', 'food', 'shopping', 'health', 'math', 'education', 'cost', 'salary', 'about', 'faq', 'contact', 'methodology', 'terms', 'privacy', 'disclosure']);

export function unlocalizedPath(path: string): string {
  if (path === '/es') return '/';
  return path.startsWith('/es/') ? path.slice(3) : path;
}

export function localizedHref(href: string, locale: Locale): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const match = href.match(/^([^?#]*)(.*)$/);
  if (!match) return href;
  const [, path, suffix] = match;
  if (path === '/es/salario' || path.startsWith('/es/salario/')) return href;
  const base = unlocalizedPath(path);
  if (base !== '/' && !PUBLIC_ROOTS.has(base.split('/')[1])) return href;
  if (locale === 'en-US') return base + suffix;
  if (base === '/salary') return '/es/salario' + suffix;
  if (base === '/salary/states') return '/es/salario/estados' + suffix;
  /*
   * State hubs carry the same slug in both languages, so the Spanish address is
   * a pure rewrite and belongs here. Occupation slugs are authored per language
   * and need the OEWS index to translate, which this module cannot import: it
   * is pulled into every client bundle through `LocalizedLink`. Those keep
   * falling through to the generic `/es` prefix and are corrected by
   * `bilingualSalaryPair` where the data is already loaded.
   */
  const stateHub = base.match(/^\/salary\/states\/([^/]+)$/);
  if (stateHub) return `/es/salario/estados/${stateHub[1]}` + suffix;
  return (base === '/' ? '/es' : `/es${base}`) + suffix;
}

export function spanishRewritePath(path: string): string | null {
  if (!path.startsWith('/es/') || path.startsWith('/es/salario')) return null;
  const base = unlocalizedPath(path);
  return PUBLIC_ROOTS.has(base.split('/')[1]) ? base : null;
}
