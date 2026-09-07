import type { Metadata } from 'next';
import { editorial } from './editorial';
import { siteConfig } from './site-config';
import { categories, evaluateToolIndexability, type ToolDefinition } from './tool-registry';
import type { ToolEditorial } from './tool-content';

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
const SHARE_CARD_ALT = `${siteConfig.name} — practical U.S. calculators with the math shown`;

function shareCard() {
  return [{ url: SHARE_CARD_URL, width: 1200, height: 630, alt: SHARE_CARD_ALT }];
}

export function pageMetadata(
  title: string,
  description: string,
  path: `/${string}`,
  robots: Metadata['robots'] = { index: true, follow: true },
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
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

export function toolMetadata(tool: ToolDefinition): Metadata {
  const indexable = evaluateToolIndexability(tool).indexable;
  const title = tool.metaTitle ?? tool.title;
  const description = tool.metaDescription ?? tool.description;
  return {
    title,
    description,
    alternates: { canonical: tool.path },
    openGraph: {
      type: 'website',
      url: tool.path,
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

export function toolJsonLd(tool: ToolDefinition) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.title,
    description: tool.description,
    url: new URL(tool.path, siteConfig.origin).toString(),
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

export function toolArticleJsonLd(tool: ToolDefinition, content: ToolEditorial) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: content.guide.heading,
    description: content.guide.lede,
    url: new URL(tool.path, siteConfig.origin).toString(),
    inLanguage: 'en-US',
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
      url: new URL(tool.path, siteConfig.origin).toString(),
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

export function faqPageJsonLd(entries: Array<{ question: string; answer: string[] }>, path: `/${string}` = '/faq') {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: 'Frequently asked questions',
    url: new URL(path, siteConfig.origin).toString(),
    inLanguage: 'en-US',
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
