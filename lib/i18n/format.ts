import type { Locale } from './locales';

export function formatNumberLocale(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatMoneyLocale(locale: Locale, value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  }).format(value);
}
