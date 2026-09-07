/**
 * The two locales CostAnswer publishes in.
 *
 * Created here ahead of the full localization phase because every commercial
 * surface — consent text, disclosure, form errors, CTA copy — has to be
 * locale-aware from its first commit. Retrofitting a locale through a consent
 * record after leads have been stored is not possible: the version a person
 * agreed to is the version they agreed to, in the language they read.
 *
 * Spanish here means US Spanish about US finance. Terms US Spanish speakers
 * actually use and search for stay in English — 401(k), W-4, IRS, FHA — and are
 * glossed on first use rather than translated into something nobody types.
 */
export const LOCALES = ['en-US', 'es-US'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en-US';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function parseLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** The `lang` attribute and the `Intl` tag are the same string; keep one source. */
export function htmlLang(locale: Locale): string {
  return locale;
}

/** A record with one entry per locale. The type makes a missing translation a build error. */
export type Localized<T> = Readonly<Record<Locale, T>>;

export function localized<T>(values: Record<Locale, T>): Localized<T> {
  for (const locale of LOCALES) {
    if (values[locale] === undefined) throw new Error(`Missing ${locale} value in a localized record.`);
  }
  return Object.freeze({ ...values });
}

export function pick<T>(values: Localized<T>, locale: Locale): T {
  return values[locale];
}
