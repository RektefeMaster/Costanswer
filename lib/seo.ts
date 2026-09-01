import type { Metadata } from 'next';
import { categories, evaluateToolIndexability, type ToolDefinition } from './tool-registry';
import { siteConfig } from './site-config';

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
  return {
    title: tool.title,
    description: tool.description,
    alternates: { canonical: tool.path },
    openGraph: {
      type: 'website',
      url: tool.path,
      title: `${tool.title} | ${siteConfig.name}`,
      description: tool.description,
      siteName: siteConfig.name,
      images: [],
    },
    twitter: {
      card: 'summary',
      title: `${tool.title} | ${siteConfig.name}`,
      description: tool.description,
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
