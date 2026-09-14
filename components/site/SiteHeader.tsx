import { SiteHeaderNav } from '@/components/site/SiteHeaderNav';
import { LanguageSwitcher } from '@/components/site/LanguageSwitcher';

export async function SiteHeader() {
  return (
    <SiteHeaderNav
      languageSwitcher={<LanguageSwitcher />}
      mobileLanguageSwitcher={<LanguageSwitcher />}
    />
  );
}
