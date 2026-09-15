import type { Metadata } from 'next';
import { editorial } from './editorial';
import { siteConfig } from './site-config';
import { categories, evaluateToolIndexability, type ToolDefinition } from './tool-registry';
import type { ToolEditorial } from './tool-content';
import { hreflangLanguagesFor, localeFromPath } from './i18n/alternates';
import { localizedHref } from './i18n/routing';
import type { Locale } from './i18n/locales';


/**
 * The social preview card every page carries.
 *
 * `images: []` is not "inherit" — it is an explicit empty list, and it
 * overrode the root layout's card on all 913 pages below the home page. A
 * calculator shared into a forum, a group chat or a Slack channel arrived as a
 * bare blue link, which is the single cheapest piece of distribution a site
 * like this has and it was being thrown away. There is one house card rather
 * than a per-page rendering service: the page title and description are
 * already in the unfurl beside it, so a generated image would repeat them at
 * the cost of an image pipeline the Worker does not have.
 */
const SHARE_CARD_URL = '/og.png';
const SHARE_CARD_ALT = `${siteConfig.name}: practical U.S. calculators with the math shown`;

function shareCard() {
  return [{ url: SHARE_CARD_URL, width: 1200, height: 630, alt: SHARE_CARD_ALT }];
}

export function pageMetadata(
  title: string,
  description: string,
  path: `/${string}`,
  robots: Metadata['robots'] = { index: true, follow: true },
): Metadata {
  const locale = localeFromPath(path);
  const languages = hreflangLanguagesFor(path);
  return {
    title,
    description,
    alternates: { canonical: path, languages },
    openGraph: {
      type: 'website',
      url: path,
      locale: locale === 'es-US' ? 'es_US' : 'en_US',
      ...(languages['es-US'] && languages['en-US']
        ? { alternateLocale: locale === 'es-US' ? ['en_US'] : ['es_US'] }
        : {}),
      title: `${title} | ${siteConfig.name}`,
      description,
      siteName: siteConfig.name,
      images: shareCard(),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteConfig.name}`,
      description,
      images: shareCard(),
    },
    robots,
  };
}

/**
 * Builds a search-intent calibrated SERP title.
 *
 * Evergreen queries (mathematical equivalences like "$30 an Hour Is How Much a Year?")
 * must not carry a year tag, because math does not change year to year.
 * Freshness-sensitive queries (tax, take-home, state schedules) carry "(2026)".
 */
export function buildSerpTitle(
  baseTitle: string,
  intent: 'evergreen' | 'tax-freshness' | 'annual-survey' = 'evergreen',
  year = 2026,
): string {
  if (intent === 'tax-freshness' || intent === 'annual-survey') {
    return `${baseTitle} (${year})`;
  }
  return baseTitle;
}

export function toolMetadata(tool: ToolDefinition): Metadata {
  const indexable = evaluateToolIndexability(tool).indexable;
  const title = tool.metaTitle ?? tool.title;
  const description = tool.metaDescription ?? tool.description;
  return {
    title,
    description,
    alternates: { canonical: tool.path, languages: hreflangLanguagesFor(tool.path) },
    openGraph: {
      type: 'website',
      url: tool.path,
      locale: 'en_US',
      title: `${title} | ${siteConfig.name}`,
      description,
      siteName: siteConfig.name,
      images: shareCard(),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteConfig.name}`,
      description,
      images: shareCard(),
    },
    category: categories[tool.category].name,
    robots: { index: indexable, follow: true },
  };
}

export function toolJsonLd(tool: ToolDefinition, locale: Locale = 'en-US') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.title,
    description: tool.description,
    url: new URL(localizedHref(tool.path, locale), siteConfig.origin).toString(),
    inLanguage: locale,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    provider: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.origin,
    },
  };
}

export function toolArticleJsonLd(tool: ToolDefinition, content: ToolEditorial, locale: Locale = 'en-US') {
  const pageUrl = new URL(localizedHref(tool.path, locale), siteConfig.origin).toString();
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: content.guide.heading,
    description: content.guide.lede,
    url: pageUrl,
    inLanguage: locale,
    author: {
      '@type': 'Organization',
      name: `${siteConfig.name} editorial`,
      url: new URL(editorial.aboutPath, siteConfig.origin).toString(),
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.origin,
    },
    about: {
      '@type': 'WebApplication',
      name: tool.title,
      url: pageUrl,
    },
  };
}


export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.origin,
    description: editorial.identity,
    knowsAbout: 'U.S. calculators with tested formulas and dated official data',
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, siteConfig.origin).toString(),
    })),
  };
}

export function faqPageJsonLd(
  entries: Array<{ question: string; answer: string[] }>,
  path: `/${string}` = '/faq',
  inLanguage: Locale = localeFromPath(path),
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: inLanguage === 'es-US' ? 'Preguntas frecuentes' : 'Frequently asked questions',
    url: new URL(path, siteConfig.origin).toString(),
    inLanguage,
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer.join(' '),
      },
    })),
  };
}
