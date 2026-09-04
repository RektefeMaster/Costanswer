import type { Metadata } from 'next';
import { editorial } from './editorial';
import { siteConfig } from './site-config';
import { categories, evaluateToolIndexability, type ToolDefinition } from './tool-registry';
import type { ToolEditorial } from './tool-content';

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
      images: [],
    },
    twitter: {
      card: 'summary',
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [],
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
      images: [],
    },
    twitter: {
      card: 'summary',
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [],
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
