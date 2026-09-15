import { LanguagePicker } from '@/components/site/LanguagePicker';
import { languageSwitcherHref } from '@/lib/i18n/alternates';
import { requestLocale, requestPathname } from '@/lib/i18n/request-locale';

export async function LanguageSwitcher({ inline = false, variant = 'header' }: { inline?: boolean; variant?: 'header' | 'menu' } = {}) {
  const pathname = await requestPathname();
  const locale = await requestLocale();
  return (
    <LanguagePicker
      spanish={locale === 'es-US'}
      englishHref={locale === 'en-US' ? pathname : languageSwitcherHref(pathname, 'en-US')}
      spanishHref={locale === 'es-US' ? pathname : languageSwitcherHref(pathname, 'es-US')}
      inline={inline || variant === 'menu'}
    />
  );
}
