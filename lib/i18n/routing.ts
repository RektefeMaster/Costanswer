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
  return (base === '/' ? '/es' : `/es${base}`) + suffix;
}

export function spanishRewritePath(path: string): string | null {
  if (!path.startsWith('/es/') || path.startsWith('/es/salario')) return null;
  const base = unlocalizedPath(path);
  return PUBLIC_ROOTS.has(base.split('/')[1]) ? base : null;
}
