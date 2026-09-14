import Link from 'next/link';
import { chrome } from '@/lib/i18n/chrome';
import { languageSwitcherHref, localeFromPath } from '@/lib/i18n/alternates';
import { requestPathname } from '@/lib/i18n/request-locale';

export async function LanguageSwitcher() {
  const pathname = await requestPathname();
  const locale = localeFromPath(pathname);
  const enHref = languageSwitcherHref(pathname, 'en-US');
  const esHref = languageSwitcherHref(pathname, 'es-US');
  return (
    <nav className="lang-switch" aria-label={chrome('language', locale)}>
      <Link href={enHref} hrefLang="en-US" aria-current={locale === 'en-US' ? 'page' : undefined}>
        {chrome('english', locale)}
      </Link>
      <span aria-hidden="true">·</span>
      <Link href={esHref} hrefLang="es-US" aria-current={locale === 'es-US' ? 'page' : undefined}>
        {chrome('spanish', locale)}
      </Link>
    </nav>
  );
}
